/**
 * =============================================================================
 * QMS: Google Sheet → BigQuery (native table) daily sync
 * =============================================================================
 *
 * LIVE LOGGING (while the script is running)
 * ------------------------------------------
 * 1) Watch tab **QMS_Sync_Live** in the spreadsheet — updates every step
 *    (status cell + scrolling log). Leave that tab open while you run.
 * 2) After run finishes: Apps Script → Executions → full log
 *    (console.log + Logger.log each step)
 * 3) History tab **QMS_Sync_Log** — one row per finished run (OK/FAILED)
 *
 * Run showLastSyncStatus() anytime to print last history row.
 * =============================================================================
 */

var CONFIG = {
  PROJECT_ID: 'gen-lang-client-0732074273',
  DATASET_ID: 'qms_dashboard',
  TABLE_ID: 'task_tracker',
  LOCATION: 'US',
  SHEET_NAME: 'Task Tracker',
  LOG_SHEET_NAME: 'QMS_Sync_Log',
  /** Live progress tab — updates DURING the run */
  LIVE_SHEET_NAME: 'QMS_Sync_Live',
  MAX_POLL_ATTEMPTS: 90,
  POLL_SLEEP_MS: 5000,
  NOTIFY_EMAIL: ''
};

var RUN_STEPS_ = [];
var LIVE_SHEET_ = null;

function syncTaskTrackerToBigQuery() {
  var started = new Date();
  RUN_STEPS_ = [];
  LIVE_SHEET_ = null;

  initLiveLog_(started);
  logStep_('START', 'Sync started at ' + started.toISOString());
  logStep_('CONFIG', 'Target ' + CONFIG.PROJECT_ID + '.' + CONFIG.DATASET_ID + '.' + CONFIG.TABLE_ID +
    ' | location=' + CONFIG.LOCATION + ' | sheetTab=' + CONFIG.SHEET_NAME);

  try {
    setLiveStatus_('RUNNING', 'Loading sheet → BigQuery…');
    var result = loadActiveSheetToBigQuery_();
    var durationSec = Math.round((new Date().getTime() - started.getTime()) / 1000);
    var msg =
      'OK | job=' + result.jobId +
      ' | rows=' + result.dataRows +
      ' | fields=' + result.fieldCount +
      ' | durationSec=' + durationSec;

    logStep_('SUCCESS', msg);
    setLiveStatus_('OK', msg);
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
    notify_(true, 'QMS BigQuery sync OK\n' + msg + '\n\nSteps:\n' + RUN_STEPS_.join('\n'));
    logStep_('DONE', '=== SYNC RESULT: OK ===');
    return result;
  } catch (err) {
    var durationSecFail = Math.round((new Date().getTime() - started.getTime()) / 1000);
    var errText = String(err && err.message ? err.message : err);
    var fail = 'FAILED | ' + errText + ' | durationSec=' + durationSecFail;

    logStep_('FAILED', errText);
    setLiveStatus_('FAILED', fail);
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
    notify_(false, 'QMS BigQuery sync FAILED\n' + fail + '\n\nSteps:\n' + RUN_STEPS_.join('\n'));
    logStep_('DONE', '=== SYNC RESULT: FAILED ===');
    throw err;
  }
}

/** Manual test */
function runSyncNow() {
  logStep_('START', 'runSyncNow() invoked by user');
  return syncTaskTrackerToBigQuery();
}

/** Print last history row to Executions log */
function showLastSyncStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
  if (!logSheet || logSheet.getLastRow() < 2) {
    logStep_('INFO', 'No sync history yet. Run runSyncNow() first.');
    return 'NO_HISTORY';
  }
  var lastRow = logSheet.getLastRow();
  var headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
  var values = logSheet.getRange(lastRow, 1, 1, logSheet.getLastColumn()).getValues()[0];
  var summary = {};
  for (var i = 0; i < headers.length; i++) {
    summary[headers[i]] = values[i];
  }
  logStep_('INFO', '=== LAST SYNC STATUS === ' + JSON.stringify(summary));
  return summary;
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

