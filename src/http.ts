#!/usr/bin/env node
/**
 * Clous hosted MCP — Streamable HTTP transport (https://mcp.clous.ai).
 *
 * Multi-tenant: every request supplies its own Clous API key via the
 * Authorization header (`Bearer clous_live_…`) or an `?apiKey=` query param. The
 * server proxies tool calls to https://api.clous.ai with that key, so auth +
 * credit metering happen on the API exactly as for a direct call. Stateless: a
 * fresh server/transport is created per request (no server-side sessions).
 */
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { makeCall, makeCallBody } from "./clous.js";
import { registerTools } from "./tools.js";

const API_BASE = process.env.CLOUS_API_BASE ?? "https://api.clous.ai";
const PORT = Number(process.env.PORT ?? 8790);

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "clous-mcp", transport: "streamable-http" });
});

function keyFrom(req: express.Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const q = req.query.apiKey;
  return typeof q === "string" ? q : undefined;
}

async function handleMcp(req: express.Request, res: express.Response) {
  const key = keyFrom(req);
  if (!key) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Missing API key. Send 'Authorization: Bearer clous_live_…' or ?apiKey=. Get one free at https://clous.ai." },
      id: null,
    });
    return;
  }
  const server = new McpServer({ name: "clous", version: "0.1.0" });
  registerTools(server, makeCall(key, API_BASE), makeCallBody(key, API_BASE));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: `Internal error: ${(e as Error).message}` }, id: null });
    }
  }
}

// Serve the MCP endpoint at both the bare root (the advertised mcp.clous.ai) and /mcp.
app.post("/", handleMcp);
app.post("/mcp", handleMcp);

// Friendly GET for humans hitting the URL in a browser.
const info = (_req: express.Request, res: express.Response) =>
  res.json({
    service: "Clous hosted MCP",
    transport: "streamable-http",
    usage: "POST MCP JSON-RPC here with 'Authorization: Bearer clous_live_…' (or ?apiKey=).",
    docs: "https://docs.clous.ai",
    get_key: "https://clous.ai",
  });
app.get("/", info);
app.get("/mcp", info);

app.listen(PORT, () => {
  console.error(`[clous-mcp-http] Streamable HTTP MCP listening on :${PORT}`);
});
