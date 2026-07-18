# Colab: Sheet → BigQuery sync

## Why Colab

- Runs as **you** (can open the Sheet; no Vercel SA on Sheet)
- Handles **~70k rows** better than Apps Script
- Loads **native** BigQuery table (`WRITE_TRUNCATE`)
- Avoids CSV quote issues (uses DataFrame → BQ load)

## Steps

1. Open [Google Colab](https://colab.research.google.com)
2. Upload `sheet_to_bigquery_sync.ipynb` **or** File → Upload notebook
3. Edit config cell:
   - `SPREADSHEET_ID` from Sheet URL
   - `SHEET_NAME` exact tab name
4. Runtime → Run all
5. Sign in when prompted
6. Wait for `=== SYNC RESULT: OK ===`
7. Dashboard → **Refresh BigQuery**

## Requirements

- Your user: BigQuery **Data Editor** + **Job User**
- Dataset `qms_dashboard` location **US**
- Vercel: `BIGQUERY_LOCATION=US`

## Not real-time

Each run is a snapshot. Re-run the notebook to refresh.
