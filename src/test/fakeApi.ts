import { vi } from "vitest";

export interface Call {
  method: string;
  path: string;
  body: unknown;
}

type Handler = (call: Call) => { status?: number; body?: unknown } | undefined;

/** Подменяет fetch: запросы к API обрабатываются переданной функцией, все вызовы записываются. */
export function mockFetch(handler: Handler) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url).replace(/^https?:\/\/[^/]+/, "");
      const call: Call = {
        method: init?.method ?? "GET",
        path,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      };
      calls.push(call);
      const result = handler(call) ?? { status: 404, body: { detail: `no mock for ${call.method} ${path}` } };
      const status = result.status ?? 200;
      return new Response(status === 204 ? null : JSON.stringify(result.body ?? null), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}
