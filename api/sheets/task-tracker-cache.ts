import type { IncomingMessage, ServerResponse } from "http";
import {
  fetchTaskTrackerValues,
  getBigQueryConfig,
  toErrorMessage,
  type TaskTrackerQueryResult
} from "../_lib/bigquery.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

let cache: TaskTrackerQueryResult | null = null;
let inFlight: Promise<TaskTrackerQueryResult> | null = null;
const TTL_MS = 5 * 60 * 1000;

function sendResult(res: ServerResponse, result: TaskTrackerQueryResult, cached: boolean) {
  const rowCount = Math.max(0, result.values.length - 1);
  res.statusCode = 200;
  res.end(JSON.stringify({
    values: result.values,
    cached,
    cachedAt: result.fetchedAt,
    rowCount,
    totalRows: result.totalRows ?? rowCount,
    fetchedRows: result.fetchedRows ?? rowCount,
    complete: result.complete !== false
  }));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    const cfg = getBigQueryConfig();
    if (!cfg.projectId || !cfg.hasServiceAccount) {
      const missing = [
        !cfg.projectId ? "GOOGLE_CLOUD_PROJECT_ID" : null,
        !cfg.hasServiceAccount ? "GOOGLE_SERVICE_ACCOUNT_JSON" : null
      ].filter(Boolean);

      res.statusCode = 503;
      res.end(JSON.stringify({
        error: `BigQuery is not configured on the server. Missing env: ${missing.join(", ")}. Set these in Vercel Project Settings → Environment Variables, then redeploy.`,
        missing,
        bigquery: {
          datasetId: cfg.datasetId,
          tableId: cfg.tableId,
          location: cfg.location
        }
      }));
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const forceRefresh = url.searchParams.get("refresh") === "1";

    if (!forceRefresh && cache && Date.now() - cache.fetchedAt < TTL_MS) {
      return sendResult(res, cache, true);
    }

    if (!inFlight) {
      inFlight = fetchTaskTrackerValues()
        .then((result) => {
          cache = result;
          return result;
        })
        .finally(() => {
          inFlight = null;
        });
    }

    const result = await inFlight;
    return sendResult(res, result, false);
  } catch (error) {
    const message = toErrorMessage(error, "Unable to load Task Tracker data from BigQuery.");
    console.error("BigQuery Task Tracker fetch failed:", message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: message, details: message }));
  }
}
