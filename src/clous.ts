import type { CallFn, BodyCallFn } from "./tools.js";

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

async function request(
  base: string,
  apiKey: string,
  method: string,
  path: string,
  query: Record<string, string | number | boolean | undefined>,
  body?: unknown,
): Promise<ToolResult> {
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    return { content: [{ type: "text", text: `Network error calling Clous: ${(e as Error).message}` }], isError: true };
  }
  const text = await res.text();
  if (!res.ok) {
    return { content: [{ type: "text", text: `Clous API ${res.status} for ${path}:\n${text.slice(0, 2000)}` }], isError: true };
  }
  return { content: [{ type: "text", text }] };
}

/** Build a `call` bound to one API key — proxies GET requests to the Clous API. */
export function makeCall(apiKey: string, base: string): CallFn {
  return (path, query = {}) => request(base, apiKey, "GET", path, query);
}

/** Build a `callBody` bound to one API key — issues POST/PATCH/DELETE with an optional JSON body. */
export function makeCallBody(apiKey: string, base: string): BodyCallFn {
  return (method, path, body) => request(base, apiKey, method, path, {}, body);
}
