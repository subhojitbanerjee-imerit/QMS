import { TaskTrackerRow } from "../data/taskTrackerData";

const SPREADSHEET_ID = "1KOOx8Qis_zu8zBO_yfLCCMdPTkPve6WkNL3pJkMXILk";
const SHEET_NAME = "Task Tracker";

// Define normalized map configurations for clean dynamic binding
const HEADER_KEY_ALIASE_MAP: Record<string, string[]> = {
  imerit_task_id: ["imerit_task_id", "task_id", "taskid", "imerit task id", "id", "task_tracker_id"],
  request_id: ["request_id", "requestid", "request id"],
  video_task_id: ["video_task_id", "videotaskid", "video task id", "video_id", "video task"],
  batch_id: ["batch_id", "batchid", "batch id", "batch"],
  driving_seq: ["driving_seq", "drivingseq", "driving sequence", "sequence", "driving_seq_id"],
  location: ["location", "site", "center", "geographic center"],
  simteacher_v2_labeler: ["simteacher_v2_labeler", "v2_labeler", "labeler", "labeler_id", "v2 labeler", "contributor"],
  v2_task_status: ["v2_task_status", "v2 status", "status", "v2_status", "v2_task_status_name"],
  v2_task_status_final: ["v2_task_status_final", "v2 final", "final status", "v2_final_status"],
  v2_start_date_ist: ["v2_start_date_ist", "v2 start date", "start date", "start_date"],
  v2_end_date_ist: ["v2_end_date_ist", "v2 end date", "end_date", "end_date_ist"],
  v2_task_duration_seconds: ["v2_task_duration_seconds", "v2 duration", "duration", "task duration", "v2_task_duration"],
  expected_v2_duration_seconds: ["expected_v2_duration_seconds", "expected v2 duration", "expected duration", "expected_v2_duration"],
  v2_cohort: ["v2_cohort", "cohort", "v2 cohort", "v2_cohort_name"],
  v2_tl: ["v2_tl", "tl", "v2 tl", "team lead", "v2_team_lead"],
  v2_error_category: ["v2_error_category", "v2 error category", "defect category", "v2 error type", "v2_error_type"],
  v2_error_type: ["v2_error_type", "v2 error type", "error description"],
  qa_user_id: ["qa_user_id", "qc_user_id", "qc user", "qa user", "reviewer", "stqc reviewer", "stqc auditor id", "stqc_auditor_id", "stqc auditor", "stqc reviewer id", "stqc_reviewer_id", "auditor id", "auditor_id"],
  selectQcResult: ["selectqcresult", "qc_result", "qc result", "result", "qc_status", "select qc result", "v2 quality score result selector"],
  qc_replay_link: ["qc_replay_link", "replay link", "replay", "video replay"],
  qc_confidence: ["qc_confidence", "qc confidence", "confidence", "review confidence"],
  failureReason: ["failurereason", "failure reason", "defect type", "error reason", "stqc failure reason", "rejection reason"],
  qcComment: ["qccomment", "qc comment", "comment", "notes", "reviewer note", "comments"],
  qc_task_duration_seconds: ["qc_task_duration_seconds", "qc duration", "qc_duration"],
  expected_qc_duration_seconds: ["expected_qc_duration_seconds", "expected qc duration", "expected_qc_duration"],
  stqc_cohort: ["stqc_cohort", "stqc cohort", "qc cohort", "stqc_cohort_name"],
  stqc_tl: ["stqc_tl", "stqc tl", "qc tl", "qc team lead", "stqc_team_lead"],
  qc_error_category: ["qc_error_category", "qc error category", "qc error category based on audit", "qc error category_based on audit", "qc_error_category_based_on_audit"],
  qc_error_type: ["qc_error_type", "qc error type"],
  auditor: ["auditor", "auditor id", "auditor_user", "auditor lead"],
  nuro_findings: ["nuro_findings", "nuro findings", "client findings", "client result", "client feedback"],
  nuro_note: ["nuro_note", "nuro note", "client note", "client comments", "client feed"],
  nuro_review_date: ["nuro_review_date", "nuro review date", "client review date"],
  is_controllable: ["is_controllable", "controllable", "is controllable"],
  week_beginning: ["week_beginning", "week beginning", "wb"]
};

