/**
 * Shared Clous tool definitions, registered onto an McpServer.
 *
 * Transport-agnostic: `call` is supplied by the transport layer (stdio binds it
 * to a single env key; the hosted HTTP server binds it per-request to the
 * caller's bearer token), so the same 16 tools serve both.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type CallFn = (path: string, query?: Record<string, string | number | boolean | undefined>) => Promise<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const limit = z.number().int().min(1).max(100).optional().describe("Page size, 1–100 (default 25).");
const cursor = z.string().optional().describe("Pagination cursor from a prior page's page.next_cursor.");

export function registerTools(server: McpServer, call: CallFn) {
  server.tool(
    "search_filings",
    "Search the EDGAR filing index across all form types, filterable by company CIK, form type, date range, and keyword.",
    {
      cik: z.string().optional().describe("Company CIK (zero-padded 10-digit)."),
      form_type: z.string().optional().describe('Form type, e.g. "10-K", "8-K", "4".'),
      q: z.string().optional().describe("Keyword match on company name."),
      filed_from: z.string().optional().describe("Earliest filed date, YYYY-MM-DD."),
      filed_to: z.string().optional().describe("Latest filed date, YYYY-MM-DD."),
      limit,
      cursor,
    },
    async (a) => call("/v1/filings", a),
  );

  server.tool(
    "full_text_search",
    "Full-text search across the body of every EDGAR filing since 2001.",
    {
      q: z.string().describe('Keyword or "exact phrase" to search filing text.'),
      forms: z.string().optional().describe("Comma-separated form types, e.g. 8-K,10-K."),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      ciks: z.string().optional().describe("Comma-separated CIKs."),
      limit,
      cursor,
    },
    async (a) => call("/v1/full-text", a),
  );

  server.tool(
    "resolve_entity",
    "Resolve and look up companies in the entity directory by CIK, ticker, or name.",
    { cik: z.string().optional(), ticker: z.string().optional(), q: z.string().optional(), limit, cursor },
    async (a) => call("/v1/entities", a),
  );

  server.tool(
    "get_company_financials",
    "Structured XBRL financial facts (every reported concept) for one company by CIK.",
    { cik: z.string().describe("Company CIK."), concept: z.string().optional().describe('e.g. "us-gaap:Revenues".') },
    async ({ cik, concept }) => call(`/v1/financials/${encodeURIComponent(cik)}`, { concept }),
  );

  server.tool(
    "search_insider_transactions",
    "Search Form 3/4/5 insider transactions by issuer, owner, transaction code, date, and value.",
    {
      ticker: z.string().optional(),
      issuer: z.string().optional(),
      owner: z.string().optional(),
      trans_code: z.string().optional().describe("SEC code, e.g. P, S, A, M, F."),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      min_value_usd: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/insider", a),
  );

  server.tool(
    "get_insider_filing",
    "Full structured detail of a single Form 3/4/5 ownership filing — owners, every trade, holdings, footnotes.",
    { accession: z.string().describe("Filing accession number.") },
    async ({ accession }) => call(`/v1/filings/${encodeURIComponent(accession)}/insiders`),
  );

  server.tool(
    "search_beneficial_ownership",
    "Search 13D/13G beneficial-ownership filings.",
    { issuer: z.string().optional(), person: z.string().optional(), form_type: z.string().optional(), limit, cursor },
    async (a) => call("/v1/ownership", a),
  );

  server.tool(
    "search_13f_holdings",
    "Search 13F institutional holdings (manager → security positions).",
    {
      manager: z.string().optional(),
      issuer: z.string().optional(),
      cusip: z.string().optional(),
      min_value: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/holdings", a),
  );

  server.tool(
    "search_advisers",
    "Search Form ADV registered investment advisers.",
    { q: z.string().optional(), state: z.string().optional(), aum_min: z.number().optional(), limit, cursor },
    async (a) => call("/v1/advisers", a),
  );

  server.tool(
    "search_form_d_raises",
    "Search Form D private-placement capital raises.",
    {
      state: z.string().optional(),
      industry: z.string().optional(),
      min_amount: z.number().optional(),
      q: z.string().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/raises", a),
  );

  server.tool(
    "extract_filing_section",
    "Extract a named item (e.g. Risk Factors, MD&A) from a 10-K/10-Q/8-K primary document.",
    { accession: z.string(), item: z.string().describe('e.g. "1A" (Risk Factors), "7" (MD&A), "5.02".') },
    async ({ accession, item }) => call(`/v1/filings/${encodeURIComponent(accession)}/extract`, { item }),
  );

  server.tool(
    "get_8k_events",
    "Classify the numbered items an 8-K reports (5.02 leadership, 4.01 auditor, 2.02 earnings) with excerpts.",
    { accession: z.string().describe("8-K accession number.") },
    async ({ accession }) => call(`/v1/filings/${encodeURIComponent(accession)}/events`),
  );

  server.tool(
    "get_subsidiaries",
    "Subsidiaries disclosed in a 10-K's Exhibit 21 (name + jurisdiction).",
    { accession: z.string().describe("10-K accession number.") },
    async ({ accession }) => call(`/v1/filings/${encodeURIComponent(accession)}/subsidiaries`),
  );

  server.tool(
    "list_filing_documents",
    "List a filing's document manifest — every file, its type, size, and direct URL.",
    { accession: z.string().describe("Filing accession number.") },
    async ({ accession }) => call(`/v1/filings/${encodeURIComponent(accession)}/documents`),
  );

  server.tool(
    "cyber_incidents",
    "Curated feed of SEC 8-K Item 1.05 material cybersecurity-incident disclosures.",
    { date_from: z.string().optional(), date_to: z.string().optional(), ciks: z.string().optional(), limit, cursor },
    async (a) => call("/v1/cyber-incidents", a),
  );

  server.tool("get_account", "Plan and remaining credits for the configured API key.", {}, async () =>
    call("/v1/account"),
  );
}
