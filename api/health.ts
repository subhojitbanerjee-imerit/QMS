import type { IncomingMessage, ServerResponse } from "http";

export const config = {
  runtime: "nodejs",
  maxDuration: 10
};

/** Fully inlined so we can prove the function runtime works without shared imports. */
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "";
    const datasetId = process.env.BIGQUERY_DATASET_ID || "qms_dashboard";
    const tableId = process.env.BIGQUERY_TABLE_ID || "task_tracker";
    const location = process.env.BIGQUERY_LOCATION || "asia-south1";
    const hasServiceAccount = Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON
      || process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      || process.env.GOOGLE_CREDENTIALS
    );

    const missing: string[] = [];
    if (!projectId) missing.push("GOOGLE_CLOUD_PROJECT_ID");
    if (!hasServiceAccount) missing.push("GOOGLE_SERVICE_ACCOUNT_JSON");

    const body = {
      ok: missing.length === 0,
      missing,
      runtime: "api/health.ts-inline",
      bigquery: {
        projectId: projectId || null,
        datasetId,
        tableId,
        location,
        hasServiceAccount,
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
