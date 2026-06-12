#!/usr/bin/env node
/**
 * Clous MCP server.
 *
 * Exposes the Clous SEC/EDGAR API (https://clous.ai) as Model Context Protocol
 * tools so any MCP-capable agent (Claude Desktop, Cursor, etc.) can search and
 * pull entity-resolved filing data.
 *
 * This is a thin, open client: it forwards tool calls to https://api.clous.ai
 * using YOUR api key, supplied via the CLOUS_API_KEY environment variable. No
 * key or secret is bundled with this package.
 *
 * Get a key (100 free credits): https://clous.ai
 * Docs: https://docs.clous.ai
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.CLOUS_API_BASE ?? "https://api.clous.ai";
const API_KEY = process.env.CLOUS_API_KEY;

if (!API_KEY) {
  console.error(
    "[clous-mcp] CLOUS_API_KEY is not set.\n" +
      "Set it to your Clous API key (clous_live_...). Get one free at https://clous.ai.",
  );
  process.exit(1);
}

type Query = Record<string, string | number | boolean | undefined>;

/** Call a Clous GET endpoint and return its JSON body as MCP text content. */
async function callClous(path: string, query: Query = {}) {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
    });
  } catch (e) {
    return errText(`Network error calling Clous: ${(e as Error).message}`);
  }
  const body = await res.text();
  if (!res.ok) {
    return errText(`Clous API ${res.status} for ${path}:\n${body.slice(0, 2000)}`);
  }
  return { content: [{ type: "text" as const, text: body }] };
}

function errText(msg: string) {
  return { content: [{ type: "text" as const, text: msg }], isError: true };
}

const server = new McpServer({ name: "clous", version: "0.1.0" });

const limit = z.number().int().min(1).max(100).optional().describe("Page size, 1–100 (default 25).");
const cursor = z.string().optional().describe("Pagination cursor from a prior page's page.next_cursor.");

// ---- Search & discovery -------------------------------------------------- //
server.tool(
  "search_filings",
  "Search the EDGAR filing index across all form types, filterable by company CIK, form type, date range, and keyword.",
  {
    cik: z.string().optional().describe("Company CIK (zero-padded 10-digit, e.g. 0000320193)."),
    form_type: z.string().optional().describe('Form type, e.g. "10-K", "8-K", "4".'),
    q: z.string().optional().describe("Keyword match on company name."),
    filed_from: z.string().optional().describe("Earliest filed date, YYYY-MM-DD."),
    filed_to: z.string().optional().describe("Latest filed date, YYYY-MM-DD."),
    limit,
    cursor,
  },
  async (a) => callClous("/v1/filings", a),
);

server.tool(
  "full_text_search",
  "Full-text search across the body of every EDGAR filing since 2001.",
  {
    q: z.string().describe('Keyword or "exact phrase" to search filing text.'),
    forms: z.string().optional().describe("Comma-separated form types, e.g. 8-K,10-K."),
    date_from: z.string().optional().describe("Earliest filed date, YYYY-MM-DD."),
    date_to: z.string().optional().describe("Latest filed date, YYYY-MM-DD."),
    ciks: z.string().optional().describe("Comma-separated CIKs to restrict to."),
    limit,
    cursor,
  },
  async (a) => callClous("/v1/full-text", a),
);

server.tool(
  "resolve_entity",
  "Resolve and look up companies in the entity directory by CIK, ticker, or name.",
  {
    cik: z.string().optional(),
    ticker: z.string().optional().describe("Ticker symbol, e.g. AAPL."),
    q: z.string().optional().describe("Name search."),
    limit,
    cursor,
  },
  async (a) => callClous("/v1/entities", a),
);

// ---- Financials ---------------------------------------------------------- //
server.tool(
  "get_company_financials",
  "Structured XBRL financial facts (every reported concept) for one company by CIK.",
  {
    cik: z.string().describe("Company CIK."),
    concept: z.string().optional().describe('Filter to one XBRL concept, e.g. "us-gaap:Revenues".'),
  },
  async ({ cik, concept }) => callClous(`/v1/financials/${encodeURIComponent(cik)}`, { concept }),
);