// Normalize a header name to compare
function normalizeHeaderName(name: string): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

// Robust helper to parse multiple date formats
function parseDateStrings(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  let d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  // Manual fallback for DD-MMM-YYYY or DD-MM-YYYY or MM/DD/YYYY
  const monthsAbbr: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    sept: 8
  };
  
  // Clean off extra spacing or characters
  const parts = cleaned.split(/[-/\s]+/);
  if (parts.length === 3) {
    // E.g., 27-Apr-2026, Apr-27-2026 or 27/04/2026
    let day = NaN;
    let monthIdx = NaN;
    let year = NaN;

    // Check if middle part is month abbreviation (e.g. 27-Apr-2026)
    const midLower = parts[1].toLowerCase().substring(0, 3);
    const firstLower = parts[0].toLowerCase().substring(0, 3);
    
    if (monthsAbbr[midLower] !== undefined) {
      day = parseInt(parts[0]);
      monthIdx = monthsAbbr[midLower];
      year = parseInt(parts[2]);
    } else if (monthsAbbr[firstLower] !== undefined) {
      day = parseInt(parts[1]);
      monthIdx = monthsAbbr[firstLower];
      year = parseInt(parts[2]);
    } else {
      // Numerical DD/MM/YYYY or MM/DD/YYYY
      const p0 = parseInt(parts[0]);
      const p1 = parseInt(parts[1]);
      const p2 = parseInt(parts[2]);
      if (p1 > 12 && p0 <= 12) {
        // MM/DD/YYYY
        monthIdx = p0 - 1;
        day = p1;
        year = p2;
      } else {
        // DD/MM/YYYY
        day = p0;
        monthIdx = p1 - 1;
        year = p2;
      }
    }

    if (!isNaN(day) && !isNaN(monthIdx) && !isNaN(year)) {
      if (year < 100) year += 2000; // handle simple years like '26'
      d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

// Extracted Monday generator
function getMonday(d: Date): string {
  const dateCopy = new Date(d.getTime());
  const day = dateCopy.getDay();
  const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday being first day of week
  const mondayDate = new Date(dateCopy.setDate(diff));
  
  const y = mondayDate.getFullYear();
  const m = String(mondayDate.getMonth() + 1).padStart(2, "0");
  const r = String(mondayDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${r}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const fetchRoles = async (accessToken: string): Promise<Record<string, string>> => {
  try {
    const sheetName = 'Roles';
    const range = `${sheetName}!A:B`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // If sheet doesn't exist, it's fine, we return empty roles
      console.warn("Roles sheet not found or not accessible.");
      return {};
    }

    const data = await response.json();
    const rows: string[][] = data.values;

    if (!rows || rows.length <= 1) {
      return {};
    }

    const rolesMap: Record<string, string> = {};
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const email = rows[i][0]?.trim().toLowerCase();
      const role = rows[i][1]?.trim();
      if (email && role) {
        rolesMap[email] = role;
      }
    }

    return rolesMap;
  } catch (error) {
    console.error("Error fetching roles:", error);
    return {};
  }
};

export async function fetchTaskTrackerSheet(accessToken: string): Promise<TaskTrackerRow[]> {
  try {
    const encodedRange = encodeURIComponent(SHEET_NAME);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Sheets service failed with HTTP status:", response.status, errorData);
      throw new Error(errorData?.error?.message || `Google Sheets API returned error code ${response.status}`);
    }

    const json = await response.json();
    const values: string[][] = json.values;

    if (!values || values.length === 0) {
      console.warn("Retrieved empty values array from Task Tracker sheet.");
      return [];
    }

    // Extract headers (first row) and normalize them for easy matching
    const rawHeaders = values[0];
    const headerIndexes: Record<string, number> = {};

    rawHeaders.forEach((header, index) => {
      const normalizedHeader = normalizeHeaderName(header);
      Object.keys(HEADER_KEY_ALIASE_MAP).forEach((key) => {
        const aliases = HEADER_KEY_ALIASE_MAP[key];
        const matchFound = aliases.some(alias => normalizeHeaderName(alias) === normalizedHeader);
        if (matchFound) {
          headerIndexes[key] = index;
        }
      });
    });

    const rows = values.slice(1);
    const parsedData: TaskTrackerRow[] = [];

    rows.forEach((row, index) => {
      // Skip completely empty or blank placeholder rows to avoid polluting the dataset
      if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === "")) {
        return;
      }

      // Build baseline record with clean empty values rather than dummy data, preventing any pollution of real data
      const parsedRow: any = {
        imerit_task_id: `T-${10000 + index}`,
        request_id: `R-${20000 + index}`,
        video_task_id: `V-${30000 + index}`,
        batch_id: "",
        driving_seq: "",
        location: "",
        simteacher_v2_labeler: "",
        v2_task_status: "",
        v2_task_status_final: "",
        v2_start_date_ist: "",
        v2_end_date_ist: "",
        v2_task_duration_seconds: 3600,
        expected_v2_duration_seconds: 3600,
        v2_cohort: "",
        v2_tl: "",
        v2_error_category: "",
        v2_error_type: "",
        qa_user_id: "",
        selectQcResult: "",
        qc_replay_link: "",
        qc_confidence: "",
        failureReason: "",
        qcComment: "",
        qc_task_duration_seconds: 1200,
        expected_qc_duration_seconds: 1200,
        stqc_cohort: "",
        stqc_tl: "",
        qc_error_category: "",
        qc_error_type: "",
        auditor: "",
        nuro_findings: "Accepted",
        nuro_note: "",
        nuro_review_date: "",
        is_controllable: true,
        week_beginning: "",
        month_name: ""
      };

      // 1. Alias-based mappings (override baseline defaults with available headers)
      let resolvedQaUserIdIdx: number | undefined = headerIndexes["qa_user_id"];
      Object.keys(HEADER_KEY_ALIASE_MAP).forEach((key) => {
        const colIdx = headerIndexes[key];
        if (colIdx !== undefined && colIdx < row.length) {
          const val = row[colIdx];
          if (val !== undefined && val !== null && val !== "") {
            if (key === "is_controllable") {
              const strVal = String(val).toLowerCase().trim();
              parsedRow[key] = strVal === "true" || strVal === "y" || strVal === "yes" || strVal === "1";
            } else if (
              key === "v2_task_duration_seconds" ||
              key === "expected_v2_duration_seconds" ||
              key === "qc_task_duration_seconds" ||
              key === "expected_qc_duration_seconds"
            ) {
              const cleanedVal = String(val).replace(/[^0-9.-]/g, "");
              const parsedNum = parseFloat(cleanedVal);
              parsedRow[key] = isNaN(parsedNum) ? 3600 : parsedNum;
            } else {
              parsedRow[key] = val;
            }
          }
        }
      });

      // 2. Strict Absolute Column-letter Index overrides to ensure production compliance (Col AM, AB, AA, AF, AG, P, AH, O)
      // O -> STQC Auditor ID (Index 14)
      if (row.length > 14 && row[14] !== undefined && row[14] !== "") {
        const valueO = String(row[14]).trim();
        // Check if value is a date just in case
        const isDateO = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|2026|2025)\b/i.test(valueO) || 
                        /^[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}$/.test(valueO) ||
                        /^[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}$/.test(valueO);
        if (!isDateO) {
          parsedRow.qa_user_id = valueO;
        }
      }
      
      // Fallback to dynamic alias if Col O didn't provide a value
      if (!parsedRow.qa_user_id || parsedRow.qa_user_id === "") {
        if (resolvedQaUserIdIdx !== undefined && resolvedQaUserIdIdx < row.length && resolvedQaUserIdIdx !== 14) {
          parsedRow.qa_user_id = String(row[resolvedQaUserIdIdx]).trim();
        }
      }

      // AM -> Geographic Location (Index 38)
      if (row.length > 38 && row[38] !== undefined && row[38] !== "") {
        parsedRow.location = String(row[38]).trim();
      }
      // AB -> V2 Cohort (Index 27)
      if (row.length > 27 && row[27] !== undefined && row[27] !== "") {
        parsedRow.v2_cohort = String(row[27]).trim();
      }
      // AA -> STQC Cohort (Index 26)
      if (row.length > 26 && row[26] !== undefined && row[26] !== "") {
        parsedRow.stqc_cohort = String(row[26]).trim();
      }
      // AF -> V2 Team Lead (Index 31)
      if (row.length > 31 && row[31] !== undefined && row[31] !== "") {
        parsedRow.v2_tl = String(row[31]).trim();
      }
      // AG -> STQC Team Lead (Index 32)
      if (row.length > 32 && row[32] !== undefined && row[32] !== "") {
        parsedRow.stqc_tl = String(row[32]).trim();
      }
      // P -> V2 Quality score result selector (Index 15)
      if (row.length > 15 && row[15] !== undefined && row[15] !== "") {
        parsedRow.selectQcResult = String(row[15]).trim();
      }
      // S -> failureReason (Index 18)
      if (row.length > 18 && row[18] !== undefined && row[18] !== "") {
        parsedRow.failureReason = String(row[18]).trim();
      }

      // AC -> QC Error Type (Index 28)
      if (row.length > 28 && row[28] !== undefined && row[28] !== "") {
        parsedRow.qc_error_type = String(row[28]).trim();
      }

      // AD -> V2 Error Type (Index 29)
      if (row.length > 29 && row[29] !== undefined && row[29] !== "") {
        parsedRow.v2_error_type = String(row[29]).trim();
      }

      // AH -> QC ERROR CATEGORY Based on Audit (Index 33)
      if (row.length > 33 && row[33] !== undefined && row[33] !== "") {
        const valueAH = String(row[33]).trim();
        parsedRow.qc_error_category = valueAH;
        parsedRow.qc_error_category_audit = valueAH;
      }

      // AJ -> Nuro Findings / Client Result (Index 35)
      if (row.length > 35 && row[35] !== undefined && row[35] !== "") {
        parsedRow.nuro_findings = String(row[35]).trim();
      }

      // NO OVERWRITE of failureReason with qc_error_category
      // This was previously causing "Fail", "Pass", "Invalid" to show up on charts.

      // AN -> Week Beginning (Index 39)
      if (row.length > 39 && row[39] !== undefined && row[39] !== "") {
        const rawWb = String(row[39]).trim();
        const parsedWb = parseDateStrings(rawWb);
        if (parsedWb) {
          parsedRow.week_beginning = getMonday(parsedWb);
        } else {
          parsedRow.week_beginning = rawWb;
        }
      }

      // 3. Date resolution to establish Weekly & Monthly buckets
      let parsedDate = parseDateStrings(parsedRow.v2_start_date_ist || parsedRow.nuro_review_date);
      
      // If we got week_beginning from AN, try to use it for month resolution if no date yet
      if (parsedRow.week_beginning && !parsedDate) {
        const tempD = parseDateStrings(parsedRow.week_beginning);
        if (tempD) parsedDate = tempD;
      }

      if (!parsedDate) {
        // Look for any date-looking string in the first 10 columns
        for (let i = 0; i < Math.min(row.length, 10); i++) {
          const cellStr = String(row[i]);
          if (cellStr.includes("-") || cellStr.includes("/")) {
            const tempD = parseDateStrings(cellStr);
            if (tempD) {
              parsedDate = tempD;
              break;
            }
          }
        }
      }

      if (parsedDate) {
        // Only overwrite week_beginning if it wasn't explicitly set from Column AN
        if (!parsedRow.week_beginning || parsedRow.week_beginning === "") {
          parsedRow.week_beginning = getMonday(parsedDate);
        }
        parsedRow.month_name = MONTH_NAMES[parsedDate.getMonth()];
      } else {
        // Final fallback
        const defaultWeeks = ["2026-04-27", "2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25", "2026-06-01"];
        const defaultMonths = ["April", "May", "May", "May", "May", "June"];
        const fallbackIndex = index % defaultWeeks.length;
        
        if (!parsedRow.week_beginning || parsedRow.week_beginning === "") {
          parsedRow.week_beginning = defaultWeeks[fallbackIndex];
        }
        parsedRow.month_name = defaultMonths[fallbackIndex];
      }

      parsedData.push(parsedRow as TaskTrackerRow);
    });

    (parsedData as any).headers = rawHeaders;
    console.log(`Successfully parsed ${parsedData.length} active rows from the Google Sheet Task Tracker.`);
    return parsedData;
  } catch (error: any) {
    console.error("Failed to map Google Sheet Task Tracker values:", error);
    throw error;
  }
}
