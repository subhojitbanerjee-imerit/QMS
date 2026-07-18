import type { IncomingMessage, ServerResponse } from "http";
import { getBigQueryConfig } from "./_lib/bigquery.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10
};

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const cfg = getBigQueryConfig();
    const missing: string[] = [];
    if (!cfg.projectId) missing.push("GOOGLE_CLOUD_PROJECT_ID");
    if (!cfg.hasServiceAccount) missing.push("GOOGLE_SERVICE_ACCOUNT_JSON");

    const body = {
      ok: missing.length === 0,
      missing,
      runtime: "api/health.ts",
      bigquery: {
        projectId: cfg.projectId || null,
        datasetId: cfg.datasetId,
        tableId: cfg.tableId,
        location: cfg.location,
        hasServiceAccount: cfg.hasServiceAccount,
        client: "rest+jwt"
      },
      message: missing.length
        ? `BigQuery is not configured. Missing: ${missing.join(", ")}`
        : "BigQuery environment looks configured."
    };

    res.statusCode = missing.length ? 503 : 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "Health check failed"
    }));
  }
}
