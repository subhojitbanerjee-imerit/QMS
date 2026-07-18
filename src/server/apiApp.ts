/**
 * Pure Express API app for Vercel + local dev.
 * Intentionally does NOT import Vite or serve the SPA — that lives only in server.ts
 * so the Vercel serverless bundle stays small and does not crash on cold start.
 */
import express from "express";
import {
  fetchTaskTrackerValues,
  getBigQueryConfig,
  toErrorMessage,
  type TaskTrackerQueryResult
} from "./bigqueryTaskTracker";

const app = express();
const apiRouter = express.Router();
const TASK_TRACKER_CACHE_TTL_MS = 5 * 60 * 1000;

app.use(express.json({ limit: "1mb" }));

/**
 * Vercel rewrites `/api/*` → `/api`. Depending on runtime version, Express may only
 * see `/api` as the URL. Restore the original path when Vercel provides it.
 */
app.use((req, _res, next) => {
  const headerPath =
    firstHeader(req.headers["x-forwarded-uri"])
    || firstHeader(req.headers["x-invoke-path"])
    || firstHeader(req.headers["x-vercel-forwarded-path"]);

  if (headerPath && headerPath.startsWith("/api")) {
    const queryIndex = req.url.indexOf("?");
    const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
    const pathOnly = headerPath.split("?")[0];
    req.url = pathOnly + query;
  }
  next();
});

function firstHeader(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() ? raw.trim() : null;
}

let taskTrackerValuesCache: TaskTrackerQueryResult | null = null;
let taskTrackerValuesRequest: Promise<TaskTrackerQueryResult> | null = null;

// Lightweight readiness probe — does not call BigQuery.
apiRouter.get("/health", (_req, res) => {
  const config = getBigQueryConfig();
  const missing: string[] = [];
  if (!config.projectId) missing.push("GOOGLE_CLOUD_PROJECT_ID");
  if (!config.hasServiceAccount) missing.push("GOOGLE_SERVICE_ACCOUNT_JSON");

  res.status(missing.length ? 503 : 200).json({
    ok: missing.length === 0,
    missing,
    runtime: "apiApp",
    bigquery: {
      projectId: config.projectId || null,
      datasetId: config.datasetId,
      tableId: config.tableId,
      location: config.location,
      hasServiceAccount: config.hasServiceAccount,
      client: "rest+jwt"
    },
    message: missing.length
      ? `BigQuery is not configured. Missing: ${missing.join(", ")}`
      : "BigQuery environment looks configured."
  });
});

apiRouter.get("/sheets/task-tracker-cache", async (_req, res) => {
  try {
    const config = getBigQueryConfig();
    if (!config.projectId || !config.hasServiceAccount) {
      const missing = [
        !config.projectId ? "GOOGLE_CLOUD_PROJECT_ID" : null,
        !config.hasServiceAccount ? "GOOGLE_SERVICE_ACCOUNT_JSON" : null
      ].filter(Boolean);
      return res.status(503).json({
        error: `BigQuery is not configured on the server. Missing env: ${missing.join(", ")}. Set these in Vercel Project Settings → Environment Variables, then redeploy.`,
        missing,
        bigquery: {
          datasetId: config.datasetId,
          tableId: config.tableId,
          location: config.location
        }
      });
    }

    if (taskTrackerValuesCache && Date.now() - taskTrackerValuesCache.fetchedAt < TASK_TRACKER_CACHE_TTL_MS) {
      return res.json({
        values: taskTrackerValuesCache.values,
        cached: true,
        cachedAt: taskTrackerValuesCache.fetchedAt
      });
    }

    if (!taskTrackerValuesRequest) {
      taskTrackerValuesRequest = fetchTaskTrackerValues()
        .then((result) => {
          taskTrackerValuesCache = result;
          return result;
        })
        .finally(() => {
          taskTrackerValuesRequest = null;
        });
    }

    const result = await taskTrackerValuesRequest;
    res.json({
      values: result.values,
      cached: false,
      cachedAt: result.fetchedAt,
      rowCount: Math.max(0, result.values.length - 1)
    });
  } catch (error: unknown) {
    const message = toErrorMessage(error, "Unable to load Task Tracker data from BigQuery.");
    console.error("BigQuery Task Tracker fetch failed:", message);
    res.status(500).json({
      error: message,
      details: message
    });
  }
});

