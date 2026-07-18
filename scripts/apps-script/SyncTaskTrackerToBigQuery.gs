/**
 * =============================================================================
 * QMS: Google Sheet → BigQuery (native table) daily sync
 * =============================================================================
 *
 * Logging
 * -------
 * 1) Apps Script → Executions → open run → see step logs
 * 2) Spreadsheet tab "QMS_Sync_Log" — history of OK / FAILED runs
 * 3) Run showLastSyncStatus() to log last sheet-log row
 *
 * Setup: paste this + appsscript.json, set SHEET_NAME, run runSyncNow
 * Target: gen-lang-client-0732074273.qms_dashboard.task_tracker (US)
 * =============================================================================
 */

var CONFIG = {
  PROJECT_ID: 'gen-lang-client-0732074273',
  DATASET_ID: 'qms_dashboard',
  TABLE_ID: 'task_tracker',
  LOCATION: 'US',
  /** Exact tab name at bottom of spreadsheet */
  SHEET_NAME: 'Task Tracker',
  /** Visible history tab (auto-created) */
  LOG_SHEET_NAME: 'QMS_Sync_Log',
  MAX_POLL_ATTEMPTS: 90,
  POLL_SLEEP_MS: 5000,
  /** Optional email; leave '' to disable */
  NOTIFY_EMAIL: ''
};

// In-memory step buffer for this run (also written to QMS_Sync_Log)
var RUN_STEPS_ = [];

function syncTaskTrackerToBigQuery() {
  var started = new Date();
  RUN_STEPS_ = [];
  logStep_('START', 'Sync started at ' + started.toISOString());
  logStep_('CONFIG', 'Target ' + CONFIG.PROJECT_ID + '.' + CONFIG.DATASET_ID + '.' + CONFIG.TABLE_ID +
    ' location=' + CONFIG.LOCATION + ' sheetTab=' + CONFIG.SHEET_NAME);

  try {
    var result = loadActiveSheetToBigQuery_();
    var durationSec = Math.round((new Date().getTime() - started.getTime()) / 1000);
    var msg =
      'QMS BigQuery sync OK | job=' + result.jobId +
      ' | rows=' + result.dataRows +
      ' | fields=' + result.fieldCount +
      ' | durationSec=' + durationSec;

    logStep_('SUCCESS', msg);
    writeSheetLog_({
      status: 'OK',
      started: started,
      finished: new Date(),
      durationSec: durationSec,
      jobId: result.jobId,
      dataRows: result.dataRows,
      fieldCount: result.fieldCount,
      error: '',
      steps: RUN_STEPS_.join(' | ')
    });
    notify_(true, msg + '\n\nSteps:\n' + RUN_STEPS_.join('\n'));
    Logger.log('=== SYNC RESULT: OK ===');
    Logger.log(msg);
    return result;
  } catch (err) {
    var durationSecFail = Math.round((new Date().getTime() - started.getTime()) / 1000);
    var errText = String(err && err.message ? err.message : err);
    var fail = 'QMS BigQuery sync FAILED | ' + errText + ' | durationSec=' + durationSecFail;

    logStep_('FAILED', errText);
    writeSheetLog_({
      status: 'FAILED',
      started: started,
      finished: new Date(),
      durationSec: durationSecFail,
      jobId: '',
      dataRows: '',
      fieldCount: '',
      error: errText,
      steps: RUN_STEPS_.join(' | ')
    });
    notify_(false, fail + '\n\nSteps:\n' + RUN_STEPS_.join('\n'));
    Logger.log('=== SYNC RESULT: FAILED ===');
    Logger.log(fail);
    throw err;
  }
}

/** Manual test from editor */
function runSyncNow() {
  Logger.log('runSyncNow() invoked by user');
  return syncTaskTrackerToBigQuery();
}

/**
 * Quick check: prints last QMS_Sync_Log row to Executions log.
 * Run this anytime to see if last sync worked.
 */
function showLastSyncStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
  if (!logSheet || logSheet.getLastRow() < 2) {
    Logger.log('No sync history yet. Run runSyncNow() first.');
    return 'NO_HISTORY';
  }
  var lastRow = logSheet.getLastRow();
  var headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
  var values = logSheet.getRange(lastRow, 1, 1, logSheet.getLastColumn()).getValues()[0];
  var summary = {};
  for (var i = 0; i < headers.length; i++) {
    summary[headers[i]] = values[i];
  }
  Logger.log('=== LAST SYNC STATUS ===');
  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

// ---------------------------------------------------------------------------
// Load via REST
// ---------------------------------------------------------------------------

