export interface TaskTrackerRow {
  imerit_task_id: string;
  request_id: string;
  video_task_id: string;
  batch_id: string;
  driving_seq: string;
  location: string;
  
  // V2 First-Pass Data
  simteacher_v2_labeler: string;
  v2_task_status: string;
  v2_task_status_final: string;
  v2_start_date_ist: string;
  v2_end_date_ist: string;
  v2_task_duration_seconds: number;
  expected_v2_duration_seconds: number;
  v2_cohort: string;
  v2_tl: string;
  v2_error_category: string;
  v2_error_type: string;

  // QC / STQC Data
  qa_user_id: string;
  selectQcResult: string;
  qc_replay_link: string;
  qc_confidence: string;
  failureReason: string;
  qcComment: string;
  qc_task_duration_seconds: number;
  expected_qc_duration_seconds: number;
  stqc_cohort: string;
  stqc_tl: string;
  qc_error_category: string;
  qc_error_type: string;

  // Higher Level Reviews
  auditor: string;
  nuro_findings: string;
  nuro_note: string;
  nuro_review_date: string;
  is_controllable: boolean;

  // Dynamic grouping additions for filters
  week_beginning?: string;
  month_name?: string;
  qc_error_category_audit?: string;
}

// Generate 80 detailed rows to represent the dataset dynamically
export const TASK_TRACKER_DATA: TaskTrackerRow[] = [
  {
    imerit_task_id: "T-2001",
    request_id: "REQ-101",
    video_task_id: "VID-9821",
    batch_id: "BATCH-AV-01",
    driving_seq: "SEQ_SF_092_DAY",
    location: "San Francisco",
    simteacher_v2_labeler: "labeler_01",
    v2_task_status: "Completed",
    v2_task_status_final: "Passed",
    v2_start_date_ist: "2026-06-10T10:00:00",
    v2_end_date_ist: "2026-06-10T11:15:00",
    v2_task_duration_seconds: 4500,
    expected_v2_duration_seconds: 4200,
    v2_cohort: "Cohort_Alpha",
    v2_tl: "TL_Anil",
    v2_error_category: "None",
    v2_error_type: "None",
    qa_user_id: "qc_user_05",
    selectQcResult: "Pass",
    qc_replay_link: "https://rec.av.imerit.net/qc-v-2001/replay",
    qc_confidence: "High",
    failureReason: "None",
    qcComment: "All bounding boxes are perfectly aligned. Semantic boundaries are well respected.",
    qc_task_duration_seconds: 1200,
    expected_qc_duration_seconds: 1500,
    stqc_cohort: "STQC_North",
    stqc_tl: "STQC_TL_Ranjan",
    qc_error_category: "None",
    qc_error_type: "None",
    auditor: "Auditor_Preeti",
    nuro_findings: "Accepted",
    nuro_note: "Clean delivery.",
    nuro_review_date: "2026-06-12",
    is_controllable: true,
  },
  {
    imerit_task_id: "T-2002",
    request_id: "REQ-101",
    video_task_id: "VID-9822",
    batch_id: "BATCH-AV-01",
    driving_seq: "SEQ_SF_093_NIGHT",
    location: "San Francisco",
    simteacher_v2_labeler: "labeler_02",
    v2_task_status: "Completed",
    v2_task_status_final: "Rejected",
    v2_start_date_ist: "2026-06-10T10:15:00",
    v2_end_date_ist: "2026-06-10T10:55:00",
    v2_task_duration_seconds: 2400,
    expected_v2_duration_seconds: 4500,
    v2_cohort: "Cohort_Alpha",
    v2_tl: "TL_Anil",
    v2_error_category: "Object Fitting",
    v2_error_type: "Bounding Box Size Error",
    qa_user_id: "qc_user_05",
    selectQcResult: "Reject",
    qc_replay_link: "https://rec.av.imerit.net/qc-v-2002/replay",
    qc_confidence: "High",
    failureReason: "Bounding Box Misalignment",
    qcComment: "Severe undersizing of bbox on target sedan parked adjacent to curb. Duration is far below expected (rushing).",
    qc_task_duration_seconds: 1800,
    expected_qc_duration_seconds: 1500,
    stqc_cohort: "STQC_North",
    stqc_tl: "STQC_TL_Ranjan",
    qc_error_category: "Object Fitting",
    qc_error_type: "Tightness Discrepancy",
    auditor: "Auditor_Preeti",
    nuro_findings: "Correction Required",
    nuro_note: "Sedan bounding boxes must be re-padded.",
    nuro_review_date: "2026-06-13",
    is_controllable: true,
  },
  {
    imerit_task_id: "T-2003",
    request_id: "REQ-102",
    video_task_id: "VID-9823",
    batch_id: "BATCH-AV-01",
    driving_seq: "SEQ_PHX_104_DUST",
    location: "Phoenix",
    simteacher_v2_labeler: "labeler_11",
    v2_task_status: "Completed",
    v2_task_status_final: "Passed",
    v2_start_date_ist: "2026-06-11T09:00:00",
    v2_end_date_ist: "2026-06-11T10:40:00",
    v2_task_duration_seconds: 6000,
    expected_v2_duration_seconds: 5200,
    v2_cohort: "Cohort_Beta",
    v2_tl: "TL_Srikrishnan",
    v2_error_category: "None",
    v2_error_type: "None",
    qa_user_id: "qc_user_12",
    selectQcResult: "Pass",
    qc_replay_link: "https://rec.av.imerit.net/qc-v-2003/replay",
    qc_confidence: "Medium",
    failureReason: "None",
    qcComment: "Accurate labeler, took time to process occluded frames. Low confidence because camera feeds had high dust storm noise.",
    qc_task_duration_seconds: 1600,
    expected_qc_duration_seconds: 1800,
    stqc_cohort: "STQC_South",
    stqc_tl: "STQC_TL_Simran",
    qc_error_category: "None",
    qc_error_type: "None",
    auditor: "Auditor_Amit",
    nuro_findings: "Accepted",
    nuro_note: "Labeler handled sensor noise exceptionally well.",
    nuro_review_date: "2026-06-14",
    is_controllable: true,
  },
  {
    imerit_task_id: "T-2004",
    request_id: "REQ-102",
    video_task_id: "VID-9824",
    batch_id: "BATCH-AV-01",
    driving_seq: "SEQ_PHX_105_SUNSET",
    location: "Phoenix",
    simteacher_v2_labeler: "labeler_12",
    v2_task_status: "Completed",
    v2_task_status_final: "Rejected",
    v2_start_date_ist: "2026-06-11T13:00:00",
    v2_end_date_ist: "2026-06-11T14:10:00",
    v2_task_duration_seconds: 4200,
    expected_v2_duration_seconds: 5200,
    v2_cohort: "Cohort_Beta",
    v2_tl: "TL_Srikrishnan",
    v2_error_category: "Classification",
    v2_error_type: "Incorrect Attribute Mapping",
    qa_user_id: "qc_user_12",
    selectQcResult: "Reject",
    qc_replay_link: "https://rec.av.imerit.net/qc-v-2004/replay",
    qc_confidence: "High",
    failureReason: "Attribute Tagging Error",
    qcComment: "Vehicle status attributes (e.g. 'Parked' vs 'Moving') are mislabeled on multiple frames.",
    qc_task_duration_seconds: 2000,
    expected_qc_duration_seconds: 1800,
    stqc_cohort: "STQC_South",
    stqc_tl: "STQC_TL_Simran",
    qc_error_category: "Classification",
    qc_error_type: "Attribute Error",
    auditor: "Auditor_Amit",
    nuro_findings: "Rejected",
    nuro_note: "Quality audit fails. Re-annotate vehicle dynamics attribute.",
    nuro_review_date: "2026-06-15",
    is_controllable: true,
  },
  {
    imerit_task_id: "T-2005",
    request_id: "REQ-103",
    video_task_id: "VID-9825",
    batch_id: "BATCH-AV-02",
    driving_seq: "SEQ_BLR_202_RAIN",
    location: "Bangalore",
    simteacher_v2_labeler: "labeler_21",
    v2_task_status: "Completed",
    v2_task_status_final: "Rejected",
    v2_start_date_ist: "2026-06-12T11:00:00",
    v2_end_date_ist: "2026-06-12T12:05:00",
    v2_task_duration_seconds: 3900,
    expected_v2_duration_seconds: 4800,
    v2_cohort: "Cohort_Gamma",
    v2_tl: "TL_Pooja",
    v2_error_category: "Semantic Boundaries",
    v2_error_type: "Lane Boundary Deviation",
    qa_user_id: "qc_user_22",
    selectQcResult: "Reject",
    qc_replay_link: "https://rec.av.imerit.net/qc-v-2005/replay",
    qc_confidence: "High",
    failureReason: "Lane Boundary Deviation",
    qcComment: "Severe lane drift annotation in heavy rain segment. The line tracker was offset by 20cm.",
    qc_task_duration_seconds: 1700,
    expected_qc_duration_seconds: 1600,
    stqc_cohort: "STQC_East",
    stqc_tl: "STQC_TL_Debashree",
    qc_error_category: "Line Tracking",
    qc_error_type: "Spline Alignment",
    auditor: "Auditor_Debdeep",
    nuro_findings: "Correction Required",
    nuro_note: "Rain reflections caused the error, needs precise spline stitching.",
    nuro_review_date: "2026-06-15",
    is_controllable: true,
  },
  {
    imerit_task_id: "T-2006",
    request_id: "REQ-103",
    video_task_id: "VID-9826",
    batch_id: "BATCH-AV-02",
    driving_seq: "SEQ_BLR_203_TRAFFIC",
    location: "Bangalore",
    simteacher_v2_labeler: "labeler_22",
    v2_task_status: "Completed",
    v2_task_status_final: "Passed",
    v2_start_date_ist: "2026-06-12T14:00:00",
    v2_end_date_ist: "2026-06-12T15:25:00",
    v2_task_duration_seconds: 5100,
    expected_v2_duration_seconds: 4800,
    v2_cohort: "Cohort_Gamma",
    v2_tl: "TL_Pooja",
    v2_error_category: "None",
    v2_error_type: "None",
    qa_user_id: "qc_user_22",
    selectQcResult: "Pass",
    qc_replay_link: "https://rec.av.imerit.net/qc-v-2006/replay",
    qc_confidence: "High",
    failureReason: "None",
    qcComment: "Highly precise labels on challenging city traffic sequences.",
    qc_task_duration_seconds: 1550,
    expected_qc_duration_seconds: 1600,
    stqc_cohort: "STQC_East",
    stqc_tl: "STQC_TL_Debashree",
    qc_error_category: "None",
    qc_error_type: "None",
    auditor: "Auditor_Debdeep",
    nuro_findings: "Accepted",
    nuro_note: "Flawless semantic segmentation.",
    nuro_review_date: "2026-06-15",
    is_controllable: true,
  },
  {
    imerit_task_id: "T-2007",
    request_id: "REQ-104",
    video_task_id: "VID-9827",
    batch_id: "BATCH-AV-03",
    driving_seq: "SEQ_KOL_301_FOG",
    location: "Kolkata",
    simteacher_v2_labeler: "labeler_31",
    v2_task_status: "Completed",
    v2_task_status_final: "Rejected",
    v2_start_date_ist: "2026-06-13T09:30:00",
    v2_end_date_ist: "2026-06-13T10:45:00",
    v2_task_duration_seconds: 4500,
    expected_v2_duration_seconds: 4600,
    v2_cohort: "Cohort_Delta",
    v2_tl: "TL_Preeti",
    v2_error_category: "Environment Noise",
    v2_error_type: "Fog Mask Distortion",
    qa_user_id: "qc_user_35",
    selectQcResult: "Pass",
    qc_replay_link: "https://rec.av.imerit.net/qc-v-2007/replay",
    qc_confidence: "Low",
    failureReason: "Extreme Weather Occlusion",
    qcComment: "Heavy fog resulted in missed pedestrian bounding box at 70 meters. However, we classified this as uncontrollable due to blind sensor data.",
    qc_task_duration_seconds: 1400,
    expected_qc_duration_seconds: 1400,
    stqc_cohort: "STQC_West",
    stqc_tl: "STQC_TL_Pradeep",
    qc_error_category: "Sensor Limits",
    qc_error_type: "Camera Obscuration",
    auditor: "Auditor_Siddharth",
    nuro_findings: "Accepted",
    nuro_note: "Client agrees pedestrian was completely non-visible to human labelers. Uncontrollable factor designated.",
    nuro_review_date: "2026-06-16",
    is_controllable: false,
  },
  {
    imerit_task_id: "T-2008",
    request_id: "REQ-104",
    video_task_id: "VID-9828",
    batch_id: "BATCH-AV-03",
    driving_seq: "SEQ_KOL_302_NIGHT",
    location: "Kolkata",
    simteacher_v2_labeler: "labeler_32",
    v2_task_status: "Completed",
    v2_task_status_final: "Rejected",
    v2_start_date_ist: "2026-06-13T11:00:00",
    v2_end_date_ist: "2026-06-13T12:00:00",
    v2_task_duration_seconds: 3600,
    expected_v2_duration_seconds: 4600,
    v2_cohort: "Cohort_Delta",
    v2_tl: "TL_Preeti",
    v2_error_category: "Object Missing",
    v2_error_type: "Missed Bbox on Vehicle",
    qa_user_id: "qc_user_35",
    selectQcResult: "Reject",
    qc_replay_link: "https://rec.av.imerit.net/qc-v-2008/replay",
    qc_confidence: "High",
    failureReason: "Missing Objects",
    qcComment: "Missed 2 oncoming bicycles in dark street. Labeler worked 1 hour (22% faster than expected). Classic rushing error.",
    qc_task_duration_seconds: 1450,
    expected_qc_duration_seconds: 1400,
    stqc_cohort: "STQC_West",
    stqc_tl: "STQC_TL_Pradeep",
    qc_error_category: "Object Fitting",
    qc_error_type: "Missed Object Class",
    auditor: "Auditor_Siddharth",
    nuro_findings: "Rejected",
    nuro_note: "Bicycles are high-risk objects. Highly critical miss.",
    nuro_review_date: "2026-06-16",
    is_controllable: true,
  },
  {
    imerit_task_id: "T-2009",
    request_id: "REQ-105",
    video_task_id: "VID-9829",
    batch_id: "BATCH-AV-03",
    driving_seq: "SEQ_SF_094_HEAVY_TRAFFIC",
    location: "San Francisco",
    simteacher_v2_labeler: "labeler_01",
    v2_task_status: "Completed",
    v2_task_status_final: "Passed",
    v2_start_date_ist: "2026-06-13T14:00:00",
    v2_end_date_ist: "2026-06-13T15:15:00",
    v2_task_duration_seconds: 4500,
    expected_v2_duration_seconds: 4500,
    v2_cohort: "Cohort_Alpha",
    v2_tl: "TL_Anil",
    v2_error_category: "None",
    v2_error_type: "None",
    qa_user_id: "qc_user_05",
    selectQcResult: "Pass",
    qc_replay_link: "https://rec.av.imerit.net/qc-v-2009/replay",
    qc_confidence: "High",
    failureReason: "None",
    qcComment: "Flawless execution under standard timing limits.",
    qc_task_duration_seconds: 1300,
    expected_qc_duration_seconds: 1500,
    stqc_cohort: "STQC_North",
    stqc_tl: "STQC_TL_Ranjan",
    qc_error_category: "None",
    qc_error_type: "None",
    auditor: "Auditor_Preeti",
    nuro_findings: "Accepted",
    nuro_note: "Quality exceeds bar.",
    nuro_review_date: "2026-06-16",
    is_controllable: true,
  }
];

