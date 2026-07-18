import type { IncomingMessage, ServerResponse } from "http";
import {
  fetchTaskTrackerValues,
  getBigQueryConfig,
  toErrorMessage,
  type TaskTrackerQueryResult
} from "../_lib/bigquery";

export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

let cache: TaskTrackerQueryResult | null = null;
let inFlight: Promise<TaskTrackerQueryResult> | null = null;
const TTL_MS = 5 * 60 * 1000;

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
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

    if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
      res.statusCode = 200;
      res.end(JSON.stringify({
        values: cache.values,
        cached: true,
        cachedAt: cache.fetchedAt,
        rowCount: Math.max(0, cache.values.length - 1)
      }));
      return;
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
    res.statusCode = 200;
    res.end(JSON.stringify({
      values: result.values,
      cached: false,
      cachedAt: result.fetchedAt,
      rowCount: Math.max(0, result.values.length - 1)
    }));
  } catch (error) {
    const message = toErrorMessage(error, "Unable to load Task Tracker data from BigQuery.");
    console.error("BigQuery Task Tracker fetch failed:", message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: message, details: message }));
  }
}