// Gemini is optional — lazy-load so missing/broken keys never crash cold start.
type GenAiClient = {
  models: {
    generateContent: (args: {
      model: string;
      contents: string;
      config?: Record<string, unknown>;
    }) => Promise<{ text?: string }>;
  };
};

let aiClientPromise: Promise<GenAiClient | null> | null = null;

async function getAiClient(): Promise<GenAiClient | null> {
  if (!aiClientPromise) {
    aiClientPromise = (async () => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        return null;
      }
      try {
        const { GoogleGenAI } = await import("@google/genai");
        return new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        }) as unknown as GenAiClient;
      } catch (error) {
        console.error("Failed to initialize Gemini client:", toErrorMessage(error));
        return null;
      }
    })();
  }
  return aiClientPromise;
}

// 1. Root Cause Analysis endpoint
apiRouter.post("/gemini/rca", async (req, res) => {
  const { errorCategory, cohort, tl, location, details } = req.body || {};
  const ai = await getAiClient();

  if (!ai) {
    return res.json({
      success: true,
      mode: "simulation",
      analysis: `### 🛠️ AI Root Cause Analysis (AV QMS Engine)
**Focus Area:** ${errorCategory || "All Categories"}
**Cohort / Team:** ${cohort || "All"} (Lead: ${tl || "Unassigned Lead"})
**Location Coordinate:** ${location || "Global Centers"}

**1. Quantitative Overview & Signal Strengths:**
- Average Deviances: V2 labelers working under **${tl || "Team Lead"}** on ${errorCategory || "General Errors"} exhibit an average efficiency ratio deviation of **+14.8%** above baseline, suggesting active rushing/pacing issues.
- Precision Concentration: **84% of errors** are concentrated in boundary boxes at distances exceeding **45 meters** under challenging lighting conditions (SF Night/Sunset sequences).

**2. Identified Systemic Root Causes:**
- **Knowledge Asymmetry**: Incomplete understanding of standard occlusion rules for bounding boxes (e.g., when a vehicle passes behind a light pole-whether to keep a single box or split is misunderstood in **${cohort || "Cohort"}**).
- **Tool / Interface Friction**: Labelers struggle with manual tracking adjustments on 10Hz sequence replay speeds. They are cutting corners by manually interpolating instead of keyframing precisely.
- **Productivity vs Quality Stress**: Squeeze on V2 timeline limits has resulted in quality drift.

**3. Recommended Corrective & Preventive Action (CAPA):**
- **Action 1 (Immediate)**: Launch a 30-minute calibration huddle for **${cohort || "Cohort"}** on Far-Range Occlusion boundary definitions.
- **Action 2 (Tooling)**: Enable 5Hz playback option in labeled sequencing profiles to decrease manual interpolation slips.
- **Action 3 (Review Governance)**: Enforce a temporary 100% STQC review gate with Lead **${tl || "Reviewer"}** on the next 3 batches for validation.`
    });
  }

  try {
    const prompt = `You are a Principal Quality Management System (QMS) Architect and Root Cause Specialist for autonomous vehicle dataset labeling.
Deliver a rigorous, professional, and detailed Root Cause Analysis (RCA) report in Markdown.
Target Context:
- Main Error Category / failureReason: ${errorCategory || "Unspecified"}
- Targeted Cohort: ${cohort || "General Cohort"}
- Team Lead: ${tl || "General TL"}
- Location Coordinate: ${location || "General Location"}
- Sub-details & Context: ${JSON.stringify(details || {})}

Provide:
1. QUANTITATIVE & QUALITATIVE ROOT CAUSES: Identify why this specific error is occurring in this cohort, under this Team Lead, at this location. (Relate calibration training, tool ergonomics, timeline stress, and expected vs actual duration discrepancies).
2. CONTROLLABLE VS UNCONTROLLABLE FACTORING: Differentiate between structural labeling bugs (controllable) versus client-side sequence noise or extreme sensor occlusions (uncontrollable).
3. ACTIONABLE CAPA PLAN (Corrective and Preventive Action): Specifying distinct tasks, expected metrics, and audit checkpoints.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert autonomous vehicle labeling operations QMS lead. Keep your response structured, deep, analytical, written in objective professional domain style, utilizing formal markdown with no self-congratulatory notes or chat filler.",
        temperature: 0.7
      }
    });

    res.json({
      success: true,
      mode: "live",
      analysis: response.text
    });
  } catch (err: unknown) {
    console.error("Gemini RCA generation error:", err);
    res.status(500).json({ error: toErrorMessage(err, "Failed to generate RCA analysis.") });
  }
});

// 2. Draft Coaching Plan endpoint
apiRouter.post("/gemini/coaching", async (req, res) => {
  const { labelerId, errorType, accuracy, expectedDuration, actualDuration, cohort, tl } = req.body || {};
  const ai = await getAiClient();

  if (!ai) {
    return res.json({
      success: true,
      mode: "simulation",
      plan: `### 📋 Professional Performance Coaching Plan
**Beneficiary Contributor:** ${labelerId || "AV Labeler"}
**Cohort/Team:** ${cohort || "Cohort-1"} (Supervisor: ${tl || "Team Lead"})
**Main Skill Area:** ${errorType || "Boundary Precision & Attribute Tagging"}

**1. Current Performance Baseline & Analytics:**
- **V2 Labeling Accuracy:** ${((Number(accuracy) || 0) * 100).toFixed(1)}% (Performance Benchmark Target: ≥98.5%)
- **Productivity Deviation:** Expected: ${expectedDuration} sec | Actual: ${actualDuration} sec (Efficiency Index: ${((Number(expectedDuration) / (Number(actualDuration) || 1)) * 100).toFixed(0)}%)
- **Operational Pacing:** The labeler is completing work **${Number(actualDuration) < Number(expectedDuration) ? "faster than normal" : "slower than normal"}**, resulting in a high percentage of ${errorType || "boundary-related errors"}.

**2. Standardized SMART Retraining Goals:**
- **Specific**: Review standard rulebooks on attribute annotation and achieve zero major attribute omissions.
- **Measurable**: Increase V2 pass rate in daily audits to ≥98.2% within the next 5 working days.
- **Achievable**: Readjust task pacing to stay within the recommended 10% tolerance zone of expected durations. No rushing.
- **Relevant**: Align with the newly released Client Calibration guide (Doc-V5.4) on intersection annotations.
- **Time-bound**: Accomplish 5 consecutive 'Pass' reviews by QC Team under Lead reviewer's supervision.

**3. Direct Actionable Milestones:**
- **Phase A (Milestone 1, Days 1-2)**: Retro audit session of 15 failed tasks. Document the mismatch in pixel alignments under Mentor supervision.
- **Phase B (Milestone 2, Days 3-4)**: Calibration task simulation. Labeler works on 3 pre-rated training loops with immediate feedback loops.
- **Phase C (Milestone 3, Day 5)**: Live batch tracking. Team Lead performs live shadowing for the first 3 tasks of the morning sprint.`
    });
  }

  try {
    const prompt = `You are a Senior Technical Operations Trainer and Performance Coach for autonomous vehicle labeling.
Construct a highly professional, comprehensive performance coaching plan in Markdown for:
- Contributor / Labeler ID: ${labelerId || "Labeler"}
- Skill Gap focus: ${errorType || "General Accuracy"}
- Accuracy Baseline: ${((Number(accuracy) || 0) * 100).toFixed(1)}%
- Expected Task Duration: ${expectedDuration} sec
- Actual Task Duration: ${actualDuration} sec
- Cohort: ${cohort || "Unspecified"}
- Supervisor: ${tl || "Unspecified"}

Format as:
1. PERFORMANCE DIAGNOSIS: Analyze the data. Comment on whether their current actual duration vs expected suggests extreme rushing, fatigue, or cognitive overload.
2. DRAFT SMART GOALS (Specific, Measurable, Actionable, Relevant, Timebound): Directly targeting the error type and accuracy improvement.
3. 5-DAY ACTION PLAN AND MILESTONES: Detail what the contributor, team lead, and quality auditor must do day-by-day.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional performance team trainer. Keep the style formal, direct, constructive, and highly prescriptive with clear checkpoints, using professional markdown format.",
        temperature: 0.6
      }
    });

    res.json({
      success: true,
      mode: "live",
      plan: response.text
    });
  } catch (err: unknown) {
    console.error("Gemini Coaching generation error:", err);
    res.status(500).json({ error: toErrorMessage(err, "Failed to generate coaching plan.") });
  }
});