// Dynamically generate the remaining 60-70 entries to achieve high quality statistically perfect dataset
const generateRemainingData = (): TaskTrackerRow[] => {
  const data = [...TASK_TRACKER_DATA];
  const locations: Array<"Bangalore" | "Kolkata" | "Phoenix" | "San Francisco"> = [
    "Bangalore",
    "Kolkata",
    "Phoenix",
    "San Francisco"
  ];
  const v2_cohorts: Array<"Cohort_Alpha" | "Cohort_Beta" | "Cohort_Gamma" | "Cohort_Delta" | "Cohort_Epsilon"> = [
    "Cohort_Alpha", "Cohort_Beta", "Cohort_Gamma", "Cohort_Delta", "Cohort_Epsilon"
  ];
  const v2_tls: Array<"TL_Anil" | "TL_Srikrishnan" | "TL_Pooja" | "TL_Preeti"> = [
    "TL_Anil", "TL_Srikrishnan", "TL_Pooja", "TL_Preeti"
  ];
  const stqc_cohorts: Array<"STQC_North" | "STQC_South" | "STQC_East" | "STQC_West"> = [
    "STQC_North", "STQC_South", "STQC_East", "STQC_West"
  ];
  const stqc_tls: Array<"STQC_TL_Ranjan" | "STQC_TL_Simran" | "STQC_TL_Debashree" | "STQC_TL_Pradeep"> = [
    "STQC_TL_Ranjan", "STQC_TL_Simran", "STQC_TL_Debashree", "STQC_TL_Pradeep"
  ];
  const auditors: Array<"Auditor_Preeti" | "Auditor_Amit" | "Auditor_Debdeep" | "Auditor_Siddharth"> = [
    "Auditor_Preeti", "Auditor_Amit", "Auditor_Debdeep", "Auditor_Siddharth"
  ];
  const failureReasons: Array<TaskTrackerRow["failureReason"]> = [
    "Bounding Box Misalignment",
    "Missing Objects",
    "Incorrect Semantic Labeling",
    "Occlusion Handling Error",
    "Attribute Tagging Error",
    "Lane Boundary Deviation",
    "Sensor Noise Distortion",
    "Extreme Weather Occlusion",
    "Glare/Sensor Saturation",
  ];

  const labelers_pool = {
    "Cohort_Alpha": ["labeler_01", "labeler_02", "labeler_03", "labeler_04"],
    "Cohort_Beta": ["labeler_11", "labeler_12", "labeler_13", "labeler_14"],
    "Cohort_Gamma": ["labeler_21", "labeler_22", "labeler_23", "labeler_24"],
    "Cohort_Delta": ["labeler_31", "labeler_32", "labeler_33", "labeler_34"],
    "Cohort_Epsilon": ["labeler_41", "labeler_42", "labeler_43", "labeler_44"]
  };

  const sequences = [
    "SEQ_SF_095_NIGHT", "SEQ_SF_096_SUNNY", "SEQ_BLR_204_OVERCAST",
    "SEQ_KOL_303_NIGHT", "SEQ_PHX_106_HAZE", "SEQ_PHX_107_BRIGHT",
    "SEQ_SF_097_RAINY", "SEQ_BLR_205_HEAVY_TRAFFIC", "SEQ_KOL_304_MONSOON"
  ];

  // Generate rows up to 100 to represent a solid, comprehensive sample database
  for (let i = 10; i <= 95; i++) {
    const cohortIdx = i % v2_cohorts.length;
    const cohort = v2_cohorts[cohortIdx];
    const tlIdx = i % v2_tls.length;
    const tl = v2_tls[tlIdx];
    const location = locations[i % locations.length];
    
    // Fetch labeler ID from the designated cohort pool
    const pool = labelers_pool[cohort];
    const labeler = pool[i % pool.length];

    // Compute expected duration and add random noise to actual duration
    const expected_duration = 3600 + (i % 5) * 400; // between 3600 and 5200
    // Introduce dynamic pacing metrics (some rushing, some perfect, some sluggish)
    let actual_duration = expected_duration;
    if (i % 3 === 0) {
      actual_duration = Math.round(expected_duration * 0.72); // rushing (faster processing)
    } else if (i % 7 === 0) {
      actual_duration = Math.round(expected_duration * 1.34); // slow / over-thinking
    } else {
      actual_duration = Math.round(expected_duration * (0.95 + (i % 10) * 0.01)); // normal range
    }

    // Determine QC Result based on cohort trends to simulate realistic correlations
    // Let's make Cohort Beta and Cohort Delta have slightly higher error rates for certain failure reasons
    const isError = i % 4 !== 0; // 75% error-free or borderline, 25% errors
    let qcResult: "Pass" | "Reject" | "Borderline" = "Pass";
    let failureReason: TaskTrackerRow["failureReason"] = "None";
    let is_controllable = true;

    if (isError) {
      if (i % 7 === 0) {
         qcResult = "Borderline";
         failureReason = "None";
      } else {
         qcResult = "Reject";
         // Select error category based on location or cohort
         const reasonIdx = (i + i % 3) % failureReasons.length;
         failureReason = failureReasons[reasonIdx];
         
         // Set controllable vs uncontrollable flags
         if (
           failureReason === "Sensor Noise Distortion" ||
           failureReason === "Extreme Weather Occlusion" ||
           failureReason === "Glare/Sensor Saturation"
         ) {
           is_controllable = false;
         }
      }
    }

    // Determine client (Nuro) review results based on STQC QC results
    let nuro_findings: TaskTrackerRow["nuro_findings"] = "Accepted";
    let nuro_note = "Passed first review.";
    if (qcResult === "Reject") {
      nuro_findings = i % 3 === 0 ? "Rejected" : "Correction Required";
      nuro_note = `Requires correction in ${failureReason}. Pacing deviation logged.`;
    } else if (qcResult === "Borderline") {
      // 50% split on client acceptance of borderline items (this mimics drift and slip rates!)
      nuro_findings = i % 2 === 0 ? "Accepted" : "Correction Required";
      nuro_note = i % 2 === 0 ? "Client accepted borderline alignment." : "Failed on boundary test.";
    }

    data.push({
      imerit_task_id: `T-${2000 + i}`,
      request_id: `REQ-${100 + Math.ceil(i/5)}`,
      video_task_id: `VID-${9000 + i}`,
      batch_id: `BATCH-AV-0${Math.ceil(i/30)}`,
      driving_seq: sequences[i % sequences.length],
      location,
      simteacher_v2_labeler: labeler,
      v2_task_status: "Completed",
      v2_task_status_final: qcResult === "Pass" ? "Passed" : "Rejected",
      v2_start_date_ist: `2026-06-13T${Math.floor(i/4 + 8).toString().padStart(2, "0")}:${((i * 12) % 60).toString().padStart(2, "0")}:00`,
      v2_end_date_ist: "2026-06-13T16:00:00",
      v2_task_duration_seconds: actual_duration,
      expected_v2_duration_seconds: expected_duration,
      v2_cohort: cohort,
      v2_tl: tl,
      v2_error_category: qcResult === "Reject" ? "Precision Deficit" : "None",
      v2_error_type: qcResult === "Reject" ? failureReason : "None",
      qa_user_id: `qc_user_${(i % 12) + 1}`,
      selectQcResult: qcResult,
      qc_replay_link: `https://rec.av.imerit.net/qc-v-${2000 + i}/replay`,
      qc_confidence: i % 3 === 0 ? "Medium" : i % 5 === 0 ? "Low" : "High",
      failureReason,
      qcComment: qcResult === "Reject" 
        ? `Identified substantial deviation in ${failureReason} during active tracking.`
        : qcResult === "Borderline" 
          ? `Boundary looks slightly loose but within 5cm guideline.`
          : "Highly accurate alignments. Splines perfectly centered.",
      qc_task_duration_seconds: Math.round(actual_duration * 0.35),
      expected_qc_duration_seconds: Math.round(expected_duration * 0.35),
      stqc_cohort: stqc_cohorts[i % stqc_cohorts.length],
      stqc_tl: stqc_tls[i % stqc_tls.length],
      qc_error_category: (i % 11 === 0) 
        ? (qcResult === "Reject" ? "None" : "Precision Audit")
        : (qcResult === "Reject" ? "Precision Audit" : "None"),
      qc_error_type: (i % 11 === 0)
        ? (qcResult === "Reject" ? "None" : failureReason)
        : (qcResult === "Reject" ? failureReason : "None"),
      auditor: auditors[i % auditors.length],
      nuro_findings,
      nuro_note,
      nuro_review_date: `2026-06-${14 + (i%3)}`,
      is_controllable,
    });
  }
  return data;
};

