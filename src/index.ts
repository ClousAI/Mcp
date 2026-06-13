#!/usr/bin/env node
/**
 * Clous MCP server — stdio transport.
 *
 * Exposes the Clous SEC/EDGAR API (https://clous.ai) as Model Context Protocol
 * tools so any MCP-capable agent (Claude Desktop, Cursor, etc.) can search and
 * pull entity-resolved filing data.
 *
 * Thin, open client: forwards tool calls to https://api.clous.ai using YOUR api
 * key from the CLOUS_API_KEY environment variable. No key or secret is bundled.
 * (For the zero-install hosted version, see https://mcp.clous.ai — src/http.ts.)
 *
 * Get a key (100 free credits): https://clous.ai · Docs: https://docs.clous.ai
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { makeCall, makeCallBody } from "./clous.js";
import { registerTools } from "./tools.js";

const API_BASE = process.env.CLOUS_API_BASE ?? "https://api.clous.ai";
const API_KEY = process.env.CLOUS_API_KEY;

if (!API_KEY) {
  console.error(
    "[clous-mcp] CLOUS_API_KEY is not set.\n" +
      "Set it to your Clous API key (clous_live_...). Get one free at https://clous.ai.",
  );
  process.exit(1);
}

const server = new McpServer({ name: "clous", version: "0.1.0" });
registerTools(server, makeCall(API_KEY, API_BASE), makeCallBody(API_KEY, API_BASE));

async function main() {
  await server.connect(new StdioServerTransport());
  console.error("[clous-mcp] ready — serving Clous tools over stdio.");
}

main().catch((e) => {
  console.error("[clous-mcp] fatal:", e);
  process.exit(1);
});