function loadActiveSheetToBigQuery_() {
  logStep_('SHEET', 'Opening tab "' + CONFIG.SHEET_NAME + '"…');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(
      'Tab not found: "' + CONFIG.SHEET_NAME + '". Set CONFIG.SHEET_NAME to the exact tab name.'
    );
  }

  logStep_('SHEET', 'Reading all cells (may take a minute on large sheets)…');
  setLiveStatus_('RUNNING', 'Reading sheet data…');
  var values = sheet.getDataRange().getValues();
  logStep_('SHEET', 'Read complete: rows=' + values.length + ' cols=' + (values[0] ? values[0].length : 0));

  if (!values || values.length < 2) {
    throw new Error('Sheet needs a header row + at least 1 data row.');
  }

  logStep_('BUILD', 'Building NDJSON (safe for qcComment text)…');
  setLiveStatus_('RUNNING', 'Building NDJSON payload…');
  var built = buildNdjson_(values);
  logStep_('BUILD', 'Ready: dataRows=' + built.dataRows +
    ' fields=' + built.fieldNames.length +
    ' payloadChars=' + built.ndjson.length);

  if (!built.ndjson) {
    throw new Error('No data rows to load after reading the sheet.');
  }

  logStep_('BQ_JOB', 'Submitting load job WRITE_TRUNCATE → ' +
    CONFIG.DATASET_ID + '.' + CONFIG.TABLE_ID);
  setLiveStatus_('RUNNING', 'Submitting BigQuery load job…');
  var jobId = insertLoadJobNdjson_(built.ndjson, built.fieldNames);
  logStep_('BQ_JOB', 'Job accepted: ' + jobId);
  setLiveStatus_('RUNNING', 'Job running: ' + jobId);

  logStep_('BQ_WAIT', 'Polling job every ' + (CONFIG.POLL_SLEEP_MS / 1000) + 's (max ~' +
    Math.round(CONFIG.MAX_POLL_ATTEMPTS * CONFIG.POLL_SLEEP_MS / 60000) + ' min)…');
  var done = waitForJob_(jobId);

  if (done.status && done.status.errorResult) {
    throw new Error('BigQuery load failed: ' + JSON.stringify(done.status.errorResult));
  }
  if (done.status && done.status.errors && done.status.errors.length) {
    logStep_('BQ_WARN', 'DONE with warnings count=' + done.status.errors.length);
    Logger.log('Warnings: ' + JSON.stringify(done.status.errors).substring(0, 2000));
    console.warn('BQ warnings', done.status.errors);
  } else {
    logStep_('BQ_WAIT', 'Job state DONE (no errorResult)');
  }

  try {
    setLiveStatus_('RUNNING', 'Verifying row count in BigQuery…');
    var n = queryTableRowCount_();
    if (n !== null) {
      logStep_('VERIFY', 'BigQuery COUNT(*) after load = ' + n);
    } else {
      logStep_('VERIFY', 'COUNT(*) not available (non-fatal)');
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

  logStep_('BQ_JOB', 'POST Jobs.insert multipart size≈' + body.length + ' bytes');
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
    var pollMsg = 'Poll ' + (i + 1) + '/' + CONFIG.MAX_POLL_ATTEMPTS + ' state=' + state;
    logStep_('BQ_WAIT', pollMsg);
    setLiveStatus_('RUNNING', 'BigQuery job ' + jobId + ' — ' + pollMsg);

    if (state === 'DONE') return last;
  }
  throw new Error('BigQuery job timed out. Check job (location US): ' + jobId);
}

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
// LIVE + history logging
// ---------------------------------------------------------------------------

/**
 * Log one step:
 * - console.log → visible in Executions (V8)
 * - Logger.log → Executions detail
 * - QMS_Sync_Live sheet → updates WHILE script is running (open that tab)
 */