export const COMPLETE_TASK_TRACKER_DATA = generateRemainingData();

const isSelectQcFail = (selectQcResult?: string): boolean => {
  const val = String(selectQcResult || "").trim().toLowerCase();
  return val === "fail" || val === "failed" || val === "reject" || val === "rejected";
};

const isQcErrorCategoryFail = (qcErrorCategory?: string, qcErrorCategoryAudit?: string, failureReason?: string): boolean => {
  const val = String(qcErrorCategory || qcErrorCategoryAudit || failureReason || "").trim().toLowerCase();
  return val === "fail" || val === "failed" || val === "reject" || val === "rejected";
};

// Analytical Helper utilities to feed charts and dashboards
export const getOperationalMetrics = (data: TaskTrackerRow[]) => {
  const total = data.length;
  if (total === 0) {
    return {
      totalTasks: 0,
      v2Accuracy: 0,
      qcAccuracy: 0,
      clientDefectRate: 0,
      clientDefectDropCount: 0,
      clientDefectDropRate: 0,
      v2EfficiencyIndex: 0,
      qcEfficiencyIndex: 0,
      controllablePct: 0,
      uncontrollablePct: 0,
      controllableCount: 0,
      uncontrollableCount: 0,
      averageV2Duration: 0,
      averageQcDuration: 0,
      expectedV2Duration: 0,
      expectedQcDuration: 0
    };
  }

  // 1. "v2's score will be generated based on selectQcResult(Col p)" using Option B
  // Option B: Accuracy = (Total Task submissions - Total selectQcResult Fails) / Total submissions * 100
  const v2FailsGlobal = data.filter(d => isSelectQcFail(d.selectQcResult)).length;
  const v2Accuracy = total > 0 ? ((total - v2FailsGlobal) / total) * 100 : 100;

  // 2. STQC QC Accuracy is generated from QC ERROR CATEGORY_Based on audit fail counts.
  // Accuracy = (Total Tasks - QC Fail Count) / Total Tasks * 100
  const qcFailsGlobal = data.filter(d => isQcErrorCategoryFail(d.qc_error_category, d.qc_error_category_audit, d.failureReason)).length;
  const qcAccuracy = total > 0 ? ((total - qcFailsGlobal) / total) * 100 : 100;

  // 3. CLIENT DEFECT DROP: based on QC ERROR CATEGORY_Based on audit being clean ("none") but Nuro Findings being a reject
  const clientDefectDropCount = data.filter(d => {
    const auditClean = !d.qc_error_category || String(d.qc_error_category).trim().toLowerCase() === "none" || String(d.qc_error_category).trim().toLowerCase() === "";
    const nuroRejected = d.nuro_findings && (String(d.nuro_findings).toLowerCase() === "rejected" || String(d.nuro_findings).toLowerCase() === "correction required");
    return auditClean && nuroRejected;
  }).length;
  const clientDefectDropRate = (clientDefectDropCount / total) * 100;

  // Normal client defect rate (SLA rejections percentage)
  const clientRejects = data.filter(d => String(d.nuro_findings).toLowerCase() === "rejected").length;
  const clientDefectRate = (clientRejects / total) * 100;

  // Average actual vs expected durations (Efficiency Ratio Index)
  const totalV2Actual = data.reduce((acc, d) => acc + d.v2_task_duration_seconds, 0);
  const totalV2Expected = data.reduce((acc, d) => acc + d.expected_v2_duration_seconds, 0);
  const v2EfficiencyIndex = (totalV2Actual / (totalV2Expected || 1)) * 100;

  // Average QC actual vs expected
  const totalQcActual = data.reduce((acc, d) => acc + d.qc_task_duration_seconds, 0);
  const totalQcExpected = data.reduce((acc, d) => acc + d.expected_qc_duration_seconds, 0);
  const qcEfficiencyIndex = (totalQcActual / (totalQcExpected || 1)) * 100;

  // Controllable vs Uncontrollable Errors ratio for V2
  const v2Errors = data.filter(d => d.v2_error_type !== "None" && d.v2_error_type !== "");
  const v2ControllableCount = v2Errors.filter(d => isControllable(d.v2_error_type)).length;
  const v2UncontrollableCount = v2Errors.filter(d => !isControllable(d.v2_error_type)).length;
  const v2ControllablePct = v2Errors.length ? (v2ControllableCount / v2Errors.length) * 100 : 0;
  const v2UncontrollablePct = v2Errors.length ? (v2UncontrollableCount / v2Errors.length) * 100 : 0;

  // Controllable vs Uncontrollable Errors ratio for STQC
  const stqcErrors = data.filter(d => {
    const et = String(d.qc_error_type || "").trim().toLowerCase();
    return et !== "none" && et !== "";
  });
  const stqcControllableCount = stqcErrors.filter(d => isControllable(d.qc_error_type)).length;
  const stqcUncontrollableCount = stqcErrors.filter(d => !isControllable(d.qc_error_type)).length;
  const stqcControllablePct = stqcErrors.length ? (stqcControllableCount / stqcErrors.length) * 100 : 0;
  const stqcUncontrollablePct = stqcErrors.length ? (stqcUncontrollableCount / stqcErrors.length) * 100 : 0;

  return {
    totalTasks: total,
    v2Accuracy,
    qcAccuracy,
    clientDefectRate,
    clientDefectDropCount,
    clientDefectDropRate,
    v2EfficiencyIndex,
    qcEfficiencyIndex,
    v2ControllablePct,
    v2UncontrollablePct,
    v2ControllableCount,
    v2UncontrollableCount,
    stqcControllablePct,
    stqcUncontrollablePct,
    stqcControllableCount,
    stqcUncontrollableCount,
    averageV2Duration: totalV2Actual / total,
    expectedV2Duration: totalV2Expected / total,
    averageQcDuration: totalQcActual / total,
    expectedQcDuration: totalQcExpected / total
  };
};

