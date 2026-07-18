import type { IncomingMessage, ServerResponse } from "http";
import {
  writeDashboardAccessLog,
  toErrorMessage,
  ACCESS_LOG_TABLE_ID
} from "./_lib/accessLog.js";
import { getBigQueryConfig } from "./_lib/bigquery.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 15
};

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Request body must be JSON."));
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

/**
 * POST /api/access-log
 * Body: { email, displayName?, action?, page?, sessionId? }
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if ((req.method || "GET").toUpperCase() === "GET") {
      const cfg = getBigQueryConfig();
      return send(res, 200, {
        ok: true,
        message: "POST access events here. Logs go to BigQuery.",
        table: `${cfg.projectId || "PROJECT"}.${cfg.datasetId}.${ACCESS_LOG_TABLE_ID}`
      });
    }

    if ((req.method || "").toUpperCase() !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed. Use POST." });
    }

    const body = await readJsonBody(req);
    const result = await writeDashboardAccessLog({
      email: body.email,
      displayName: body.displayName || body.name,
      action: body.action || "dashboard_open",
      userAgent: body.userAgent || (req.headers["user-agent"] as string) || "",
      page: body.page || "/",
      sessionId: body.sessionId
    });

    return send(res, 200, result);
  } catch (error) {
    const message = toErrorMessage(error, "Failed to write access log.");
    console.error("access-log:", message);
    return send(res, 500, { error: message });
  }
}
