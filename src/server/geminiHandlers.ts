import type { IncomingMessage, ServerResponse } from "http";
import { toErrorMessage } from "./bigqueryTaskTracker";

type GeminiKind = "rca" | "coaching" | "drift" | "certify";

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
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") return null;
      try {
        const { GoogleGenAI } = await import("@google/genai");
        return new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        }) as unknown as GenAiClient;
      } catch (error) {
        console.error("Failed to initialize Gemini client:", toErrorMessage(error));
        return null;
      }
    })();
  }
  return aiClientPromise;
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Request body is not valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function handleRca(body: any, res: ServerResponse) {
  const { errorCategory, cohort, tl, location, details } = body || {};
  const ai = await getAiClient();
  if (!ai) {
    return sendJson(res, 200, {
      success: true,
      mode: "simulation",
      analysis: `### 🛠️ AI Root Cause Analysis (AV QMS Engine)
**Focus Area:** ${errorCategory || "All Categories"}
**Cohort / Team:** ${cohort || "All"} (Lead: ${tl || "Unassigned Lead"})
**Location Coordinate:** ${location || "Global Centers"}

**1. Quantitative Overview & Signal Strengths:**
- Average Deviances: V2 labelers working under **${tl || "Team Lead"}** on ${errorCategory || "General Errors"} exhibit an average efficiency ratio deviation of **+14.8%** above baseline.

**2. Identified Systemic Root Causes:**
- Knowledge asymmetry on occlusion rules in **${cohort || "Cohort"}**.
- Tool friction during sequence replay and interpolation.
- Productivity vs quality stress on V2 timelines.

**3. Recommended Corrective & Preventive Action (CAPA):**
- Calibration huddle for far-range occlusion.
- Enable slower playback profiles.
- Temporary 100% STQC review gate under **${tl || "Reviewer"}**.`
    });
  }

  const prompt = `You are a Principal Quality Management System (QMS) Architect and Root Cause Specialist for autonomous vehicle dataset labeling.
Deliver a rigorous, professional, and detailed Root Cause Analysis (RCA) report in Markdown.
Target Context:
- Main Error Category / failureReason: ${errorCategory || "Unspecified"}
- Targeted Cohort: ${cohort || "General Cohort"}
- Team Lead: ${tl || "General TL"}
- Location Coordinate: ${location || "General Location"}
- Sub-details & Context: ${JSON.stringify(details || {})}

Provide:
1. QUANTITATIVE & QUALITATIVE ROOT CAUSES
2. CONTROLLABLE VS UNCONTROLLABLE FACTORING
3. ACTIONABLE CAPA PLAN`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an expert autonomous vehicle labeling operations QMS lead. Keep your response structured, deep, analytical, written in objective professional domain style, utilizing formal markdown with no self-congratulatory notes or chat filler.",
      temperature: 0.7
    }
  });
  return sendJson(res, 200, { success: true, mode: "live", analysis: response.text });
}