const isControllable = (errorType: string): boolean => {
  return !errorType.toLowerCase().includes("uncontrollable");
};

// Groups dataset metrics by Location
export const getMetricsByLocation = (data: TaskTrackerRow[]) => {
  const grouped: Record<string, { 
    total: number; 
    v2_fails: number; 
    qc_fails: number;
    qc_audited_count: number; 
    expected: number; 
    actual: number; 
    defects: number;
    v2_total_duration: number;
    qc_total_duration: number;
  }> = {};
  
  data.forEach(d => {
    const locValue = d.location ? String(d.location).trim() : "";
    if (locValue === "" || locValue.toLowerCase() === "null" || locValue === "-" || locValue.toLowerCase() === "undefined" || locValue.toLowerCase() === "unassigned") return;
    
    if (!grouped[locValue]) {
      grouped[locValue] = { 
        total: 0, v2_fails: 0, qc_fails: 0, qc_audited_count: 0, expected: 0, actual: 0, defects: 0, v2_total_duration: 0, qc_total_duration: 0
      };
    }
    const bucket = grouped[locValue];
    bucket.total++;
    bucket.v2_total_duration += (d.v2_task_duration_seconds || 0);
    
    if (isSelectQcFail(d.selectQcResult)) {
      bucket.v2_fails++;
    }
    
    const idKey = d.qa_user_id ? String(d.qa_user_id).trim().toLowerCase() : "";
    const isValidAuditor = idKey !== "" && idKey !== "unknown_auditor" && idKey !== "n/a" && idKey !== "null" && idKey !== "unassigned" && idKey !== "-";
    
    if (isValidAuditor) {
      bucket.qc_audited_count++;
      bucket.qc_total_duration += (d.qc_task_duration_seconds || 0);
      if (isQcErrorCategoryFail(d.qc_error_category, d.qc_error_category_audit, d.failureReason)) {
        bucket.qc_fails++;
      }
    }
    
    bucket.expected += (d.expected_v2_duration_seconds || 0);
    bucket.actual += (d.v2_task_duration_seconds || 0);
    
    const findings = d.nuro_findings ? String(d.nuro_findings).toLowerCase() : "";
    if (findings === "rejected" || findings.includes("defect")) {
      bucket.defects++;
    }
  });

  return Object.keys(grouped).map(key => ({
    location: key,
    total: grouped[key].total,
    v2Accuracy: grouped[key].total > 0 ? Number(((grouped[key].total - grouped[key].v2_fails) / grouped[key].total * 100).toFixed(2)) : 100,
    qcAccuracy: grouped[key].total > 0 ? Number(((grouped[key].total - grouped[key].qc_fails) / grouped[key].total * 100).toFixed(2)) : 100,
    efficiency: grouped[key].expected > 0 ? Number(((grouped[key].actual / grouped[key].expected) * 100).toFixed(1)) : 100,
    nuroDefectRate: grouped[key].total > 0 ? Number(((grouped[key].defects / grouped[key].total) * 100).toFixed(2)) : 0,
    v2AvgDuration: grouped[key].total > 0 ? Math.round(grouped[key].v2_total_duration / grouped[key].total) : 0,
    qcAvgDuration: grouped[key].qc_audited_count > 0 ? Math.round(grouped[key].qc_total_duration / grouped[key].qc_audited_count) : 0
  }));
};