// 3. Quality Drift Predictor and Alert Analyzer
apiRouter.post("/gemini/drift", async (req, res) => {
  const { location, cohort, v2Accuracy, qcAccuracy, nuroDefects, failureReasons, actualVsExpected } = req.body || {};
  const ai = await getAiClient();

  if (!ai) {
    return res.json({
      success: true,
      mode: "simulation",
      analysis: `### 🚨 AI Quality Drift & Preventative Report
**Entity Target:** Location: ${location || "All"} | Cohort: ${cohort || "All"}

**1. Trend Analysis & Statistical Signal:**
- **System Drift Detected**: Inter-layer accuracy gap. V2 (First-Pass) accuracy is at **${((Number(v2Accuracy) || 0) * 100).toFixed(1)}%** while STQC QC accuracy has declined to **${((Number(qcAccuracy) || 0) * 100).toFixed(1)}%**.
- **Client Slip Rate**: Nuro (Client Layer) defect findings are tracking at **${((Number(nuroDefects) || 0) * 100).toFixed(1)}%** (Benchmark Ceiling: <2.0%). This represents a significant drift from SLA standards.
- **Dominant Drift Vector**: Primarily driven by automated rejections in "${failureReasons && failureReasons[0] ? failureReasons[0] : "Bounding Box Misalignment"}" cases.
- **Productivity Deviation Scale**: Average V2 speed vs expected is tracking with severe imbalances.

**2. Predicted Quality Risks (Next 7 Days):**
- **SLA Breach Danger**: High probability of Client Block-Reject on incoming BATCH-AV-03 series if immediate threshold blockouts are not set.
- **Downstream Auditor Fatigue**: Rejections will stack, overwhelming STQC reviewers and causing QC backlog queuing.

**3. Strategic Recommendations:**
- Run dynamic calibration rounds today. Let all labelers on this vector solve specialized calibration tasks.
- Shift QC sampling frequency on ${cohort || "this cohort"} from standard 10% to 50% for the next 48 hours.
- Hold high-risk sequences from live delivery to Nuro until a 20-percent sample pre-audit is passed.`
    });
  }

  try {
    const prompt = `You are a Lead Operations Auditor and Statistical Quality Risk Specialist in Autonomous Vehicle validation.
Analyze the following operational metrics for Quality Drift and SLA Risk predictions:
- Targeted Cohort: ${cohort || "All Cohorts"}
- Geographic Site: ${location || "All Locations"}
- First-Pass V2 General Accuracy: ${((Number(v2Accuracy) || 0) * 100).toFixed(2)}%
- STQC QC Accuracy Rate: ${((Number(qcAccuracy) || 0) * 100).toFixed(2)}%
- Nuro Client layer Defect findings Rate: ${((Number(nuroDefects) || 0) * 100).toFixed(2)}% (Note: high nuro findings rate indicates poor quality getting past QC)
- Major Error Types Registered: ${JSON.stringify(failureReasons || [])}
- Productivity Pacing Variance: ${actualVsExpected}

Deliver a highly professional Predictive Drift report in Markdown:
1. INTER-LAYER DRIFT ANALYSIS: Diagnose why defects are slipping past QC to the client layer (STQC QC vs Nuro findings gap).
2. RISK HORIZON PREDICTION: Predict SLA impacts, batch rejections, and overall operational safety.
3. PREVENTATIVE CONTAINMENT PROTOCOLS: Provide immediately executable mitigation protocols (e.g., sample changes, calibration blockades).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a quantitative AV Operations Quality Specialist. Structure your response with meticulous, metric-driven, professional, and clear markdown with distinct hazard headers.",
        temperature: 0.7
      }
    });

    res.json({
      success: true,
      mode: "live",
      analysis: response.text
    });
  } catch (err: unknown) {
    console.error("Gemini Drift prediction error:", err);
    res.status(500).json({ error: toErrorMessage(err, "Failed to analyze quality drift.") });
  }
});

// 4. Certification Eligibility Checker endpoint
apiRouter.post("/gemini/certify", async (req, res) => {
  const { labelerId, stats } = req.body || {};
  const ai = await getAiClient();

  if (!ai) {
    const eligible =
      stats?.accuracy >= 0.98
      && stats?.uncontrollableRate < 0.05
      && stats?.efficiencyIndex >= 85
      && stats?.efficiencyIndex <= 115;
    return res.json({
      success: true,
      mode: "simulation",
      eligible,
      recommendation: `### 🎓 AV Labeler Certification Eligibility Audit
**Candidate Account:** \`${labelerId}\`
**Cohort Guild:** ${stats?.cohort || "Cohort Alpha"} | **Team Lead:** ${stats?.tl || "TL"}

**1. Metric Scorecard vs Audit Thresholds:**
- **Accuracy Grade**: ${((Number(stats?.accuracy) || 0) * 100).toFixed(1)}% vs Threshold **≥98.0%** (${stats?.accuracy >= 0.98 ? "✅ PASS" : "❌ FAIL"})
- **Pacing Standard Deviation**: ${Number(stats?.durationStdDev || 0).toFixed(0)} sec (${Number(stats?.durationStdDev || 0) <= 200 ? "✅ STABLE" : "⚠️ HIGH FLUCTUATIONS"})
- **Pacing Index (Speed vs Expected)**: ${Number(stats?.efficiencyIndex || 0).toFixed(0)}% vs Target **80% - 120%** (${stats?.efficiencyIndex >= 80 && stats?.efficiencyIndex <= 120 ? "✅ MATCH" : "❌ OUTSIDE LIMITS"})
- **QC Auditor Review Confidence**: ${stats?.confidence || "High"} vs Target **High** (${stats?.confidence === "High" ? "✅ PASS" : "⚠️ IMPROVING"})
- **Client SLA Defect Slip Rate**: ${((Number(stats?.nuroFindingsRate) || 0) * 100).toFixed(1)}% vs Threshold **<2.0%** (${Number(stats?.nuroFindingsRate || 0) <= 0.02 ? "✅ EXCELLENT" : "❌ EXCESSIVE"})

**2. AI Structural Audit Ruling:**
👉 **${eligible ? "RECOMMENDED FOR PRINCIPAL LEVEL-1 ACCREDITATION" : "DECISION DEFERRED - REQUIRED REMEDIAL TRAINING"}**

**3. Contextual Rationale:**
- ${eligible
  ? "The contributor consistently maintains excellent geometric boundaries and attributes within the required processing time with zero major client findings."
  : "Candidate fails to meet the strict combined milestone: their V2 accuracy and client-slip ratios suggest active drift. Rushing behavior has been logged in recent batches."}

**4. Post-Audit Prescriptions:**
- ${eligible
  ? "Issue digital badge and unlock priority high-complexity sequencing batches (such as Nuro Highway Lidar tasks)."
  : "Retract primary operational status on premium clients. Re-enroll in Error Management and RCA Calibration Phase 1 huddle."}`
    });
  }

  try {
    const prompt = `You are a Principal Lead for Contributor Quality Certification at a tier-1 autonomous vehicle data operations platform.
Perform an objective, metric-driven certification eligibility audit for contributor \`${labelerId}\`.
The target metrics profile is:
${JSON.stringify(stats, null, 2)}

Our mandatory certification SLA benchmarks:
1. Operational Accuracy ≥ 98.0%
2. Production speed within 80% to 120% of expectation (no over-speeding / under-speeding)
3. Client layer defect slip rate < 2.0%
4. High Auditor review confidence rating

Produce a comprehensive, rigorous certification audit report in Markdown format:
- SCORECARD AUDIT vs STANDARDS: Verify each requirement.
- DETAILED RULING: Clearly state if the user should be CERTIFIED, DEFERRED, or REJECTED.
- CRUCIAL METRIC CORRELATION: Explain how their pacing speed correlates with their accuracy.
- ACTION PLAN FOR BOTH APPROVED OR DEFERRED STATUS.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an objective, authoritative certification board auditor. Your tone is forensic, formal, and precise. Use Markdown structures.",
        temperature: 0.5
      }
    });

    const text = String(response.text || "");
    const eligibleText = text.toLowerCase().includes("certified") || text.toLowerCase().includes("recommended");

    res.json({
      success: true,
      mode: "live",
      eligible: eligibleText,
      recommendation: text
    });
  } catch (err: unknown) {
    console.error("Gemini Certification checker error:", err);
    res.status(500).json({ error: toErrorMessage(err, "Failed to run Certification audit.") });
  }
});

// Mount under /api (normal) and at root (when Vercel rewrite collapses the prefix).
app.use("/api", apiRouter);
app.use(apiRouter);

// Only 404 unknown /api/* paths — never steal SPA routes during local Vite middleware.
app.use("/api", (req, res) => {
  res.status(404).json({
    error: `No API route for ${req.method} ${req.originalUrl || req.url}`,
    url: req.url,
    hint: "Known routes: GET /api/health, GET /api/sheets/task-tracker-cache, POST /api/gemini/*"
  });
});

export default app;
