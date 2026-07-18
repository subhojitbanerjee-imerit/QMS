import type { IncomingMessage, ServerResponse } from "http";
import { toErrorMessage } from "./bigquery.js";

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
      } catch {
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
      analysis: `### AI Root Cause Analysis (AV QMS Engine)
**Focus Area:** ${errorCategory || "All Categories"}
**Cohort / Team:** ${cohort || "All"} (Lead: ${tl || "Unassigned Lead"})
**Location Coordinate:** ${location || "Global Centers"}

1. Quantitative overview and systemic root causes for ${errorCategory || "errors"} under ${tl || "TL"} in ${cohort || "cohort"}.
2. Controllable vs uncontrollable factoring.
3. CAPA plan with calibration huddle and temporary 100% STQC gate.`
    });
  }

  const prompt = `You are a Principal QMS Architect for AV labeling. Write a detailed RCA in Markdown.
Context: error=${errorCategory || "Unspecified"}, cohort=${cohort || "General"}, tl=${tl || "General"}, location=${location || "General"}, details=${JSON.stringify(details || {})}
Include quantitative/qualitative root causes, controllable vs uncontrollable factors, and CAPA plan.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an expert AV labeling QMS lead. Structured professional markdown only.",
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
      plan: `### Professional Performance Coaching Plan
**Contributor:** ${labelerId || "AV Labeler"}
**Cohort:** ${cohort || "Cohort-1"} | **TL:** ${tl || "Team Lead"}
**Skill Area:** ${errorType || "Boundary Precision"}
**Accuracy:** ${((Number(accuracy) || 0) * 100).toFixed(1)}%
**Pacing:** Expected ${expectedDuration}s / Actual ${actualDuration}s`
    });
  }

  const prompt = `Write a coaching plan in Markdown for labeler ${labelerId || "Labeler"}, skill gap ${errorType || "General Accuracy"}, accuracy ${((Number(accuracy) || 0) * 100).toFixed(1)}%, expected ${expectedDuration}s, actual ${actualDuration}s, cohort ${cohort || "Unspecified"}, supervisor ${tl || "Unspecified"}. Include diagnosis, SMART goals, 5-day plan.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "Professional performance trainer. Formal markdown with checkpoints.",
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
      analysis: `### AI Quality Drift Report
Location: ${location || "All"} | Cohort: ${cohort || "All"}
V2: ${((Number(v2Accuracy) || 0) * 100).toFixed(1)}% | QC: ${((Number(qcAccuracy) || 0) * 100).toFixed(1)}% | Client defects: ${((Number(nuroDefects) || 0) * 100).toFixed(1)}%
Reasons: ${JSON.stringify(failureReasons || [])}
Pacing: ${actualVsExpected}`
    });
  }

  const prompt = `Analyze AV quality drift in Markdown. Cohort=${cohort || "All"}, location=${location || "All"}, v2=${((Number(v2Accuracy) || 0) * 100).toFixed(2)}%, qc=${((Number(qcAccuracy) || 0) * 100).toFixed(2)}%, nuro=${((Number(nuroDefects) || 0) * 100).toFixed(2)}%, reasons=${JSON.stringify(failureReasons || [])}, pacing=${actualVsExpected}. Include inter-layer drift, risk horizon, containment protocols.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "Quantitative AV quality specialist. Metric-driven markdown.",
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
      stats?.accuracy >= 0.98 &&
      stats?.uncontrollableRate < 0.05 &&
      stats?.efficiencyIndex >= 85 &&
      stats?.efficiencyIndex <= 115;
    return sendJson(res, 200, {
      success: true,
      mode: "simulation",
      eligible,
      recommendation: `### Certification Eligibility Audit
Candidate: ${labelerId}
Accuracy: ${((Number(stats?.accuracy) || 0) * 100).toFixed(1)}%
Ruling: ${eligible ? "RECOMMENDED FOR PRINCIPAL LEVEL-1 ACCREDITATION" : "DECISION DEFERRED"}`
    });
  }

  const prompt = `Certification audit for ${labelerId}. Metrics: ${JSON.stringify(stats, null, 2)}. Benchmarks: accuracy>=98%, speed 80-120%, client slip <2%, high confidence. Return scorecard, ruling, correlation, action plan.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "Objective certification auditor. Formal markdown.",
      temperature: 0.5
    }
  });
  const text = String(response.text || "");
  const eligibleText = text.toLowerCase().includes("certified") || text.toLowerCase().includes("recommended");
  return sendJson(res, 200, { success: true, mode: "live", eligible: eligibleText, recommendation: text });
}

export async function handleGeminiRoute(kind: GeminiKind, req: IncomingMessage, res: ServerResponse) {
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
    return sendJson(res, 500, { error: toErrorMessage(error, `Failed to run Gemini ${kind} endpoint.`) });
  }
}