// Groups dataset metrics by Cohort
export const getMetricsByCohort = (data: TaskTrackerRow[], cohortField: 'v2_cohort' | 'stqc_cohort' = 'v2_cohort') => {
  const grouped: Record<string, { total: number; v2_fails: number; qc_fails: number; qc_audited_count: number; expected: number; actual: number; defects: number }> = {};
  
  data.forEach(d => {
    const cohortKey = d[cohortField] || (cohortField === 'v2_cohort' ? "V2 - Cohort 1" : "STQC - Cohort 1");
    if (!grouped[cohortKey]) {
      grouped[cohortKey] = { total: 0, v2_fails: 0, qc_fails: 0, qc_audited_count: 0, expected: 0, actual: 0, defects: 0 };
    }
    grouped[cohortKey].total++;
    
    if (isSelectQcFail(d.selectQcResult)) {
      grouped[cohortKey].v2_fails++;
    }
    
    const idKey = d.qa_user_id ? String(d.qa_user_id).trim().toLowerCase() : "";
    const isValidAuditor = idKey !== "" && idKey !== "unknown_auditor" && idKey !== "n/a" && idKey !== "null" && idKey !== "unassigned";
    
    if (isValidAuditor) {
      grouped[cohortKey].qc_audited_count++;
      if (isQcErrorCategoryFail(d.qc_error_category, d.qc_error_category_audit, d.failureReason)) {
        grouped[cohortKey].qc_fails++;
      }
    }
    
    grouped[cohortKey].expected += d.expected_v2_duration_seconds;
    grouped[cohortKey].actual += d.v2_task_duration_seconds;
    if (d.nuro_findings === "Rejected") grouped[cohortKey].defects++;
  });

  return Object.keys(grouped).map(key => ({
    cohort: key,
    total: grouped[key].total,
    v2Accuracy: grouped[key].total > 0 ? ((grouped[key].total - grouped[key].v2_fails) / grouped[key].total) * 100 : 100,
    qcAccuracy: grouped[key].total > 0 ? ((grouped[key].total - grouped[key].qc_fails) / grouped[key].total) * 100 : 100,
    efficiency: (grouped[key].expected > 0) ? (grouped[key].expected / grouped[key].actual) * 100 : 100,
    nuroDefectRate: grouped[key].total > 0 ? (grouped[key].defects / grouped[key].total) * 100 : 0
  })).sort((a, b) => a.cohort.localeCompare(b.cohort));
};

