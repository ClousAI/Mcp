# Clous MCP server

[![MIT](https://img.shields.io/badge/license-MIT-black)](./LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io) server for the
**[Clous](https://clous.ai) API** — entity-resolved SEC/EDGAR filings data for AI
agents. Point Claude Desktop, Cursor, or any MCP client at Clous and search
filings, pull financials, insider trades, 13F holdings, Form D raises, and more
through one consistent JSON envelope.

> This is a thin, open-source client. It forwards tool calls to
> `https://api.clous.ai` using **your** API key (via the `CLOUS_API_KEY`
> environment variable). No key or secret is bundled here. All data derives from
> public SEC EDGAR filings; Clous is independent of the SEC.

## Get a key

Sign up at **[clous.ai](https://clous.ai)** — 100 free credits, no card. Your key
looks like `clous_live_...`.

## Tools

| Tool | What it does |
| --- | --- |
| `search_filings` | EDGAR filing index across all form types |
| `full_text_search` | Full-text search over filing bodies (2001+) |
| `resolve_entity` | Look up companies by CIK / ticker / name |
| `get_company_financials` | XBRL financial facts for a company |
| `search_insider_transactions` | Form 3/4/5 insider trades |
| `get_insider_filing` | Full structured detail of one ownership filing |
| `search_beneficial_ownership` | 13D/13G filings |
| `search_13f_holdings` | 13F institutional holdings |
| `search_advisers` | Form ADV investment advisers |
| `search_form_d_raises` | Form D private-placement raises |
| `extract_filing_section` | A named item (Risk Factors, MD&A, …) from a 10-K/10-Q/8-K |
| `get_8k_events` | Classify an 8-K's reported items |
| `get_subsidiaries` | Exhibit 21 subsidiaries from a 10-K |
| `list_filing_documents` | A filing's document manifest |
| `cyber_incidents` | 8-K Item 1.05 cybersecurity disclosures |
| `get_account` | Plan + remaining credits |

Full API reference: **[docs.clous.ai](https://docs.clous.ai)** ·
machine-readable: [`llms.txt`](https://docs.clous.ai/llms.txt).

## Use it

### Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "clous": {
      "command": "npx",
      "args": ["-y", "@clous/mcp"],
      "env": { "CLOUS_API_KEY": "clous_live_..." }
    }
  }
}
```

### Cursor

`Settings → MCP → Add new server`, or add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "clous": {
      "command": "npx",
      "args": ["-y", "@clous/mcp"],
      "env": { "CLOUS_API_KEY": "clous_live_..." }
    }
  }
}
```

### From source

```bash
git clone https://github.com/clousai/mcp.git clous-mcp
cd clous-mcp
npm install
npm run build
CLOUS_API_KEY=clous_live_... node dist/index.js   # speaks MCP over stdio
```

Then point your client's `command` at `node` with args `["/abs/path/clous-mcp/dist/index.js"]`.

## Hosted MCP (no install)

Prefer zero setup? Clous also runs a **hosted** MCP endpoint at
`https://mcp.clous.ai` — see [docs.clous.ai](https://docs.clous.ai) for the remote
config.

## Develop

```bash
npm install
CLOUS_API_KEY=clous_live_... npm run dev   # tsx, no build step
```

PRs welcome. License: [MIT](./LICENSE).
