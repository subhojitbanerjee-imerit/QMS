import type { IncomingMessage, ServerResponse } from "http";

/**
 * Fallback /api root canary.
 * Prefer /api/ping and file-based routes (/api/health, /api/sheets/...).
 */
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({
    ok: true,
    runtime: "api/index.ts",
    routes: [
      "GET /api/ping",
      "GET /api/health",
      "GET /api/sheets/task-tracker-cache",
      "POST /api/gemini/rca",
      "POST /api/gemini/coaching",
      "POST /api/gemini/drift",
      "POST /api/gemini/certify"
    ]
  }));
}
