# Sim Teacher QMS — Full Project Setup Guide

Step-by-step documentation for running and maintaining this project in the future.

**App:** [https://qms-inky.vercel.app/](https://qms-inky.vercel.app/)  
**Repo:** [https://github.com/subhojitbanerjee-imerit/QMS](https://github.com/subhojitbanerjee-imerit/QMS)

---

## 1. What this project is

**Sim Teacher QMS** is an iMerit operations dashboard for AV labeling quality:

- Loads **Task Tracker** data from **BigQuery**
- Shows KPIs, filters, charts, batch audit %, V2/STQC ledgers
- Optional Gemini AI (RCA, coaching, drift, certification)
- Access gate logs **who opened the dashboard** into BigQuery

### Data flow (current recommended)

```text
Google Sheet (ops edit data)
        │
        ▼  Colab Python  OR  Apps Script (scheduled / manual)
BigQuery native table
  gen-lang-client-0732074273.qms_dashboard.task_tracker   (location: US)
        │
        ▼  Vercel API (paged / full load depending on commit)
QMS Dashboard (React)
        │
        └── access logs → qms_dashboard.dashboard_access_log
```

**Important:**

| Do | Don’t |
|----|--------|
| Native BigQuery **TABLE** | EXTERNAL table “from Drive/Sheets” |
| Dataset location **US** | Point app at `asia-south1` if data is in US |
| Load Sheet → BQ as a **copy** | Expect second-by-second real-time |

---

## 2. Stack

| Layer | Tech |
|--------|------|
| Frontend | React 19, Vite, Tailwind, Recharts |
| API | Vercel serverless (`api/*`) |
| Warehouse | Google BigQuery |
| Ops source | Google Sheet |
| Sheet → BQ | Colab notebook and/or Apps Script |
| Auth / access log | Email form or Firebase Google sign-in → BQ log table |
| Hosting | Vercel |

---

## 3. Fixed names (do not rename casually)

| Item | Value |
|------|--------|
| GCP project | `gen-lang-client-0732074273` |
| Dataset | `qms_dashboard` |
| Task table | `task_tracker` |
| Access log table | `dashboard_access_log` |
| BigQuery location | **`US`** |
| Live app | `qms-inky.vercel.app` |

Full task table id:

```text
gen-lang-client-0732074273.qms_dashboard.task_tracker
```

---

## 4. One-time setup (from zero)

### Step 4.1 — Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Select project **`gen-lang-client-0732074273`**
3. Enable **BigQuery API**

### Step 4.2 — Create dataset

1. BigQuery → **Create dataset**
2. Settings:

| Field | Value |
|--------|--------|
| Dataset ID | `qms_dashboard` |
| Location | **`US`** (multi-region) |

3. Confirm **Details → Data location = US**

### Step 4.3 — Create native `task_tracker` table

**Do not** use “Create table from Google Drive/Sheets” (that creates EXTERNAL).

**Option A — First load from CSV (simple)**

1. Sheet → File → Download → CSV  
2. BigQuery → `qms_dashboard` → Create table → **Upload**  
3. Table name: `task_tracker`  
4. CSV, skip 1 header row, auto-detect (or all STRING)  
5. Create  
6. Confirm **Table type = Table** (not External)

**Option B — Colab (preferred for large sheets / free-text comments)**

See **Section 6**.

### Step 4.4 — Service account for Vercel

1. IAM → Service Accounts → create or reuse (e.g. `qms-dashboard-bq`)
2. Keys → Add key → JSON → download  
3. Grant on project:

| Role | Purpose |
|------|---------|
| **BigQuery Data Viewer** | Read task data |
| **BigQuery Job User** | Run reads / jobs |
| **BigQuery Data Editor** | Access log writes + auto-create log table |

### Step 4.5 — Vercel environment variables

**Vercel → Project → Settings → Environment Variables** (Production):

#### Required (BigQuery)

```text
GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0732074273
BIGQUERY_DATASET_ID=qms_dashboard
BIGQUERY_TABLE_ID=task_tracker
BIGQUERY_LOCATION=US
GOOGLE_SERVICE_ACCOUNT_JSON=<full service-account JSON as one value>
```

#### Optional

```text
GEMINI_API_KEY=<for live AI; else simulation mode>
BIGQUERY_ACCESS_LOG_TABLE_ID=dashboard_access_log
```

#### Optional (Google sign-in button on access screen)

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Without Firebase, users still enter **name + email** (guest) for access logging.

**After any env change → Redeploy.**

### Step 4.6 — Verify API

1. https://qms-inky.vercel.app/api/health  
   - Expect `"ok": true`, `"location": "US"`, `hasServiceAccount: true`
2. Open dashboard → access screen → continue  
3. Refresh BigQuery data  
4. Check access log SQL (Section 8)

---

## 5. Local development

```bash
cd QMS
npm install
```

Create `.env.local` (never commit secrets):

```text
GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0732074273
BIGQUERY_DATASET_ID=qms_dashboard
BIGQUERY_TABLE_ID=task_tracker
BIGQUERY_LOCATION=US
GOOGLE_SERVICE_ACCOUNT_JSON={...}
GEMINI_API_KEY=...
```

```bash
npm run dev
```

App: http://localhost:3000

---

## 6. Keep data fresh (Sheet → BigQuery)

Dashboard only reads BigQuery. When Sheet changes, **reload BQ**.

### Method A — Google Colab (recommended for ~70k rows)

**Path:** `scripts/colab/sheet_to_bigquery_sync.ipynb`

1. Open [Colab](https://colab.research.google.com)  
2. Upload / open the notebook  
3. Set:

```python
SPREADSHEET_ID = "..."   # from Sheet URL /d/THIS/edit
SHEET_NAME = "Task Tracker"
LOCATION = "US"
```

4. Runtime → Run all  
5. Sign in as a user who can open the Sheet + write BigQuery  
6. Wait for `=== SYNC RESULT: OK ===`  
7. Dashboard → Refresh BigQuery  

**Not real-time.** Re-run notebook when you need a new snapshot.

### Method B — Apps Script (scheduled)

**Path:** `scripts/apps-script/SyncTaskTrackerToBigQuery.gs`  
**Manifest:** `scripts/apps-script/appsscript.json`

1. Sheet → Extensions → Apps Script  
2. Paste `.gs` + set `appsscript.json` scopes  
3. Set `CONFIG.SHEET_NAME`  
4. Run `runSyncNow` once (approve permissions)  
5. Trigger: time-driven → `syncTaskTrackerToBigQuery`  
6. Watch **QMS_Sync_Live** / **QMS_Sync_Log** tabs  

Uses **NDJSON load** (not CSV) so `qcComment` free text does not break.

### Method C — Manual CSV (avoid for comments)

Can break on quotes/newlines in `qcComment`. Prefer Colab or Apps Script NDJSON.

### Do not

- Create EXTERNAL table from Drive/Sheets for production dashboard  
- Use `BIGQUERY_LOCATION=asia-south1` when dataset is US  

---

## 7. Access log (who opened the dashboard)

### Behavior

1. User opens app → **Access** screen  
2. Google sign-in **or** name + email  
3. Server `POST /api/access-log` writes a row to:

```text
qms_dashboard.dashboard_access_log
```

Table is auto-created on first successful write if SA has **Data Editor**.

### Manual create (optional)

`scripts/bigquery/create_access_log_table.sql`

### View log

```sql
-- Processing location: US
SELECT
  accessed_at,
  email,
  display_name,
  action,
  session_id
FROM `gen-lang-client-0732074273.qms_dashboard.dashboard_access_log`
ORDER BY accessed_at DESC
LIMIT 100;
```

---

## 8. Dashboard metrics cheat sheet

| Metric | Source columns |
|--------|----------------|
| **V2 accuracy / score** | `selectQcResult` (fail/reject = fail) |
| **QC accuracy / score** | `qc_error_category` / audit category fail values |
| **Client agreement** | QC audit category vs `nuro_findings` |
| **V2 Audit %** | Non-blank `v2_error_type` (legacy Col **AD**) ÷ tasks |
| **QC Audit %** | Non-blank `qc_error_type` (legacy Col **AC**) ÷ tasks |
| **Week filters** | `WB` / `week_beginning` |
| **Batch** | `batch_id` |

Filters apply across location, cohort, TL, member, week, month.

---

## 9. Deploy

```bash
git push origin main
```

Vercel builds from `main` if the GitHub project is linked.

Empty redeploy trigger:

```bash
git commit --allow-empty -m "Trigger Vercel redeploy"
git push origin main
```

---

## 10. Useful URLs

| Purpose | URL |
|---------|-----|
| Dashboard | https://qms-inky.vercel.app/ |
| Health | https://qms-inky.vercel.app/api/health |
| Access log API info | https://qms-inky.vercel.app/api/access-log |
| Task data API (page sample) | https://qms-inky.vercel.app/api/sheets/task-tracker-cache?maxResults=100 |

---

## 11. Verify checklist (after any change)

```text
[ ] Dataset location = US
[ ] task_tracker type = Table (not External)
[ ] COUNT(*) works in BQ with location US
[ ] Vercel BIGQUERY_LOCATION=US
[ ] SA has Viewer + Job User (+ Editor for access log)
[ ] /api/health → ok: true
[ ] Dashboard access screen works
[ ] Access log row appears in dashboard_access_log
[ ] Refresh BigQuery loads task data
```

SQL:

```sql
SELECT COUNT(*) AS n
FROM `gen-lang-client-0732074273.qms_dashboard.task_tracker`;

SELECT table_type
FROM `gen-lang-client-0732074273.qms_dashboard.INFORMATION_SCHEMA.TABLES`
WHERE table_name = 'task_tracker';
-- expect BASE TABLE
```

---

## 12. Troubleshooting

| Error | Cause | Fix |
|--------|--------|-----|
| Not found … **asia-south1** | Wrong query/app location | Set location **US** (BQ UI + Vercel) |
| Cannot list table of type **EXTERNAL** | Sheet-linked table | Recreate as **native** load |
| Permission denied … **Drive credentials** | EXTERNAL + SA can’t open Sheet | Native table or share Sheet with SA |
| CSV missing close quote / `qcComment` | Free text breaks CSV | Colab / Apps Script **NDJSON** |
| Access log insert fails | SA read-only | Grant **Data Editor** |
| Apps Script slow / timeout (~70k rows) | Size limit | Use **Colab** |
| Dashboard not real-time | By design | Re-run Colab/Script; then Refresh BQ |

---

## 13. Repo map (high level)

```text
api/
  health.ts              # env / BQ config probe
  access-log.ts          # who accessed dashboard
  sheets/task-tracker-cache.ts   # task data pages from BQ
  _lib/bigquery.ts       # BQ auth + table read
  _lib/accessLog.ts      # access log write
src/
  App.tsx
  components/
    AccessGate.tsx       # sign-in / email gate
    OperationsDashboard.tsx
  lib/
    sheetsService.ts     # parse + fetch task data
    accessLogClient.ts
    firebaseAuth.ts
scripts/
  colab/                 # Sheet → BQ notebook
  apps-script/           # Sheet → BQ automation
  bigquery/              # SQL helpers
PROJECT_SETUP.md         # this file
```

---

## 14. Day-2 operations (recurring)

| Cadence | Action |
|---------|--------|
| When Sheet data changes | Run **Colab** (or wait for Apps Script trigger) |
| After BQ sync | Open dashboard → **Refresh BigQuery** |
| Weekly | Check `dashboard_access_log` for usage |
| On deploy | Confirm `/api/health` and one dashboard load |

---

## 15. Security notes

- Never commit `.env` / service account JSON  
- Do not put secrets in `VITE_*` except public Firebase web config  
- `GOOGLE_SERVICE_ACCOUNT_JSON` is server-only (no `VITE_` prefix)  
- Access log stores emails — treat as internal data  

---

## 16. Quick start (copy for new joiners)

1. Get GCP access to project `gen-lang-client-0732074273`  
2. Confirm `qms_dashboard.task_tracker` exists as **native** table in **US**  
3. Get Vercel access; confirm env vars (Section 4.5)  
4. Clone repo; `npm install`; use `.env.local` for local  
5. To refresh data: run Colab notebook with Sheet ID  
6. Open dashboard → sign in → Refresh BigQuery  
7. View access log SQL (Section 7)  

---

*Last aligned with architecture as of access logging + Colab/Apps Script native BQ pipeline. Update this file when names, locations, or env vars change.*