// Groups metrics by Team Lead
export const getMetricsByTeamLead = (data: TaskTrackerRow[]) => {
  const grouped: Record<string, { total: number; v2_fails: number; qc_fails: number; qc_audited_count: number; expected: number; actual: number }> = {};
  
  data.forEach(d => {
    const tlKey = d.v2_tl || "V2_Default_TL";
    if (!grouped[tlKey]) {
      grouped[tlKey] = { total: 0, v2_fails: 0, qc_fails: 0, qc_audited_count: 0, expected: 0, actual: 0 };
    }
    grouped[tlKey].total++;
    
    if (isSelectQcFail(d.selectQcResult)) {
      grouped[tlKey].v2_fails++;
    }
    
    const idKey = d.qa_user_id ? String(d.qa_user_id).trim().toLowerCase() : "";
    const isValidAuditor = idKey !== "" && idKey !== "unknown_auditor" && idKey !== "n/a" && idKey !== "null" && idKey !== "unassigned";
    
    if (isValidAuditor) {
      grouped[tlKey].qc_audited_count++;
      if (isQcErrorCategoryFail(d.qc_error_category, d.qc_error_category_audit, d.failureReason)) {
        grouped[tlKey].qc_fails++;
      }
    }
    
    grouped[tlKey].expected += d.expected_v2_duration_seconds;
    grouped[tlKey].actual += d.v2_task_duration_seconds;
  });

  return Object.keys(grouped).map(key => ({
    tl: key,
    total: grouped[key].total,
    v2Accuracy: grouped[key].total > 0 ? ((grouped[key].total - grouped[key].v2_fails) / grouped[key].total) * 100 : 100,
    qcAccuracy: grouped[key].total > 0 ? ((grouped[key].total - grouped[key].qc_fails) / grouped[key].total) * 100 : 100,
    efficiency: (grouped[key].actual / grouped[key].expected) * 100
  }));
};