async function handleCoaching(body: any, res: ServerResponse) {
  const { labelerId, errorType, accuracy, expectedDuration, actualDuration, cohort, tl } = body || {};
  const ai = await getAiClient();
  if (!ai) {
    return sendJson(res, 200, {
      success: true,
      mode: "simulation",
      plan: `### 📋 Professional Performance Coaching Plan
**Beneficiary Contributor:** ${labelerId || "AV Labeler"}
**Cohort/Team:** ${cohort || "Cohort-1"} (Supervisor: ${tl || "Team Lead"})
**Main Skill Area:** ${errorType || "Boundary Precision & Attribute Tagging"}
**Accuracy Baseline:** ${((Number(accuracy) || 0) * 100).toFixed(1)}%
**Pacing:** Expected ${expectedDuration}s / Actual ${actualDuration}s`
    });
  }

  const prompt = `You are a Senior Technical Operations Trainer for autonomous vehicle labeling.
Construct a professional coaching plan in Markdown for:
- Labeler: ${labelerId || "Labeler"}
- Skill gap: ${errorType || "General Accuracy"}
- Accuracy: ${((Number(accuracy) || 0) * 100).toFixed(1)}%
- Expected duration: ${expectedDuration} sec
- Actual duration: ${actualDuration} sec
- Cohort: ${cohort || "Unspecified"}
- Supervisor: ${tl || "Unspecified"}

Include PERFORMANCE DIAGNOSIS, SMART GOALS, and a 5-DAY ACTION PLAN.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are a professional performance team trainer. Keep the style formal, direct, constructive, and highly prescriptive with clear checkpoints, using professional markdown format.",
      temperature: 0.6
    }
  });
  return sendJson(res, 200, { success: true, mode: "live", plan: response.text });
}

async function handleDrift(body: any, res: ServerResponse) {
  const { location, cohort, v2Accuracy, qcAccuracy, nuroDefects, failureReasons, actualVsExpected } = body || {};
  const ai = await getAiClient();
  if (!ai) {
    return sendJson(res, 200, {
      success: true,
      mode: "simulation",
      analysis: `### 🚨 AI Quality Drift & Preventative Report
**Entity Target:** Location: ${location || "All"} | Cohort: ${cohort || "All"}
- V2 accuracy: ${((Number(v2Accuracy) || 0) * 100).toFixed(1)}%
- QC accuracy: ${((Number(qcAccuracy) || 0) * 100).toFixed(1)}%
- Client defect rate: ${((Number(nuroDefects) || 0) * 100).toFixed(1)}%
- Top failure reasons: ${JSON.stringify(failureReasons || [])}
- Pacing: ${actualVsExpected}`
    });
  }

  const prompt = `You are a Lead Operations Auditor for AV validation.
Analyze quality drift:
- Cohort: ${cohort || "All Cohorts"}
- Location: ${location || "All Locations"}
- V2 accuracy: ${((Number(v2Accuracy) || 0) * 100).toFixed(2)}%
- QC accuracy: ${((Number(qcAccuracy) || 0) * 100).toFixed(2)}%
- Nuro defect rate: ${((Number(nuroDefects) || 0) * 100).toFixed(2)}%
- Failure reasons: ${JSON.stringify(failureReasons || [])}
- Pacing: ${actualVsExpected}

Deliver INTER-LAYER DRIFT ANALYSIS, RISK HORIZON PREDICTION, and PREVENTATIVE CONTAINMENT PROTOCOLS in Markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are a quantitative AV Operations Quality Specialist. Structure your response with meticulous, metric-driven, professional, and clear markdown with distinct hazard headers.",
      temperature: 0.7
    }
  });
  return sendJson(res, 200, { success: true, mode: "live", analysis: response.text });
}

async function handleCertify(body: any, res: ServerResponse) {
  const { labelerId, stats } = body || {};
  const ai = await getAiClient();
  if (!ai) {
    const eligible =
      stats?.accuracy >= 0.98
      && stats?.uncontrollableRate < 0.05
      && stats?.efficiencyIndex >= 85
      && stats?.efficiencyIndex <= 115;
    return sendJson(res, 200, {
      success: true,
      mode: "simulation",
      eligible,
      recommendation: `### 🎓 AV Labeler Certification Eligibility Audit
**Candidate:** \`${labelerId}\`
**Accuracy:** ${((Number(stats?.accuracy) || 0) * 100).toFixed(1)}%
**Ruling:** ${eligible ? "RECOMMENDED FOR PRINCIPAL LEVEL-1 ACCREDITATION" : "DECISION DEFERRED - REQUIRED REMEDIAL TRAINING"}`
    });
  }

  const prompt = `Perform a certification eligibility audit for contributor \`${labelerId}\`.
Metrics:
${JSON.stringify(stats, null, 2)}

Benchmarks:
1. Accuracy ≥ 98.0%
2. Speed within 80%-120% of expectation
3. Client defect slip rate < 2.0%
4. High auditor confidence

Return SCORECARD, DETAILED RULING, METRIC CORRELATION, and ACTION PLAN in Markdown.`;

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
  return sendJson(res, 200, {
    success: true,
    mode: "live",
    eligible: eligibleText,
    recommendation: text
  });
}

export async function handleGeminiRoute(
  kind: GeminiKind,
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    if ((req.method || "GET").toUpperCase() !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { error: "Method not allowed. Use POST." });
    }

    const body = await readJsonBody(req);
    if (kind === "rca") return handleRca(body, res);
    if (kind === "coaching") return handleCoaching(body, res);
    if (kind === "drift") return handleDrift(body, res);
    return handleCertify(body, res);
  } catch (error) {
    console.error(`Gemini ${kind} error:`, error);
    return sendJson(res, 500, {
      error: toErrorMessage(error, `Failed to run Gemini ${kind} endpoint.`)
    });
  }
}
