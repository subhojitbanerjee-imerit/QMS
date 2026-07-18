/**
 * =============================================================================
 * QMS: Google Sheet → BigQuery (native table) daily sync
 * =============================================================================
 *
 * What this does
 * --------------
 * Reads a tab from THIS Google Spreadsheet, builds CSV in memory, and runs a
 * BigQuery LOAD job with WRITE_TRUNCATE (full replace). Result is a NATIVE
 * BigQuery table — NOT an EXTERNAL "link to Sheet" table.
 *
 * Target
 * ------
 * Project : gen-lang-client-0732074273
 * Dataset : qms_dashboard
 * Table   : task_tracker
 * Location: US
 *
 * One-time setup (do in order)
 * ----------------------------
 * 1) BigQuery: dataset qms_dashboard exists in location US.
 *    (Optional first time: create empty native table task_tracker, or let
 *     autodetect create it on first successful load.)
 *
 * 2) Your Google user (the one who owns/runs this script) on the GCP project
 *    needs: BigQuery Data Editor + BigQuery Job User.
 *
 * 3) In this spreadsheet:
 *    Extensions → Apps Script
 *    - Paste this entire file (replace any default code)
 *    - Left sidebar Services (+) → add "BigQuery API"
 *    - Edit CONFIG.SHEET_NAME below to match your EXACT tab name
 *
 * 4) Run function: runSyncNow
 *    - Approve permissions when prompted
 *    - View → Logs / Executions for success or errors
 *
 * 5) BigQuery (query location US):
 *    SELECT COUNT(*) FROM `gen-lang-client-0732074273.qms_dashboard.task_tracker`;
 *    Details on the table must show Table type: Table (not External).
 *
 * 6) Schedule:
 *    Apps Script → Triggers (clock) → Add trigger
 *    - Function: syncTaskTrackerToBigQuery
 *    - Event source: Time-driven
 *    - Type: Day timer (or Hour timer)
 *    - Time: e.g. 6am to 7am
 *
 * 7) Dashboard: after each sync, open app and click Refresh BigQuery
 *    (Vercel SA only needs Data Viewer + Job User on the project.)
 *
 * Do NOT use BigQuery "Create table from Google Drive/Sheets"
 * — that creates EXTERNAL tables and breaks the dashboard SA path.
 * =============================================================================
 */

var CONFIG = {
  PROJECT_ID: 'gen-lang-client-0732074273',
  DATASET_ID: 'qms_dashboard',
  TABLE_ID: 'task_tracker',
  /** Multi-region US — must match the dataset location */
  LOCATION: 'US',
  /**
   * Exact tab name (bottom of the spreadsheet).
   * Change this if your tab is not "Task Tracker".
   */
  SHEET_NAME: 'Task Tracker',
  /** Max wait for the BigQuery load job (~5 minutes) */
  MAX_POLL_ATTEMPTS: 60,
  POLL_SLEEP_MS: 5000,
  /** Email you on success/failure (set to '' to disable) */
  NOTIFY_EMAIL: ''
};

/**
 * Scheduled entry point — attach the time-driven trigger to THIS function.
 */
function syncTaskTrackerToBigQuery() {
  var started = new Date();
  try {
    var result = loadActiveSheetToBigQuery_();
    var msg =
      'QMS BigQuery sync OK\n' +
      'Table: ' + CONFIG.PROJECT_ID + '.' + CONFIG.DATASET_ID + '.' + CONFIG.TABLE_ID + '\n' +
      'Job: ' + result.jobId + '\n' +
      'Rows in sheet (incl header): ' + result.sheetRows + '\n' +
      'Started: ' + started.toISOString();
    Logger.log(msg);
    notify_(true, msg);
    return result;
  } catch (err) {
    var fail =
      'QMS BigQuery sync FAILED\n' +
      String(err && err.message ? err.message : err) +
      '\nStarted: ' + started.toISOString();
    Logger.log(fail);
    notify_(false, fail);
    throw err;
  }
}

