# Sheet → BigQuery daily sync (Apps Script)

## Goal

```text
Google Sheet  →  Apps Script (daily)  →  Native BQ table  →  QMS Dashboard
```

- Uses **NEWLINE_DELIMITED_JSON** (not CSV) so `qcComment` free text with quotes/newlines loads cleanly
- Table type stays **Table** (not External)
- No manual CSV every day
- No sharing Sheet with Vercel service account

## Why not CSV?

QC comments often contain `"`, commas, and line breaks. BigQuery CSV load then fails with:

- `Missing close quote character`
- `Data between close quote character and field separator`
- errors on column `qcComment`

JSON lines avoid that entirely.

## Target

| Item | Value |
|------|--------|
| Project | `gen-lang-client-0732074273` |
| Dataset | `qms_dashboard` |
| Table | `task_tracker` |
| Location | `US` |

## Steps

1. Ensure dataset `qms_dashboard` exists in **US**.
2. Grant **your** Google user: BigQuery Data Editor + Job User on the project.
3. Open the Task Tracker spreadsheet → **Extensions → Apps Script**.
4. Paste contents of `SyncTaskTrackerToBigQuery.gs`.
5. Set `CONFIG.SHEET_NAME` to the exact tab name.
6. **Services (+)** → enable **BigQuery API**.
7. Run `runSyncNow` once → approve permissions.
8. In BigQuery (processing location **US**):
   ```sql
   SELECT COUNT(*) AS n
   FROM `gen-lang-client-0732074273.qms_dashboard.task_tracker`;
   ```
9. Table **Details** must show type **Table**.
10. **Triggers** → time-driven → function `syncTaskTrackerToBigQuery` (e.g. daily 6–7am).
11. Dashboard: **Refresh BigQuery** after sync (or next morning after trigger).

## If you still upload CSV manually (not recommended)

- Prefer Apps Script above.
- Or in Sheet: Data → clean `qcComment` (remove line breaks).
- In BQ load options: enable **Allow quoted newlines**, quote all fields.
- Free-text columns will keep causing CSV errors; NDJSON/script is safer.

## Vercel (dashboard only)

```text
GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0732074273
BIGQUERY_DATASET_ID=qms_dashboard
BIGQUERY_TABLE_ID=task_tracker
BIGQUERY_LOCATION=US
GOOGLE_SERVICE_ACCOUNT_JSON=...
```

SA roles: **Data Viewer** + **Job User** (read-only for app).