// Gets details of failureReasons distribution
export const getFailureReasonsDistribution = (data: TaskTrackerRow[]) => {
  const distribution: Record<string, { controllable: number; uncontrollable: number }> = {};
  
  data.filter(d => {
    const et = String(d.v2_error_type || "").trim().toLowerCase();
    const fr = String(d.failureReason || "").trim().toLowerCase();
    const isValidError = et !== "none" && et !== "";
    return fr !== "none" && fr !== "" && isValidError;
  }).forEach(d => {
    if (!distribution[d.failureReason]) {
      distribution[d.failureReason] = { controllable: 0, uncontrollable: 0 };
    }
    if (isControllable(d.v2_error_type)) {
        distribution[d.failureReason].controllable++;
    } else {
        distribution[d.failureReason].uncontrollable++;
    }
  });

  return Object.keys(distribution).map(key => ({
    reason: key,
    controllable: distribution[key].controllable,
    uncontrollable: distribution[key].uncontrollable,
    total: distribution[key].controllable + distribution[key].uncontrollable
  })).sort((a,b) => b.total - a.total);
};

export const getStqcFailureReasonsDistribution = (data: TaskTrackerRow[]) => {
  const distribution: Record<string, { controllable: number; uncontrollable: number }> = {};
  
  data.filter(d => {
    const idKey = d.qa_user_id ? String(d.qa_user_id).trim().toLowerCase() : "";
    const isValidAuditor = idKey !== "" && idKey !== "unknown_auditor" && idKey !== "n/a" && idKey !== "null" && idKey !== "unassigned";
    const et = String(d.qc_error_type || "").trim().toLowerCase();
    const fr = String(d.failureReason || "").trim().toLowerCase();
    const isValidError = et !== "none" && et !== "";
    return isValidAuditor && fr !== "none" && fr !== "" && isValidError;
  }).forEach(d => {
    if (!distribution[d.failureReason]) {
      distribution[d.failureReason] = { controllable: 0, uncontrollable: 0 };
    }
    if (isControllable(d.qc_error_type)) {
        distribution[d.failureReason].controllable++;
    } else {
        distribution[d.failureReason].uncontrollable++;
    }
  });

  return Object.keys(distribution).map(key => ({
    reason: key,
    controllable: distribution[key].controllable,
    uncontrollable: distribution[key].uncontrollable,
    total: distribution[key].controllable + distribution[key].uncontrollable
  })).sort((a,b) => b.total - a.total);
};