/**
 * Manual test from the Apps Script editor: select runSyncNow → Run.
 */
function runSyncNow() {
  return syncTaskTrackerToBigQuery();
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function loadActiveSheetToBigQuery_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(
      'Tab not found: "' + CONFIG.SHEET_NAME + '". ' +
      'Open the sheet, check the tab name at the bottom, set CONFIG.SHEET_NAME, save, and re-run.'
    );
  }

  // Display values keep dates/numbers as users see them in the Sheet.
  var values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length < 2) {
    throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" has no data rows (need header + at least 1 row).');
  }

  var csv = toCsv_(values);
  var blob = Utilities.newBlob(csv, 'application/octet-stream', 'task_tracker_sync.csv');

  var jobResource = {
    jobReference: {
      projectId: CONFIG.PROJECT_ID,
      location: CONFIG.LOCATION
    },
    configuration: {
      load: {
        destinationTable: {
          projectId: CONFIG.PROJECT_ID,
          datasetId: CONFIG.DATASET_ID,
          tableId: CONFIG.TABLE_ID
        },
        sourceFormat: 'CSV',
        skipLeadingRows: 1,
        autodetect: true,
        writeDisposition: 'WRITE_TRUNCATE',
        allowQuotedNewlines: true,
        ignoreUnknownValues: true,
        // Helps when Sheet has empty trailing columns
        allowJaggedRows: true
      }
    }
  };

  // Requires: Services → BigQuery API enabled in this Apps Script project.
  var inserted = BigQuery.Jobs.insert(jobResource, CONFIG.PROJECT_ID, blob);
  if (!inserted || !inserted.jobReference || !inserted.jobReference.jobId) {
    throw new Error('BigQuery.Jobs.insert returned no jobId. Is BigQuery service enabled?');
  }

  var jobId = inserted.jobReference.jobId;
  Logger.log('Load job started: ' + jobId + ' (location ' + CONFIG.LOCATION + ')');

  var done = waitForJob_(jobId);
  if (done.status.errorResult) {
    throw new Error('BigQuery load failed: ' + JSON.stringify(done.status.errorResult));
  }
  if (done.status.errors && done.status.errors.length) {
    // Non-fatal row errors may appear here; log them.
    Logger.log('Job completed with row-level errors: ' + JSON.stringify(done.status.errors));
  }

  return {
    jobId: jobId,
    sheetRows: values.length,
    status: done.status.state
  };
}

function waitForJob_(jobId) {
  var last = null;
  for (var i = 0; i < CONFIG.MAX_POLL_ATTEMPTS; i++) {
    Utilities.sleep(CONFIG.POLL_SLEEP_MS);
    last = BigQuery.Jobs.get(CONFIG.PROJECT_ID, jobId, { location: CONFIG.LOCATION });
    var state = last.status && last.status.state;
    Logger.log('Poll ' + (i + 1) + ': ' + state);
    if (state === 'DONE') {
      return last;
    }
  }
  throw new Error(
    'BigQuery job timed out after ~' +
    Math.round((CONFIG.MAX_POLL_ATTEMPTS * CONFIG.POLL_SLEEP_MS) / 1000) +
    's. Check job in console: ' + jobId
  );
}

function toCsv_(rows) {
  return rows.map(function (row) {
    return row.map(csvEscape_).join(',');
  }).join('\n');
}

function csvEscape_(cell) {
  var s = cell === null || cell === undefined ? '' : String(cell);
  // Normalize newlines inside cells
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function notify_(ok, body) {
  var email = CONFIG.NOTIFY_EMAIL || '';
  if (!email) return;
  try {
    MailApp.sendEmail({
      to: email,
      subject: ok ? '[QMS] BigQuery sync OK' : '[QMS] BigQuery sync FAILED',
      body: body
    });
  } catch (e) {
    Logger.log('Email notify failed: ' + e);
  }
}