function loadActiveSheetToBigQuery_() {
  logStep_('SHEET', 'Opening spreadsheet and tab "' + CONFIG.SHEET_NAME + '"');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(
      'Tab not found: "' + CONFIG.SHEET_NAME + '". Set CONFIG.SHEET_NAME to the exact tab name.'
    );
  }

  logStep_('SHEET', 'Reading data range…');
  var values = sheet.getDataRange().getValues();
  logStep_('SHEET', 'Read grid rows=' + values.length + ' cols=' + (values[0] ? values[0].length : 0));

  if (!values || values.length < 2) {
    throw new Error('Sheet needs a header row + at least 1 data row.');
  }

  logStep_('BUILD', 'Building NDJSON payload…');
  var built = buildNdjson_(values);
  logStep_('BUILD', 'NDJSON ready dataRows=' + built.dataRows +
    ' fields=' + built.fieldNames.length +
    ' payloadChars=' + built.ndjson.length);

  if (!built.ndjson) {
    throw new Error('No data rows to load after reading the sheet.');
  }

  logStep_('BQ_JOB', 'Submitting BigQuery load job (WRITE_TRUNCATE, NDJSON)…');
  var jobId = insertLoadJobNdjson_(built.ndjson, built.fieldNames);
  logStep_('BQ_JOB', 'Job accepted jobId=' + jobId);

  logStep_('BQ_WAIT', 'Waiting for job DONE (poll every ' + (CONFIG.POLL_SLEEP_MS / 1000) + 's)…');
  var done = waitForJob_(jobId);

  if (done.status && done.status.errorResult) {
    throw new Error('BigQuery load failed: ' + JSON.stringify(done.status.errorResult));
  }
  if (done.status && done.status.errors && done.status.errors.length) {
    logStep_('BQ_WARN', 'Job DONE with row warnings count=' + done.status.errors.length);
    Logger.log('Warnings sample: ' + JSON.stringify(done.status.errors).substring(0, 2000));
  } else {
    logStep_('BQ_WAIT', 'Job DONE with no errorResult');
  }

  // Optional: verify table row count via query (best-effort)
  try {
    var n = queryTableRowCount_();
    if (n !== null) {
      logStep_('VERIFY', 'BigQuery table row count after load = ' + n);
    }
  } catch (e) {
    logStep_('VERIFY', 'Row-count check skipped: ' + e);
  }

  return {
    jobId: jobId,
    dataRows: built.dataRows,
    fieldCount: built.fieldNames.length,
    status: done.status && done.status.state
  };
}

function insertLoadJobNdjson_(ndjson, fieldNames) {
  var schemaFields = fieldNames.map(function (name) {
    return { name: name, type: 'STRING', mode: 'NULLABLE' };
  });

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
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        writeDisposition: 'WRITE_TRUNCATE',
        ignoreUnknownValues: true,
        schema: { fields: schemaFields }
      }
    }
  };

  var boundary = 'qms_boundary_' + new Date().getTime();
  var metadata = JSON.stringify(jobResource);
  var body =
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    metadata + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: application/octet-stream\r\n\r\n' +
    ndjson + '\r\n' +
    '--' + boundary + '--';

  var url =
    'https://www.googleapis.com/upload/bigquery/v2/projects/' +
    encodeURIComponent(CONFIG.PROJECT_ID) +
    '/jobs?uploadType=multipart';

  logStep_('BQ_JOB', 'POST Jobs.insert multipart bytes≈' + body.length);
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'multipart/related; boundary=' + boundary,
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    },
    payload: body,
    muteHttpExceptions: true
  });

  var code = resp.getResponseCode();
  var text = resp.getContentText();
  logStep_('BQ_JOB', 'Jobs.insert HTTP ' + code);
  if (code < 200 || code >= 300) {
    throw new Error('Jobs.insert failed HTTP ' + code + ': ' + text.substring(0, 1500));
  }

  var json = JSON.parse(text);
  if (!json.jobReference || !json.jobReference.jobId) {
    throw new Error('Jobs.insert response missing jobId: ' + text.substring(0, 800));
  }
  return json.jobReference.jobId;
}