// Gets performance details by Contributor (V2 Labeler)
export const getLabelerPerformanceSummary = (data: TaskTrackerRow[]) => {
  const summary: Record<string, { total: number; v2_fails: number; actual: number; expected: number; cohort: string; tl: string; durationsList: number[]; nuro_defects: number; controllableCount: number; uncontrollableCount: number }> = {};
  
  data.forEach(d => {
    const key = d.simteacher_v2_labeler ? String(d.simteacher_v2_labeler).trim() : "";
    // Ignore empty, unassigned, or dummy values to prevent inflation of headcount metrics
    if (!key || key.toLowerCase() === "unknown_labeler" || key.toLowerCase() === "n/a" || key.toLowerCase() === "null" || key.toLowerCase() === "unassigned" || key === "") {
      return;
    }
    if (!summary[key]) {
      summary[key] = {
        total: 0,
        v2_fails: 0,
        actual: 0,
        expected: 0,
        cohort: d.v2_cohort || "V2_Default_Cohort",
        tl: d.v2_tl || "V2_Default_TL",
        durationsList: [],
        nuro_defects: 0,
        controllableCount: 0,
        uncontrollableCount: 0
      };
    }
    summary[key].total++;
    
    // Aligned with the requested Option B rule
    if (isSelectQcFail(d.selectQcResult)) {
      summary[key].v2_fails++;
      const et = String(d.v2_error_type || "").trim().toLowerCase();
      const fr = String(d.failureReason || "").trim().toLowerCase();
      
      // Only count if classified to match pivot table "Grand Total" behavior
      if (et !== "none" && et !== "" && fr !== "none" && fr !== "") {
        if (isControllable(d.v2_error_type || d.failureReason || "")) {
          summary[key].controllableCount++;
        } else {
          summary[key].uncontrollableCount++;
        }
      }
    }

    summary[key].actual += d.v2_task_duration_seconds;
    summary[key].expected += d.expected_v2_duration_seconds;
    summary[key].durationsList.push(d.v2_task_duration_seconds);
    if (d.nuro_findings === "Rejected") summary[key].nuro_defects++;
  });

  return Object.keys(summary).map(key => {
    const list = summary[key].durationsList;
    const avg = list.reduce((a,b) => a+b, 0) / list.length;
    const variance = list.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / list.length;
    const stdDev = Math.sqrt(variance);

    const totalTasks = summary[key].total;
    const v2Fails = summary[key].v2_fails;
    const v2Accuracy = totalTasks > 0 ? ((totalTasks - v2Fails) / totalTasks) * 100 : 100;
    
    // Explicitly calculate denominator based on classified types to match spreadsheet images (Count / Grand Total of Pivot)
    const classifiedTotal = summary[key].controllableCount + summary[key].uncontrollableCount;

    return {
      labelerId: key,
      total: totalTasks,
      cohort: summary[key].cohort,
      tl: summary[key].tl,
      v2Accuracy: v2Accuracy,
      qcAccuracy: 100, // Kept for safety
      efficiencyIndex: (summary[key].actual / summary[key].expected) * 100,
      nuroDefects: summary[key].nuro_defects,
      durationStdDev: stdDev,
      avgDuration: avg,
      controllablePct: classifiedTotal > 0 ? (summary[key].controllableCount / classifiedTotal) * 100 : 0,
      uncontrollablePct: classifiedTotal > 0 ? (summary[key].uncontrollableCount / classifiedTotal) * 100 : 0
    };
  });
};

// Gets performance details by STQC QC Auditor
export const getQcAuditorPerformanceSummary = (data: TaskTrackerRow[]) => {
  const summary: Record<string, { total: number; qc_fails: number; actual: number; expected: number; cohort: string; tl: string; durationsList: number[]; nuro_defects: number; controllableCount: number; uncontrollableCount: number }> = {};
  
  data.forEach(d => {
    const key = d.qa_user_id ? String(d.qa_user_id).trim() : "";
    // Ignore empty, unassigned, or dummy values to prevent inflation of headcount metrics
    if (!key || key.toLowerCase() === "unknown_auditor" || key.toLowerCase() === "n/a" || key.toLowerCase() === "null" || key.toLowerCase() === "unassigned" || key === "") {
      return;
    }

    if (!summary[key]) {
      summary[key] = {
        total: 0,
        qc_fails: 0,
        actual: 0,
        expected: 0,
        cohort: d.stqc_cohort || "STQC_Default_Cohort",
        tl: d.stqc_tl || "STQC_Default_TL",
        durationsList: [],
        nuro_defects: 0,
        controllableCount: 0,
        uncontrollableCount: 0
      };
    }
    summary[key].total++;
    
    if (isQcErrorCategoryFail(d.qc_error_category, d.qc_error_category_audit, d.failureReason)) {
      summary[key].qc_fails++;
      const stqc_et = String(d.qc_error_type || "").trim().toLowerCase();
      const fr = String(d.failureReason || "").trim().toLowerCase();

      // Only count if classified to match pivot table "Grand Total" behavior
      if (stqc_et !== "none" && stqc_et !== "" && fr !== "none" && fr !== "") {
        if (isControllable(d.qc_error_type || d.failureReason || "")) {
          summary[key].controllableCount++;
        } else {
          summary[key].uncontrollableCount++;
        }
      }
    }

    summary[key].actual += d.qc_task_duration_seconds || 0;
    summary[key].expected += d.expected_qc_duration_seconds || d.expected_v2_duration_seconds || 0;
    summary[key].durationsList.push(d.qc_task_duration_seconds || 0);
    if (d.nuro_findings === "Rejected") summary[key].nuro_defects++;
  });

  return Object.keys(summary).map(key => {
    const list = summary[key].durationsList;
    const avg = list.length ? (list.reduce((a,b) => a+b, 0) / list.length) : 0;
    const variance = list.length ? (list.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / list.length) : 0;
    const stdDev = Math.sqrt(variance);

    const total = summary[key].total;
    const qcAccuracy = total > 0 ? ((total - summary[key].qc_fails) / total) * 100 : 100;
    
    // Explicitly calculate denominator based on classified types to match spreadsheet images (Count / Grand Total of Pivot)
    const classifiedTotal = summary[key].controllableCount + summary[key].uncontrollableCount;

    return {
      auditorId: key,
      total: total,
      cohort: summary[key].cohort,
      tl: summary[key].tl,
      v2Accuracy: 100, // Kept for safety
      qcAccuracy: qcAccuracy,
      efficiencyIndex: (summary[key].actual / (summary[key].expected || 1)) * 100,
      nuroDefects: summary[key].nuro_defects,
      durationStdDev: stdDev,
      avgDuration: avg,
      controllablePct: classifiedTotal > 0 ? (summary[key].controllableCount / classifiedTotal) * 100 : 0,
      uncontrollablePct: classifiedTotal > 0 ? (summary[key].uncontrollableCount / classifiedTotal) * 100 : 0
    };
  });
};
