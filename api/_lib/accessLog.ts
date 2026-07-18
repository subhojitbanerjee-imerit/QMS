/**
 * Dashboard access log → BigQuery native table (streaming insert).
 * Table: {project}.{dataset}.dashboard_access_log
 *
 * SA needs BigQuery Data Editor (or write) on the dataset + Job User.
 */

import {
  getBigQueryConfig,
  readServiceAccountCredentials,
  toErrorMessage
} from "./bigquery.js";

export const ACCESS_LOG_TABLE_ID =
  process.env.BIGQUERY_ACCESS_LOG_TABLE_ID || "dashboard_access_log";

export type AccessLogEntry = {
  email: string;
  displayName?: string;
  action?: string;
  userAgent?: string;
  page?: string;
  sessionId?: string;
};

async function getAccessTokenForWrite(credentials: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const crypto = await import("crypto");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: credentials.client_email,
    // full bigquery scope required for insertAll / table create
    scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode(header)}.${encode(claimSet)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(credentials.private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const tokenJson = await tokenRes.json().catch(() => ({})) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      `OAuth token failed: ${tokenJson.error_description || tokenJson.error || tokenRes.status}`
    );
  }
  return tokenJson.access_token;
}

async function ensureAccessLogTable(
  projectId: string,
  datasetId: string,
  tableId: string,
  authHeaders: Record<string, string>
): Promise<void> {
  const tableUrl =
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}` +
    `/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}`;

  const getRes = await fetch(tableUrl, { headers: authHeaders });
  if (getRes.ok) return;
  if (getRes.status !== 404) {
    const err = await getRes.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(
      `Unable to check access log table: ${err.error?.message || `HTTP ${getRes.status}`}`
    );
  }

  const createRes = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}` +
    `/datasets/${encodeURIComponent(datasetId)}/tables`,
    {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        tableReference: {
          projectId,
          datasetId,
          tableId
        },
        schema: {
          fields: [
            { name: "accessed_at", type: "TIMESTAMP", mode: "REQUIRED" },
            { name: "email", type: "STRING", mode: "REQUIRED" },
            { name: "display_name", type: "STRING", mode: "NULLABLE" },
            { name: "action", type: "STRING", mode: "NULLABLE" },
            { name: "user_agent", type: "STRING", mode: "NULLABLE" },
            { name: "page", type: "STRING", mode: "NULLABLE" },
            { name: "session_id", type: "STRING", mode: "NULLABLE" }
          ]
        },
        description: "QMS dashboard access log (who opened / refreshed the app)"
      })
    }
  );

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({})) as { error?: { message?: string } };
    // Race: table created by another instance
    if (createRes.status === 409) return;
    throw new Error(
      `Unable to create access log table ${datasetId}.${tableId}: ${err.error?.message || createRes.status}. ` +
      "Grant the service account roles/bigquery.dataEditor on the dataset."
    );
  }
}

export async function writeDashboardAccessLog(entry: AccessLogEntry): Promise<{
  ok: true;
  table: string;
}> {
  const { projectId, datasetId, location } = getBigQueryConfig();
  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT_ID is not configured.");
  }

  const email = String(entry.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("email is required for access log.");
  }

  const credentials = readServiceAccountCredentials();
  const accessToken = await getAccessTokenForWrite(credentials);
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json"
  };

  const tableId = ACCESS_LOG_TABLE_ID;
  await ensureAccessLogTable(projectId, datasetId, tableId, authHeaders);

  const insertUrl =
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}` +
    `/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}/insertAll`;

  const insertRes = await fetch(insertUrl, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      skipInvalidRows: false,
      ignoreUnknownValues: true,
      rows: [
        {
          json: {
            accessed_at: new Date().toISOString(),
            email,
            display_name: String(entry.displayName || "").trim() || null,
            action: String(entry.action || "dashboard_open").trim() || "dashboard_open",
            user_agent: String(entry.userAgent || "").slice(0, 1000) || null,
            page: String(entry.page || "/").slice(0, 500) || "/",
            session_id: String(entry.sessionId || "").slice(0, 128) || null
          }
        }
      ]
    })
  });

  const insertJson = await insertRes.json().catch(() => ({})) as {
    insertErrors?: Array<{ errors?: Array<{ message?: string }> }>;
    error?: { message?: string };
  };

  if (!insertRes.ok || insertJson.error) {
    throw new Error(
      insertJson.error?.message ||
      `Access log insert failed HTTP ${insertRes.status}`
    );
  }
  if (insertJson.insertErrors?.length) {
    const msg = insertJson.insertErrors[0]?.errors?.[0]?.message || "insertErrors";
    throw new Error(`Access log insertErrors: ${msg}`);
  }

  return {
    ok: true,
    table: `${projectId}.${datasetId}.${tableId}`
  };
}

export { toErrorMessage };
