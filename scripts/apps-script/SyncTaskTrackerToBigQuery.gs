/**
 * =============================================================================
 * QMS: Google Sheet → BigQuery (native table) daily sync
 * =============================================================================
 *
 * Uses BigQuery REST API via UrlFetchApp (no Advanced Service required).
 * Format: NEWLINE_DELIMITED_JSON load (safe for qcComment quotes/newlines).
 *
 * Target: gen-lang-client-0732074273.qms_dashboard.task_tracker (location US)
 *
 * Setup
 * -----
 * 1) Your Google user needs BigQuery Data Editor + Job User on the project
 * 2) Sheet → Extensions → Apps Script → paste this file + appsscript.json
 * 3) Set CONFIG.SHEET_NAME to exact tab name
 * 4) Run runSyncNow once → approve OAuth
 * 5) Triggers → time-driven → syncTaskTrackerToBigQuery
 * =============================================================================
 */

var CONFIG = {
  PROJECT_ID: 'gen-lang-client-0732074273',
  DATASET_ID: 'qms_dashboard',
  TABLE_ID: 'task_tracker',
  LOCATION: 'US',
  /** Exact tab name at bottom of spreadsheet */
  SHEET_NAME: 'Task Tracker',
  MAX_POLL_ATTEMPTS: 90,
  POLL_SLEEP_MS: 5000,
  NOTIFY_EMAIL: ''
};

function syncTaskTrackerToBigQuery() {
  var started = new Date();
  try {
    var result = loadActiveSheetToBigQuery_();
    var msg =
      'QMS BigQuery sync OK\n' +
      'Table: ' + CONFIG.PROJECT_ID + '.' + CONFIG.DATASET_ID + '.' + CONFIG.TABLE_ID + '\n' +
      'Job: ' + result.jobId + '\n' +
      'Data rows: ' + result.dataRows + '\n' +
      'Fields: ' + result.fieldCount + '\n' +
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

/** Manual test from editor */
function runSyncNow() {
  return syncTaskTrackerToBigQuery();
}

// ---------------------------------------------------------------------------
// Load via REST (no BigQuery advanced service)
// ---------------------------------------------------------------------------

function loadActiveSheetToBigQuery_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(
      'Tab not found: "' + CONFIG.SHEET_NAME + '". ' +
      'Set CONFIG.SHEET_NAME to the exact tab name.'
    );
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    throw new Error('Sheet needs a header row + at least 1 data row.');
  }

  var built = buildNdjson_(values);
  if (!built.ndjson) {
    throw new Error('No data rows to load after reading the sheet.');
  }

  // Multipart load job: metadata JSON + NDJSON body
  var jobId = insertLoadJobNdjson_(built.ndjson, built.fieldNames);
  Logger.log('Load job started: ' + jobId);

  var done = waitForJob_(jobId);
  if (done.status && done.status.errorResult) {
    throw new Error('BigQuery load failed: ' + JSON.stringify(done.status.errorResult));
  }
  if (done.status && done.status.errors && done.status.errors.length) {
    Logger.log('Warnings: ' + JSON.stringify(done.status.errors).substring(0, 2000));
  }

  return {
    jobId: jobId,
    dataRows: built.dataRows,
    fieldCount: built.fieldNames.length,
    status: done.status && done.status.state
  };
}

/**
 * BigQuery Jobs.insert with media upload (NDJSON file).
 * https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/insert
 */
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

  // multipart/related: part1=job config, part2=file content
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
    Logger.log('Poll ' + (i + 1) + ': ' + state);
    if (state === 'DONE') return last;
  }
  throw new Error('BigQuery job timed out. Check job (location US): ' + jobId);
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
