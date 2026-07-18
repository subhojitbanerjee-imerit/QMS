import type { IncomingMessage, ServerResponse } from "http";

/** Zero-dependency canary — if this 500s, the Vercel function runtime itself is broken. */
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({
    ok: true,
    runtime: "api/ping.ts",
    now: new Date().toISOString()
  }));
}
