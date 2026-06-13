/**
 * Shared Clous tool definitions, registered onto an McpServer.
 *
 * Transport-agnostic: `call` (GET) and `callBody` (POST/PATCH/DELETE) are
 * supplied by the transport layer (stdio binds them to a single env key; the
 * hosted HTTP server binds them per-request to the caller's bearer token), so
 * the same toolset serves both.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type CallFn = (path: string, query?: Record<string, string | number | boolean | undefined>) => Promise<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

export type BodyCallFn = (method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) => Promise<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const limit = z.number().int().min(1).max(100).optional().describe("Page size, 1–100 (default 25).");
const cursor = z.string().optional().describe("Pagination cursor from a prior page's page.next_cursor.");

export function registerTools(server: McpServer, call: CallFn, callBody: BodyCallFn) {
  // ───────────────────────────────────────────────────────── Filings & search
  server.tool(
    "search_filings",
    "Search the EDGAR filing index across all form types, filterable by company CIK, form type, date range, and keyword.",
    {
      cik: z.string().optional().describe("Company CIK (zero-padded 10-digit)."),
      form_type: z.string().optional().describe('Form type, e.g. "10-K", "8-K", "4".'),
      q: z.string().optional().describe("Keyword match on company name."),
      filed_from: z.string().optional().describe("Earliest filed date, YYYY-MM-DD."),
      filed_to: z.string().optional().describe("Latest filed date, YYYY-MM-DD."),
      sic: z.string().optional().describe("SIC industry code."),
      state_of_incorp: z.string().optional().describe("State of incorporation."),
      is_xbrl: z.boolean().optional().describe("Restrict to XBRL filings."),
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
    {
      cik: z.string().optional(),
      ticker: z.string().optional(),
      q: z.string().optional(),
      sic: z.string().optional().describe("SIC industry code."),
      entity_type: z.string().optional(),
      state_of_incorp: z.string().optional(),
      limit,
      cursor,
    },
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
      issuer_cik: z.string().optional(),
      owner_cik: z.string().optional(),
      trans_code: z.string().optional().describe("SEC code, e.g. P, S, A, M, F."),
      acquired_disposed: z.string().optional().describe('"A" (acquired) or "D" (disposed).'),
      derivative: z.boolean().optional().describe("Restrict to derivative (true) or non-derivative (false) trades."),
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
    {
      issuer: z.string().optional(),
      person: z.string().optional(),
      cik_filer: z.string().optional(),
      cik_subject: z.string().optional(),
      role: z.string().optional(),
      form_type: z.string().optional(),
      form_class: z.string().optional().describe('Substring on form type, e.g. "13D" or "13G".'),
      filed_from: z.string().optional(),
      filed_to: z.string().optional(),
      limit,
      cursor,
    },
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
    "search_13f_managers",
    "Search 13F institutional investment managers by name, with minimum reported AUM.",
    {
      q: z.string().optional().describe("Substring over manager name."),
      aum_min: z.number().optional().describe("Minimum reported portfolio value (USD)."),
      limit,
      cursor,
    },
    async (a) => call("/v1/managers", a),
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
    "get_crowdfunding_offering",
    "Structured Reg CF Form C crowdfunding offering — issuer, offering terms, and financial disclosures.",
    { accession: z.string().describe("Form C accession number.") },
    async ({ accession }) => call(`/v1/filings/${encodeURIComponent(accession)}/crowdfunding`),
  );

  server.tool(
    "get_proxy_votes",
    "Structured N-PX fund proxy-voting records for a filing — per meeting: issuer/CUSIP, matter, shares voted, vote, recommendation.",
    { accession: z.string().describe("N-PX accession number."), limit, cursor },
    async ({ accession, limit, cursor }) =>
      call(`/v1/filings/${encodeURIComponent(accession)}/proxy-votes`, { limit, cursor }),
  );

  server.tool(
    "cyber_incidents",
    "Curated feed of SEC 8-K Item 1.05 material cybersecurity-incident disclosures.",
    { date_from: z.string().optional(), date_to: z.string().optional(), ciks: z.string().optional(), limit, cursor },
    async (a) => call("/v1/cyber-incidents", a),
  );

  // ───────────────────────────────────────────────────── Funds (N-PORT/N-CEN)
  server.tool(
    "search_fund_holdings",
    "Search N-PORT registered-fund portfolio holdings (mutual funds / ETFs → security positions).",
    {
      registrant_cik: z.string().optional(),
      series_id: z.string().optional(),
      accession_number: z.string().optional(),
      cusip: z.string().optional(),
      isin: z.string().optional(),
      security: z.string().optional().describe("Substring over security name."),
      fund_name: z.string().optional().describe("Substring over fund name."),
      asset_category: z.string().optional(),
      inv_country: z.string().optional(),
      report_date: z.string().optional(),
      report_date_from: z.string().optional(),
      report_date_to: z.string().optional(),
      filed_date_from: z.string().optional(),
      filed_date_to: z.string().optional(),
      min_value_usd: z.number().optional(),
      restricted_only: z.boolean().optional().describe("Restrict to restricted securities."),
      limit,
      cursor,
    },
    async (a) => call("/v1/funds/holdings", a),
  );

  server.tool(
    "search_fund_providers",
    "Search N-CEN registered-fund service providers (custodians, advisers, administrators, etc.).",
    {
      filer_cik: z.string().optional(),
      role: z.string().optional().describe("Service-provider role."),
      provider_cik: z.string().optional(),
      provider: z.string().optional().describe("Substring over provider name."),
      is_affiliated: z.boolean().optional(),
      accession_number: z.string().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/funds/providers", a),
  );

  // ───────────────────────────────────────────────────── Financials (config)
  server.tool(
    "search_financials",
    "Search XBRL company-facts financial concepts across companies (one row per reported fact).",
    {
      cik: z.string().optional(),
      ticker: z.string().optional(),
      concept: z.string().optional().describe('Exact XBRL concept, e.g. "Revenues".'),
      concept_q: z.string().optional().describe("Substring over concept name."),
      q: z.string().optional().describe("Substring over entity name."),
      form: z.string().optional(),
      fiscal_year: z.number().optional(),
      unit: z.string().optional(),
      filed_from: z.string().optional(),
      filed_to: z.string().optional(),
      period_end_from: z.string().optional(),
      period_end_to: z.string().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/financials", a),
  );

  server.tool(
    "search_financial_statements",
    "Search structured XBRL financial-statement facts (Financial Statement Data Sets) by company, tag, and period.",
    {
      cik: z.number().optional().describe("Company CIK (numeric)."),
      tag: z.string().optional().describe('XBRL tag, e.g. "Assets".'),
      adsh: z.string().optional().describe("Accession (dashed)."),
      fiscal_period: z.string().optional().describe('e.g. "FY", "Q1".'),
      sic: z.string().optional(),
      uom: z.string().optional().describe("Unit of measure."),
      ddate_from: z.string().optional().describe("Earliest period end, YYYY-MM-DD."),
      ddate_to: z.string().optional().describe("Latest period end, YYYY-MM-DD."),
      min_value: z.number().optional(),
      max_value: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/financial-statements", a),
  );

  // ───────────────────────────────────────────── Governance & people (proxy)
  server.tool(
    "search_proxy_officers",
    "Search executive officers and directors disclosed in proxy statements (DEF 14A).",
    {
      cik: z.string().optional(),
      accession_number: z.string().optional(),
      issuer: z.string().optional().describe("Substring over issuer name."),
      name: z.string().optional().describe("Substring over person full name."),
      title: z.string().optional().describe("Substring over title."),
      is_independent: z.boolean().optional(),
      min_age: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/proxy/officers", a),
  );

  server.tool(
    "search_board_members",
    "Search extracted board members / directors across organizations.",
    {
      source_type: z.string().optional(),
      sec_cik: z.string().optional(),
      ein: z.string().optional(),
      organization_name: z.string().optional().describe("ILIKE pattern over organization name."),
      person_name: z.string().optional().describe("ILIKE pattern over person name."),
      role: z.string().optional().describe("ILIKE pattern over role."),
      min_confidence: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/board", a),
  );

  server.tool(
    "search_compensation",
    "Search executive-compensation records extracted from proxy statements (salary, bonus, awards, total).",
    {
      issuer_name: z.string().optional().describe("ILIKE pattern over issuer name."),
      filer_cik: z.string().optional(),
      executive_name: z.string().optional().describe("ILIKE pattern over executive name."),
      fiscal_year: z.number().optional(),
      min_fiscal_year: z.number().optional(),
      max_fiscal_year: z.number().optional(),
      min_total_usd: z.number().optional(),
      accession_number: z.string().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/compensation", a),
  );

  // ──────────────────────────────────────────────────── Insider / Form 144
  server.tool(
    "search_form144",
    "Search Form 144 proposed-sale notices (insiders' intent to sell restricted/control stock).",
    {
      issuer_cik: z.string().optional(),
      broker_normalized_name: z.string().optional(),
      class_of_securities: z.string().optional(),
      sale_date_from: z.string().optional(),
      sale_date_to: z.string().optional(),
      min_market_value_usd: z.number().optional(),
      min_shares: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/insider/form144", a),
  );

  // ──────────────────────────────────────────── Private funds & adviser data
  server.tool(
    "search_private_funds",
    "Search private-fund ownership/control relationships disclosed on Form ADV.",
    {
      crd: z.string().optional(),
      sec_number: z.string().optional(),
      firm_name: z.string().optional().describe("ILIKE pattern over firm name."),
      full_name: z.string().optional().describe("ILIKE pattern over owner/full name."),
      control_person: z.boolean().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/private-funds", a),
  );

  server.tool(
    "search_private_fund_stats",
    "Search aggregate private-fund statistics from Form PF (per quarter, tab, and metric).",
    {
      quarter_end_date: z.string().optional(),
      tab_name: z.string().optional(),
      row_key: z.string().optional(),
      metric_key: z.string().optional(),
      min_value: z.number().optional(),
      max_value: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/private-fund-stats", a),
  );

  server.tool(
    "search_broker_dealers",
    "Search registered broker-dealers (Form BD) by CRD, name, status, and office location.",
    {
      bd_crd: z.string().optional(),
      sec_number: z.string().optional(),
      status: z.string().optional(),
      name: z.string().optional().describe("Substring over broker-dealer name."),
      main_office_state: z.string().optional(),
      main_office_country: z.string().optional(),
      main_office_city: z.string().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/broker-dealers", a),
  );

  server.tool(
    "search_form_crs",
    "Search Form CRS customer relationship summaries (firm services, fees, conflicts, disciplinary history).",
    {
      firm_crd: z.string().optional(),
      filer_cik: z.string().optional(),
      filer_name: z.string().optional().describe("ILIKE pattern over filer name."),
      form_sub_type: z.string().optional(),
      disciplinary_history_flag: z.number().optional().describe("1 = has disciplinary history."),
      filed_after: z.string().optional(),
      filed_before: z.string().optional(),
      min_professionals: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/form-crs", a),
  );

  server.tool(
    "search_iapd_individuals",
    "Search IAPD/BrokerCheck individual investment-adviser representatives and brokers.",
    {
      name: z.string().optional().describe("ILIKE pattern over full name."),
      last_name: z.string().optional(),
      first_name: z.string().optional(),
      ind_source_id: z.string().optional(),
      ia_scope: z.string().optional(),
      bc_scope: z.string().optional(),
      has_disclosure: z.number().optional().describe("1 = has a disclosure event."),
      firm_count_min: z.number().optional(),
      firm_count_max: z.number().optional(),
      cal_date_from: z.string().optional(),
      cal_date_to: z.string().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/iapd-individuals", a),
  );

  // ───────────────────────────────────── Enforcement / litigation / status
  server.tool(
    "search_enforcement",
    "Search SEC/agency enforcement actions by respondent, agency, action kind, date, and penalty.",
    {
      agency: z.string().optional(),
      respondent: z.string().optional().describe("ILIKE pattern over respondent name."),
      action_kind: z.string().optional(),
      case_number: z.string().optional().describe("ILIKE pattern over case number."),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      penalty_min: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/enforcement", a),
  );

  server.tool(
    "search_litigation",
    "Search SEC litigation releases by defendant, title, action type, and date.",
    {
      defendant: z.string().optional().describe("ILIKE pattern over defendants."),
      title: z.string().optional().describe("ILIKE pattern over title."),
      action_type: z.string().optional(),
      release_number: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/litigation", a),
  );

  server.tool(
    "search_nt_late_filings",
    "Search NT (Notification of Late Filing) records — companies that filed Form 12b-25 for a late 10-K/10-Q.",
    {
      filer_cik: z.string().optional(),
      filer_name: z.string().optional().describe("ILIKE pattern over filer name."),
      late_for_form: z.string().optional().describe('Form the filing is late for, e.g. "10-K".'),
      form_type: z.string().optional(),
      filing_date_from: z.string().optional(),
      filing_date_to: z.string().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/nt-late", a),
  );

  server.tool(
    "search_trading_suspensions",
    "Search SEC trading-suspension orders by company name, release number, and date.",
    {
      company: z.string().optional().describe("ILIKE pattern over company name."),
      release_number: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/trading-suspensions", a),
  );

  server.tool(
    "search_whistleblower_awards",
    "Search SEC whistleblower award orders by fiscal year, amount, and summary.",
    {
      fiscal_year: z.number().optional(),
      min_award_amount_usd: z.number().optional(),
      max_award_amount_usd: z.number().optional(),
      award_order_no: z.string().optional().describe("ILIKE pattern over award order number."),
      public_summary: z.string().optional().describe("ILIKE pattern over public summary."),
      limit,
      cursor,
    },
    async (a) => call("/v1/whistleblower", a),
  );

  // ───────────────────────────────────────────────────────────── Patents
  server.tool(
    "search_patent_grants",
    "Search USPTO patent grants by assignee, title, classification, and grant date.",
    {
      patent_number: z.string().optional(),
      title: z.string().optional().describe("ILIKE pattern over patent title."),
      assignee: z.string().optional().describe("ILIKE pattern over assignee name."),
      assignee_state: z.string().optional(),
      assignee_country: z.string().optional(),
      kind_code: z.string().optional(),
      application_number: z.string().optional(),
      grant_year: z.number().optional(),
      grant_date_from: z.string().optional(),
      grant_date_to: z.string().optional(),
      claims_count_min: z.number().optional(),
      limit,
      cursor,
    },
    async (a) => call("/v1/uspto-patent-grants", a),
  );

  // ───────────────────────────────────────────────────────── Meta / account
  server.tool(
    "list_sources",
    "Dataset catalog + freshness — every live Clous dataset, its endpoint, record count, and last sync (public).",
    {},
    async () => call("/v1/sources"),
  );

  server.tool("get_account", "Plan and remaining credits for the configured API key.", {}, async () =>
    call("/v1/account"),
  );

  // ─────────────────────────────────────────────── Monitoring: events feed
  server.tool(
    "list_events",
    "Query the events feed — typed, evidence-backed SEC business-change events (executive changes, new filings, insider sells, …).",
    {
      event_type: z.string().optional().describe("Exact event type, e.g. sec.8k.executive_change."),
      cik: z.string().optional().describe("Issuer CIK (zero-padded 10-digit)."),
      ticker: z.string().optional().describe("Issuer ticker."),
      importance: z.enum(["high", "medium", "low"]).optional(),
      date_from: z.string().optional().describe("Earliest detected date, YYYY-MM-DD."),
      limit,
      cursor,
    },
    async (a) => call("/v1/events", a),
  );

  server.tool(
    "get_event",
    "Get a single event by id with full evidence.",
    { event_id: z.string().describe("Event id.") },
    async ({ event_id }) => call(`/v1/events/${encodeURIComponent(event_id)}`),
  );

  // ─────────────────────────────────────────────── Monitoring: monitors CRUD
  server.tool(
    "list_monitors",
    "List the monitors (standing watches) on your account.",
    {},
    async () => call("/v1/monitors"),
  );

  server.tool(
    "create_monitor",
    "Create a monitor: a standing watch on a ticker/CIK/company/form/event type that fires (and optionally webhooks) on matching events.",
    {
      name: z.string().describe("Human label for the monitor."),
      target_type: z.enum(["ticker", "cik", "company", "form", "event_type", "watchlist"]).describe("What to watch."),
      target_value: z.string().describe('The value, e.g. "NVDA", "0001045810", or "8-K".'),
      signals: z.array(z.string()).optional().describe("Event types to match; empty/omitted = every event for the target."),
      materiality: z.enum(["high", "medium", "low"]).optional().describe("Minimum importance to fire on (default low)."),
      webhook_endpoint_id: z.string().optional().describe("Endpoint to deliver matches to (from list_webhook_endpoints)."),
    },
    async (a) => callBody("POST", "/v1/monitors", a),
  );

  server.tool(
    "get_monitor",
    "Get a single monitor by id.",
    { monitor_id: z.string() },
    async ({ monitor_id }) => call(`/v1/monitors/${encodeURIComponent(monitor_id)}`),
  );

  server.tool(
    "update_monitor",
    "Update a monitor — pause/resume (status), rename, or change signals/materiality/webhook.",
    {
      monitor_id: z.string(),
      name: z.string().optional(),
      status: z.enum(["active", "paused"]).optional(),
      signals: z.array(z.string()).optional(),
      materiality: z.enum(["high", "medium", "low"]).optional(),
      webhook_endpoint_id: z.string().optional(),
    },
    async ({ monitor_id, ...patch }) =>
      callBody("PATCH", `/v1/monitors/${encodeURIComponent(monitor_id)}`, patch),
  );

  server.tool(
    "delete_monitor",
    "Delete a monitor by id.",
    { monitor_id: z.string() },
    async ({ monitor_id }) => callBody("DELETE", `/v1/monitors/${encodeURIComponent(monitor_id)}`),
  );

  // ─────────────────────────────────────────────── Monitoring: webhooks
  server.tool(
    "list_webhook_endpoints",
    "List your registered webhook endpoints.",
    {},
    async () => call("/v1/webhooks/endpoints"),
  );

  server.tool(
    "create_webhook_endpoint",
    "Register an https webhook endpoint to deliver monitor matches to.",
    {
      url: z.string().describe("Endpoint URL (must be https://)."),
      description: z.string().optional(),
    },
    async (a) => callBody("POST", "/v1/webhooks/endpoints", a),
  );

  server.tool(
    "list_webhook_deliveries",
    "List the webhook delivery log for your endpoints.",
    {
      endpoint_id: z.string().optional().describe("Restrict to one endpoint id."),
      limit: z.number().int().min(1).max(200).optional().describe("Page size, 1–200 (default 50)."),
    },
    async (a) => call("/v1/webhooks/deliveries", a),
  );
}