// ---- Ownership & insiders ------------------------------------------------ //
server.tool(
  "search_insider_transactions",
  "Search Form 3/4/5 insider transactions by issuer, owner, transaction code, date, and value.",
  {
    ticker: z.string().optional(),
    issuer: z.string().optional().describe("Issuer (company) name substring."),
    owner: z.string().optional().describe("Insider name substring."),
    trans_code: z.string().optional().describe("SEC transaction code, e.g. P, S, A, M, F."),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    min_value_usd: z.number().optional(),
    limit,
    cursor,
  },
  async (a) => callClous("/v1/insider", a),
);

server.tool(
  "get_insider_filing",
  "Full structured detail of a single Form 3/4/5 ownership filing — reporting owners, every trade, holdings, and footnotes.",
  { accession: z.string().describe("Filing accession number, e.g. 0001140361-26-020871.") },
  async ({ accession }) => callClous(`/v1/filings/${encodeURIComponent(accession)}/insiders`),
);

server.tool(
  "search_beneficial_ownership",
  "Search 13D/13G beneficial-ownership filings.",
  {
    issuer: z.string().optional(),
    person: z.string().optional().describe("Filer / reporting person name."),
    form_type: z.string().optional().describe("13D or 13G."),
    limit,
    cursor,
  },
  async (a) => callClous("/v1/ownership", a),
);

// ---- 13F, funds, advisers ------------------------------------------------ //
server.tool(
  "search_13f_holdings",
  "Search 13F institutional holdings (manager → security positions).",
  {
    manager: z.string().optional().describe("Filing manager name."),
    issuer: z.string().optional().describe("Held security / issuer name."),
    cusip: z.string().optional(),
    min_value: z.number().optional(),
    limit,
    cursor,
  },
  async (a) => callClous("/v1/holdings", a),
);

server.tool(
  "search_advisers",
  "Search Form ADV registered investment advisers.",
  {
    q: z.string().optional().describe("Adviser name search."),
    state: z.string().optional(),
    aum_min: z.number().optional().describe("Minimum regulatory AUM (USD)."),
    limit,
    cursor,
  },
  async (a) => callClous("/v1/advisers", a),
);

server.tool(
  "search_form_d_raises",
  "Search Form D private-placement capital raises.",
  {
    state: z.string().optional(),
    industry: z.string().optional(),
    min_amount: z.number().optional().describe("Minimum total offering amount (USD)."),
    q: z.string().optional().describe("Issuer name search."),
    limit,
    cursor,
  },
  async (a) => callClous("/v1/raises", a),
);

// ---- On-demand filing extraction ----------------------------------------- //
server.tool(
  "extract_filing_section",
  "Extract a named item (e.g. Risk Factors, MD&A) from a 10-K/10-Q/8-K primary document.",
  {
    accession: z.string().describe("Filing accession number."),
    item: z.string().describe('Item to extract, e.g. "1A" (Risk Factors), "7" (MD&A), "5.02".'),
  },
  async ({ accession, item }) => callClous(`/v1/filings/${encodeURIComponent(accession)}/extract`, { item }),
);

server.tool(
  "get_8k_events",
  "Classify the numbered items an 8-K reports (e.g. 5.02 leadership, 4.01 auditor, 2.02 earnings) with excerpts.",
  { accession: z.string().describe("8-K accession number.") },
  async ({ accession }) => callClous(`/v1/filings/${encodeURIComponent(accession)}/events`),
);

server.tool(
  "get_subsidiaries",
  "Subsidiaries disclosed in a 10-K's Exhibit 21 (name + jurisdiction).",
  { accession: z.string().describe("10-K accession number.") },
  async ({ accession }) => callClous(`/v1/filings/${encodeURIComponent(accession)}/subsidiaries`),
);

server.tool(
  "list_filing_documents",
  "List a filing's document manifest — every file, its type, size, and direct URL.",
  { accession: z.string().describe("Filing accession number.") },
  async ({ accession }) => callClous(`/v1/filings/${encodeURIComponent(accession)}/documents`),
);

server.tool(
  "cyber_incidents",
  "Curated feed of SEC 8-K Item 1.05 material cybersecurity-incident disclosures.",
  {
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    ciks: z.string().optional(),
    limit,
    cursor,
  },
  async (a) => callClous("/v1/cyber-incidents", a),
);

// ---- Account ------------------------------------------------------------- //
server.tool(
  "get_account",
  "Plan and remaining credits for the configured API key.",
  {},
  async () => callClous("/v1/account"),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[clous-mcp] ready — serving Clous tools over stdio.");
}

main().catch((e) => {
  console.error("[clous-mcp] fatal:", e);
  process.exit(1);
});
