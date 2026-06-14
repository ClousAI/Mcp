<div align="center">

# Clous MCP

**Public data intelligence for AI agents — over the Model Context Protocol.**

Point Claude, Cursor, or any MCP client at Clous and search SEC/EDGAR filings, pull XBRL financials, insider trades, 13F holdings, Form D raises, and material events — all through one consistent, cited JSON envelope.

[![npm](https://img.shields.io/npm/v/@clousai/mcp?color=cb3837&label=%40clousai%2Fmcp)](https://www.npmjs.com/package/@clousai/mcp)
[![Docs](https://img.shields.io/badge/docs-clous.ai-blue)](https://docs.clous.ai)
[![Built for AI agents](https://img.shields.io/badge/built%20for-AI%20agents-6e56cf)](https://clous.ai)
[![License: MIT](https://img.shields.io/badge/license-MIT-black)](./LICENSE)

[clous.ai](https://clous.ai) · [docs.clous.ai](https://docs.clous.ai) · [hosted MCP](https://mcp.clous.ai) · [49 tools](#tools)

</div>

---

> A thin, open-source MCP client. It forwards tool calls to `https://api.clous.ai` using **your** API key (the `CLOUS_API_KEY` env var). No key or secret is bundled. All data derives from public SEC EDGAR filings; Clous is independent of the SEC. **SEC/EDGAR is live today; Clous is expanding across public data.**

## 30-second quickstart

Get a free key at **[clous.ai](https://clous.ai)** (100 credits, no card — looks like `clous_live_...`), then add Clous to your MCP client:

**Claude Desktop** — `claude_desktop_config.json` (Settings → Developer → Edit Config) · **Cursor** — `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "clous": {
      "command": "npx",
      "args": ["-y", "@clousai/mcp"],
      "env": { "CLOUS_API_KEY": "clous_live_..." }
    }
  }
}
```

Restart the client and ask: *"What material 8-Ks did NVIDIA file this week?"* — Clous answers with each accession and EDGAR URL cited.

### Or use the hosted server (zero install)

Clous runs a hosted MCP endpoint at **`https://mcp.clous.ai`** — no local Node, no `npx`. See [docs.clous.ai](https://docs.clous.ai) for the remote config.

## Key features

- **49 tools** spanning filings, full-text, financials, ownership, governance, enforcement, events, and monitors.
- **Entity-resolved** — every record ties to a canonical company (CIK / ticker / name).
- **One JSON envelope** — `{ data[], page, as_of, source, query_echo, warnings }` with cursor pagination.
- **Token-efficient** — `fields=` / `output_schema=` projection trims payloads before they hit your context window.
- **Cited by construction** — every result carries its source filing and EDGAR URL.
- **Bring your own key** — open-source, no secrets bundled; works locally via `npx` or hosted.

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

…and 33 more (13F managers, N-PORT fund holdings, enforcement, litigation, patents, monitors/webhooks, grounded Q&A). Full reference: **[docs.clous.ai](https://docs.clous.ai)** · machine-readable [`llms.txt`](https://docs.clous.ai/llms.txt).

## From source

```bash
git clone https://github.com/ClousAI/Mcp.git clous-mcp
cd clous-mcp
npm install
npm run build
CLOUS_API_KEY=clous_live_... node dist/index.js   # speaks MCP over stdio
```

Then point your client's `command` at `node` with args `["/abs/path/clous-mcp/dist/index.js"]`. For development, `CLOUS_API_KEY=clous_live_... npm run dev` runs via `tsx` with no build step.

## Part of the Clous platform

Clous is **public data intelligence for AI agents** — entity-resolved signals from public records and the web, monitored in real time, delivered with citations. SEC/EDGAR is live today; expanding across public data.

| | |
| --- | --- |
| **Website** | [clous.ai](https://clous.ai) |
| **Docs** | [docs.clous.ai](https://docs.clous.ai) · [`llms.txt`](https://docs.clous.ai/llms.txt) |
| **MCP server** | [`Mcp`](https://github.com/ClousAI/Mcp) ← you are here · hosted at [mcp.clous.ai](https://mcp.clous.ai) |
| **Claude Code plugin** | [`claude-code-plugin`](https://github.com/ClousAI/claude-code-plugin) |
| **Agent Skill** | [`skill`](https://github.com/ClousAI/skill) |
| **SDKs** | [`clous-python`](https://github.com/ClousAI/clous-python) · [`clous-js`](https://github.com/ClousAI/clous-js) |
| **Recipes** | [`cookbook`](https://github.com/ClousAI/cookbook) |
| **Framework tools** | [`integrations`](https://github.com/ClousAI/integrations) (LangChain · LlamaIndex · OpenAI · Vercel AI · CrewAI) |

PRs welcome. License: [MIT](./LICENSE).