function waitForJob_(jobId) {
  var last = null;
  for (var i = 0; i < CONFIG.MAX_POLL_ATTEMPTS; i++) {
    Utilities.sleep(CONFIG.POLL_SLEEP_MS);
    var url =
      'https://bigquery.googleapis.com/bigquery/v2/projects/' +
      encodeURIComponent(CONFIG.PROJECT_ID) +
      '/jobs/' + encodeURIComponent(jobId) +
      '?location=' + encodeURIComponent(CONFIG.LOCATION);

    var resp = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    var code = resp.getResponseCode();
    var text = resp.getContentText();
    if (code < 200 || code >= 300) {
      throw new Error('Jobs.get failed HTTP ' + code + ': ' + text.substring(0, 1000));
    }

    last = JSON.parse(text);
    var state = last.status && last.status.state;
    // Log every poll so Executions list shows progress
    logStep_('BQ_WAIT', 'Poll ' + (i + 1) + '/' + CONFIG.MAX_POLL_ATTEMPTS + ' state=' + state);
    if (state === 'DONE') return last;
  }
  throw new Error('BigQuery job timed out. Check job (location US): ' + jobId);
}

/** Best-effort COUNT(*) after load */
function queryTableRowCount_() {
  var sql =
    'SELECT COUNT(*) AS n FROM `' +
    CONFIG.PROJECT_ID + '.' + CONFIG.DATASET_ID + '.' + CONFIG.TABLE_ID + '`';

  var body = {
    query: sql,
    useLegacySql: false,
    location: CONFIG.LOCATION,
    timeoutMs: 30000
  };

  var url =
    'https://bigquery.googleapis.com/bigquery/v2/projects/' +
    encodeURIComponent(CONFIG.PROJECT_ID) +
    '/queries';

  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  var code = resp.getResponseCode();
  var text = resp.getContentText();
  if (code < 200 || code >= 300) {
    logStep_('VERIFY', 'COUNT query HTTP ' + code + ': ' + text.substring(0, 400));
    return null;
  }
  var json = JSON.parse(text);
  if (json.rows && json.rows[0] && json.rows[0].f && json.rows[0].f[0]) {
    return json.rows[0].f[0].v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function logStep_(phase, message) {
  var line = '[' + phase + '] ' + message;
  RUN_STEPS_.push(line);
  Logger.log(line);
}

function writeSheetLog_(row) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
      logSheet.appendRow([
        'timestamp',
        'status',
        'started',
        'finished',
        'duration_sec',
        'job_id',
        'data_rows',
        'field_count',
        'error',
        'steps'
      ]);
      logSheet.setFrozenRows(1);
      logSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    }

    var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    logSheet.appendRow([
      ts,
      row.status,
      row.started ? Utilities.formatDate(row.started, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : '',
      row.finished ? Utilities.formatDate(row.finished, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : '',
      row.durationSec,
      row.jobId,
      row.dataRows,
      row.fieldCount,
      row.error,
      // Keep steps readable but not huge
      String(row.steps || '').substring(0, 45000)
    ]);

    // Keep last ~200 runs
    var maxRows = 201;
    if (logSheet.getLastRow() > maxRows) {
      logSheet.deleteRows(2, logSheet.getLastRow() - maxRows);
    }

    Logger.log('Wrote status to sheet tab: ' + CONFIG.LOG_SHEET_NAME + ' → ' + row.status);
  } catch (e) {
    Logger.log('Could not write QMS_Sync_Log sheet: ' + e);
  }
}

// ---------------------------------------------------------------------------
// Sheet → NDJSON
// ---------------------------------------------------------------------------

function buildNdjson_(values) {
  var rawHeaders = values[0];
  var fieldNames = [];
  var used = {};

  for (var c = 0; c < rawHeaders.length; c++) {
    var name = sanitizeFieldName_(rawHeaders[c], c);
    var base = name;
    var n = 2;
    while (used[name]) {
      name = base + '_' + n;
      n++;
    }
    used[name] = true;
    fieldNames.push(name);
  }

  var lines = [];
  var dataRows = 0;

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var empty = true;
    for (var k = 0; k < row.length; k++) {
      if (row[k] !== '' && row[k] !== null && row[k] !== undefined) {
        empty = false;
        break;
      }
    }
    if (empty) continue;

    var obj = {};
    for (var j = 0; j < fieldNames.length; j++) {
      obj[fieldNames[j]] = cellToString_(row[j]);
    }
    lines.push(JSON.stringify(obj));
    dataRows++;
  }

  return {
    ndjson: lines.join('\n'),
    fieldNames: fieldNames,
    dataRows: dataRows
  };
}

function sanitizeFieldName_(header, index) {
  var s = header === null || header === undefined ? '' : String(header);
  s = s.replace(/^\uFEFF/, '').trim();
  s = s.replace(/[^A-Za-z0-9_]/g, '_');
  s = s.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!s) s = 'col_' + index;
  if (/^[0-9]/.test(s)) s = 'c_' + s;
  if (s.length > 300) s = s.substring(0, 300);
  return s;
}

function cellToString_(value) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value).replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');
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