function logStep_(phase, message) {
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss');
  var line = ts + ' [' + phase + '] ' + message;
  RUN_STEPS_.push(line);

  // Both sinks for Executions UI
  console.log(line);
  Logger.log(line);

  // Live sheet so you can watch progress during the run
  appendLiveLogLine_(line);
}

function initLiveLog_(started) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(CONFIG.LIVE_SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(CONFIG.LIVE_SHEET_NAME);
    } else {
      sh.clear();
    }
    LIVE_SHEET_ = sh;

    sh.getRange('A1').setValue('QMS BigQuery Sync — LIVE STATUS');
    sh.getRange('A1').setFontWeight('bold').setFontSize(12);
    sh.getRange('A2').setValue('Status');
    sh.getRange('B2').setValue('STARTING');
    sh.getRange('B2').setFontWeight('bold').setBackground('#fff2cc');
    sh.getRange('A3').setValue('Detail');
    sh.getRange('B3').setValue('Preparing…');
    sh.getRange('A4').setValue('Started');
    sh.getRange('B4').setValue(
      Utilities.formatDate(started, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
    );
    sh.getRange('A5').setValue('Target');
    sh.getRange('B5').setValue(
      CONFIG.PROJECT_ID + '.' + CONFIG.DATASET_ID + '.' + CONFIG.TABLE_ID + ' @ ' + CONFIG.LOCATION
    );
    sh.getRange('A7').setValue('Live log (newest at bottom)');
    sh.getRange('A7').setFontWeight('bold');
    sh.setColumnWidth(1, 100);
    sh.setColumnWidth(2, 900);
    SpreadsheetApp.flush();
  } catch (e) {
    console.log('initLiveLog_ failed: ' + e);
    Logger.log('initLiveLog_ failed: ' + e);
  }
}

function setLiveStatus_(status, detail) {
  try {
    if (!LIVE_SHEET_) return;
    LIVE_SHEET_.getRange('B2').setValue(status);
    LIVE_SHEET_.getRange('B3').setValue(detail);
    if (status === 'OK') {
      LIVE_SHEET_.getRange('B2').setBackground('#d9ead3');
    } else if (status === 'FAILED') {
      LIVE_SHEET_.getRange('B2').setBackground('#f4cccc');
    } else {
      LIVE_SHEET_.getRange('B2').setBackground('#fff2cc');
    }
    SpreadsheetApp.flush();
  } catch (e) {
    // non-fatal
  }
}

function appendLiveLogLine_(line) {
  try {
    if (!LIVE_SHEET_) return;
    var nextRow = Math.max(8, LIVE_SHEET_.getLastRow() + 1);
    LIVE_SHEET_.getRange(nextRow, 1).setValue(nextRow - 7); // step #
    LIVE_SHEET_.getRange(nextRow, 2).setValue(line);
    // Keep sheet from growing forever during one run
    if (nextRow > 500) {
      LIVE_SHEET_.deleteRow(8);
    }
    // Force UI update so you see lines while code is still running
    SpreadsheetApp.flush();
  } catch (e) {
    // non-fatal
  }
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
      String(row.steps || '').substring(0, 45000)
    ]);

    var maxRows = 201;
    if (logSheet.getLastRow() > maxRows) {
      logSheet.deleteRows(2, logSheet.getLastRow() - maxRows);
    }
    logStep_('LOG', 'History written to tab ' + CONFIG.LOG_SHEET_NAME + ' → ' + row.status);
  } catch (e) {
    console.log('Could not write QMS_Sync_Log: ' + e);
    Logger.log('Could not write QMS_Sync_Log: ' + e);
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

    // Progress every 5000 rows so live log shows build progress
    if (dataRows % 5000 === 0) {
      logStep_('BUILD', 'Encoded ' + dataRows + ' data rows…');
    }
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
    logStep_('NOTIFY', 'Email failed: ' + e);
  }
}
