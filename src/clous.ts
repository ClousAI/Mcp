import type { CallFn } from "./tools.js";

/** Build a `call` bound to one API key — proxies GET requests to the Clous API. */
export function makeCall(apiKey: string, base: string): CallFn {
  return async (path, query = {}) => {
    const url = new URL(base + path);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
    } catch (e) {
      return { content: [{ type: "text", text: `Network error calling Clous: ${(e as Error).message}` }], isError: true };
    }
    const body = await res.text();
    if (!res.ok) {
      return { content: [{ type: "text", text: `Clous API ${res.status} for ${path}:\n${body.slice(0, 2000)}` }], isError: true };
    }
    return { content: [{ type: "text", text: body }] };
  };
}
