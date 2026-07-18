/**
 * BigQuery Task Tracker loader for Vercel/serverless.
 * Uses BigQuery REST + Node crypto JWT (no @google-cloud gRPC).
 *
 * Full-table reads use tabledata.list with pageToken pagination so we do not
 * silently drop rows after the first response page.
 */

export type TaskTrackerQueryResult = {
  values: string[][];
  fetchedAt: number;
  totalRows?: number;
  fetchedRows?: number;
  complete?: boolean;
};

export function toErrorMessage(error: unknown, fallback = "Unexpected server error"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (record.error && typeof record.error === "object") {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === "string" && nested.message.trim()) return nested.message;
    }
    if (Array.isArray(record.errors) && record.errors[0] && typeof record.errors[0] === "object") {
      const first = record.errors[0] as Record<string, unknown>;
      if (typeof first.message === "string") return first.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function getBigQueryConfig() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "";
  const datasetId = process.env.BIGQUERY_DATASET_ID || "qms_dashboard";
  const tableId = process.env.BIGQUERY_TABLE_ID || "task_tracker";
  const location = process.env.BIGQUERY_LOCATION || "asia-south1";
  const hasServiceAccount = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    || process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    || process.env.GOOGLE_CREDENTIALS
  );
  return { projectId, datasetId, tableId, location, hasServiceAccount };
}

export function readServiceAccountCredentials(): {
  client_email: string;
  private_key: string;
  project_id?: string;
} {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    || process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    || process.env.GOOGLE_CREDENTIALS;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not configured. Add the full service-account JSON in Vercel Project Settings."
    );
  }

  let jsonText = raw.trim();
  if (!jsonText.startsWith("{")) {
    try {
      jsonText = Buffer.from(jsonText, "base64").toString("utf8");
    } catch {
      // fall through
    }
  }

  try {
    const credentials = JSON.parse(jsonText) as {
      client_email?: string;
      private_key?: string;
      project_id?: string;
    };
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("Service account JSON must include client_email and private_key.");
    }
    return {
      client_email: credentials.client_email,
      private_key: String(credentials.private_key).replace(/\\n/g, "\n"),
      project_id: credentials.project_id
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("client_email")) throw error;
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the full service-account key file contents (or base64-encode it) as one env var."
    );
  }
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function getAccessToken(credentials: { client_email: string; private_key: string }): Promise<string> {
  const crypto = await import("crypto");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claimSet)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(credentials.private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const tokenJson = await tokenRes.json().catch(() => ({})) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      `Failed to obtain Google OAuth token: ${tokenJson.error_description || tokenJson.error || `HTTP ${tokenRes.status}`}`
    );
  }
  return tokenJson.access_token;
}

function bigQueryCellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null && "v" in (value as Record<string, unknown>)) {
    return bigQueryCellToString((value as { v: unknown }).v);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

type BqTableDataRow = { f?: Array<{ v?: unknown }> };

/**
 * Page through tabledata.list until every row is collected.
 * This is the reliable full-table path (jobs.query first page was truncating counts).
 */
async function listAllTableRows(
  projectId: string,
  datasetId: string,
  tableId: string,
  authHeaders: Record<string, string>,
  expectedTotal?: number
): Promise<BqTableDataRow[]> {
  const pageSize = 10000;
  const maxPages = 200; // hard stop: 2M rows
  const allRows: BqTableDataRow[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    page += 1;
    if (page > maxPages) {
      throw new Error(
        `BigQuery tabledata.list exceeded ${maxPages} pages while reading ${projectId}.${datasetId}.${tableId}. ` +
        `Fetched ${allRows.length} rows so far.`
      );
    }

    const url = new URL(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}` +
      `/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}/data`
    );
    url.searchParams.set("maxResults", String(pageSize));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), { headers: authHeaders });
    const json = await res.json().catch(() => ({})) as {
      rows?: BqTableDataRow[];
      pageToken?: string;
      totalRows?: string;
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new Error(
        `BigQuery tabledata.list failed for ${projectId}.${datasetId}.${tableId}: ` +
        `${json.error?.message || `HTTP ${res.status}`}`
      );
    }

    if (json.rows?.length) {
      allRows.push(...json.rows);
    }
    pageToken = json.pageToken || undefined;

    // Safety: if BigQuery reports a total and we reached it, stop even without pageToken glitches.
    if (expectedTotal && allRows.length >= expectedTotal) {
      pageToken = undefined;
    }
  } while (pageToken);

  return allRows;
}

export async function fetchTaskTrackerValues(): Promise<TaskTrackerQueryResult> {
  const { projectId, datasetId, tableId } = getBigQueryConfig();
  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT_ID is not configured in the server environment.");
  }

  const credentials = readServiceAccountCredentials();
  const accessToken = await getAccessToken(credentials);
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  };

  // 1) Schema + official row count from table metadata
  const tableUrl =
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}` +
    `/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}`;

  const tableRes = await fetch(tableUrl, { headers: authHeaders });
  const tableJson = await tableRes.json().catch(() => ({})) as {
    schema?: { fields?: Array<{ name?: string }> };
    numRows?: string;
    error?: { message?: string; status?: string };
  };

  if (!tableRes.ok) {
    throw new Error(
      `Unable to read BigQuery table ${projectId}.${datasetId}.${tableId}: ` +
      `${tableJson.error?.message || `HTTP ${tableRes.status}`}. ` +
      "Confirm the dataset/table exist and the service account has roles/bigquery.dataViewer + roles/bigquery.jobUser."
    );
  }

  const headers = (tableJson.schema?.fields || [])
    .map((field) => String(field.name || "").trim())
    .filter(Boolean);

  if (!headers.length) {
    throw new Error(`The BigQuery table ${projectId}.${datasetId}.${tableId} has no columns.`);
  }

  const totalRows = Number(tableJson.numRows || 0);

  // 2) Full table dump with pagination (replaces single-page jobs.query)
  const rows = await listAllTableRows(projectId, datasetId, tableId, authHeaders, totalRows || undefined);

  const dataRows = rows.map((row) => {
    const cells = row.f || [];
    return headers.map((_, index) => bigQueryCellToString(cells[index]));
  });

  const fetchedRows = dataRows.length;
  const complete = !totalRows || fetchedRows >= totalRows;

  if (!complete) {
    console.warn(
      `BigQuery partial read for ${projectId}.${datasetId}.${tableId}: fetched ${fetchedRows} of ${totalRows} rows.`
    );
  } else {
    console.log(
      `BigQuery full read for ${projectId}.${datasetId}.${tableId}: ${fetchedRows} rows` +
      (totalRows ? ` (table numRows=${totalRows})` : "")
    );
  }

  return {
    values: [headers, ...dataRows],
    fetchedAt: Date.now(),
    totalRows: totalRows || fetchedRows,
    fetchedRows,
    complete
  };
}
