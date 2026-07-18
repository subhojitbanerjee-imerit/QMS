/**
 * =============================================================================
 * QMS: Google Sheet → BigQuery (native table) daily sync
 * =============================================================================
 *
 * Uses NEWLINE_DELIMITED_JSON (not CSV) so free-text columns like qcComment
 * can contain quotes, commas, and line breaks without breaking the load.
 *
 * Target
 * ------
 * Project : gen-lang-client-0732074273
 * Dataset : qms_dashboard
 * Table   : task_tracker
 * Location: US
 *
 * Setup
 * -----
 * 1) Dataset qms_dashboard in location US
 * 2) Your user: BigQuery Data Editor + Job User
 * 3) Extensions → Apps Script → paste this file
 * 4) Services (+) → add BigQuery API
 * 5) Set CONFIG.SHEET_NAME to exact tab name
 * 6) Run runSyncNow once → approve permissions
 * 7) Triggers → time-driven → syncTaskTrackerToBigQuery (daily)
 *
 * Do NOT use BigQuery "Create table from Drive/Sheets" (that is EXTERNAL).
 * =============================================================================
 */

var CONFIG = {
  PROJECT_ID: 'gen-lang-client-0732074273',
  DATASET_ID: 'qms_dashboard',
  TABLE_ID: 'task_tracker',
  LOCATION: 'US',
  /** Exact tab name at the bottom of the spreadsheet */
  SHEET_NAME: 'Task Tracker',
  MAX_POLL_ATTEMPTS: 90,
  POLL_SLEEP_MS: 5000,
  /** Optional email; leave '' to disable */
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

/** Manual test: select runSyncNow → Run */
function runSyncNow() {
  return syncTaskTrackerToBigQuery();
}

// ---------------------------------------------------------------------------
// Core load
// ---------------------------------------------------------------------------

function loadActiveSheetToBigQuery_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(
      'Tab not found: "' + CONFIG.SHEET_NAME + '". ' +
      'Set CONFIG.SHEET_NAME to the exact tab name at the bottom of the Sheet.'
    );
  }

  // getValues keeps types; we stringify safely for JSON.
  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" needs a header row + at least 1 data row.');
  }

  var built = buildNdjson_(values);
  if (!built.ndjson) {
    throw new Error('No data rows to load after cleaning headers.');
  }

  var blob = Utilities.newBlob(built.ndjson, 'application/octet-stream', 'task_tracker_sync.ndjson');

  // Explicit schema (all STRING) avoids fragile CSV type inference and
  // preserves free-text columns (qcComment, notes, etc.).
  var schemaFields = built.fieldNames.map(function (name) {
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

  var inserted = BigQuery.Jobs.insert(jobResource, CONFIG.PROJECT_ID, blob);
  if (!inserted || !inserted.jobReference || !inserted.jobReference.jobId) {
    throw new Error('BigQuery.Jobs.insert returned no jobId. Enable Services → BigQuery API.');
  }

  var jobId = inserted.jobReference.jobId;
  Logger.log('NDJSON load job started: ' + jobId);

  var done = waitForJob_(jobId);
  if (done.status.errorResult) {
    throw new Error('BigQuery load failed: ' + JSON.stringify(done.status.errorResult));
  }
  if (done.status.errors && done.status.errors.length) {
    Logger.log('Job finished with warnings: ' + JSON.stringify(done.status.errors).substring(0, 2000));
  }

  return {
    jobId: jobId,
    dataRows: built.dataRows,
    fieldCount: built.fieldNames.length,
    status: done.status.state
  };
}

/**
 * Convert sheet grid → newline-delimited JSON.
 * Each line is one object: {"colA":"...","qcComment":"text with \"quotes\" and\nnewlines"}
 */
function buildNdjson_(values) {
  var rawHeaders = values[0];
  var fieldNames = [];
  var used = {};

  for (var c = 0; c < rawHeaders.length; c++) {
    var name = sanitizeFieldName_(rawHeaders[c], c);
    // Deduplicate if two columns sanitize to the same name
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
    // Skip completely empty rows
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

/** BigQuery field names: letters, numbers, underscores; start with letter/underscore */
function sanitizeFieldName_(header, index) {
  var s = header === null || header === undefined ? '' : String(header);
  s = s.replace(/^\uFEFF/, ''); // BOM
  s = s.trim();
  // Keep original-ish names the dashboard already aliases (spaces → _)
  s = s.replace(/[^A-Za-z0-9_]/g, '_');
  s = s.replace(/_+/g, '_');
  s = s.replace(/^_+|_+$/g, '');
  if (!s) s = 'col_' + index;
  if (/^[0-9]/.test(s)) s = 'c_' + s;
  // BigQuery max field name length 300
  if (s.length > 300) s = s.substring(0, 300);
  return s;
}

function cellToString_(value) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    // ISO-like local display without timezone gymnastics
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  var s = String(value);
  // Strip zero-width / bidi junk that often appears in pasted QC comments
  s = s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');
  return s;
}

function waitForJob_(jobId) {
  var last = null;
  for (var i = 0; i < CONFIG.MAX_POLL_ATTEMPTS; i++) {
    Utilities.sleep(CONFIG.POLL_SLEEP_MS);
    last = BigQuery.Jobs.get(CONFIG.PROJECT_ID, jobId, { location: CONFIG.LOCATION });
    var state = last.status && last.status.state;
    Logger.log('Poll ' + (i + 1) + ': ' + state);
    if (state === 'DONE') return last;
  }
  throw new Error(
    'BigQuery job timed out. Check job in console (location US): ' + jobId
  );
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
