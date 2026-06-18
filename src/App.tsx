import React, { useState } from "react";
import OperationsDashboard from "./components/OperationsDashboard";
import QmsModuleSuite from "./components/QmsModuleSuite";
import {
  Activity,
  ClipboardList,
  Sparkles,
  Info,
  Calendar,
  Layers,
  MapPin,
  Clock,
  BookOpen,
  HelpCircle,
  TrendingUp,
  X,
  Gauge,
  Sliders,
  CheckCircle,
  FileCheck,
  Award
} from "lucide-react";

export default function App() {
  const [activePortal, setActivePortal] = useState<"dashboard" | "qms" | "blueprint">("dashboard");
  const [showNotification, setShowNotification] = useState(true);
  const [headerLocations, setHeaderLocations] = useState<string>("BRP • SLT • PUNE • HYDERABAD");
  const [currentTime, setCurrentTime] = useState<string>(new Date().toISOString().split("T")[0] + " UTC");

  // Keep time updated
  React.useEffect(() => {
    const now = new Date();
    setCurrentTime(now.getUTCFullYear() + "-" + 
      String(now.getUTCMonth() + 1).padStart(2, "0") + "-" + 
      String(now.getUTCDate()).padStart(2, "0") + " UTC");
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white" id="main-app-container">
      {/* Prime Header */}
      <header className="border-b border-slate-200 bg-white/90 sticky top-0 z-40 backdrop-blur-md shadow-xs" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-md shadow-indigo-500/15">
              <Sparkles className="w-5 h-5 text-slate-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-display font-extrabold tracking-tight text-slate-950 uppercase">
                  Sim teacher QMS
                </h1>
                <span className="bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                  TASKS ENGINE ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono tracking-wide">
                iMerit Operations System
              </p>
            </div>
          </div>
 
          {/* Sync Metadata Row */}
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-500 font-mono" id="header-metadata-row">
            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span>{headerLocations}</span>
            </div>
            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>TIME: {currentTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#3b82f6]" />
              <span>TELEMETRY: STUPQC ACTIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Tabbed Swapper */}
      <div className="bg-slate-50/80 border-b border-slate-200/80 sticky top-20 z-30 backdrop-blur-md" id="portal-navigation-wrapper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center py-2.5 gap-4">
          <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200/50" id="portal-nav-tabs">
            <button
              onClick={() => setActivePortal("dashboard")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium font-display transition cursor-pointer ${
                activePortal === "dashboard"
                  ? "bg-white text-slate-950 font-bold border border-slate-250 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
              }`}
            >
              <Activity className="w-4 h-4 text-[#3b82f6]" />
              Sim Teacher RCA/OPS Dashboard
            </button>

            <button
              onClick={() => setActivePortal("qms")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium font-display transition cursor-pointer ${
                activePortal === "qms"
                  ? "bg-white text-slate-950 font-bold border border-slate-250 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
              }`}
            >
              <ClipboardList className="w-4 h-4 text-emerald-500" />
              11 QMS Modules Platform
            </button>

            <button
              onClick={() => setActivePortal("blueprint")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium font-display transition cursor-pointer ${
                activePortal === "blueprint"
                  ? "bg-white text-slate-950 font-bold border border-slate-250 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
              }`}
            >
              <BookOpen className="w-4 h-4 text-purple-500" />
              Architectural Blueprints
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono self-end sm:self-auto bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <span>DATABASE:</span>
            <span className="text-emerald-600 font-bold">LIVE TELEMETRY STREAM</span>
          </div>
        </div>
      </div>

      {/* Primary Page Canvas */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" id="root-portal-canvas">
        {activePortal === "dashboard" && (
          <OperationsDashboard 
            onLocationsUpdate={(locs: string[]) => setHeaderLocations(locs.join(" • ").toUpperCase())} 
          />
        )}
        {activePortal === "qms" && <QmsModuleSuite />}
        {activePortal === "blueprint" && <ArchitecturalBlueprints />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500 font-mono text-center space-y-2 mt-auto" id="app-footer">
        <p>© 2026 iMerit Operations Steering Layer. Integrated with Gemini API Server-Side Protocols.</p>
        <p className="text-[10px] text-slate-400">Standard design rules compliant. Fully functional client sandboxes.</p>
      </footer>
    </div>
  );
}

// 3. Subcomponent for Architectural Blueprints Hub
function ArchitecturalBlueprints() {
  const [activeDocTab, setActiveDocTab] = useState<string>("recommendation");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 md:p-8 space-y-8 animate-fade-in" id="blueprint-panel">
      <div>
        <span className="text-[10px] font-mono text-indigo-600 tracking-widest uppercase block mb-1 font-bold">
          OPERATIONAL DIRECTIVE MANUAL
        </span>
        <h2 className="text-2xl font-display font-bold tracking-tight text-slate-900">Architectural & QMS Blueprint Hub</h2>
        <p className="text-sm text-slate-500 mt-1">
          Complete structural specifications requested for the integration of the Task Tracker (331 pages) dataset.
        </p>
      </div>

      {/* Minor Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap pb-1.5 gap-2" id="blueprint-mini-tabs">
        {[
          { id: "recommendation", title: "1. Data Model", icon: Layers },
          { id: "blueprint", title: "2. QMS Modules Blueprint", icon: ClipboardList },
          { id: "specification", title: "3. Dashboard Specs", icon: Sliders },
          { id: "certification", title: "4. Cert Framework", icon: Award },
          { id: "guidelines", title: "5. Guidelines for Leads", icon: CheckCircle },
          { id: "priority", title: "6. Roadmap & Priorities", icon: Calendar }
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveDocTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeDocTab === t.id
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.title}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6 text-sm text-slate-600 leading-relaxed font-sans" id="blueprint-tab-contents">
        
        {/* RECOMMENDED DATA MODEL */}
        {activeDocTab === "recommendation" && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              1. Enhanced Data Model Recommendation
            </h3>
            <p>
              To fully unlock the potential of the <strong>Task Tracker</strong> dataset, we recommend structuring additional derived fields and small dimension tables inside a relational layer (e.g. PostgreSQL mapped in QMS or calculated in real-time) to track worker latency patterns, client rejections, and calibration indices.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200/50 pb-2 font-bold">
                  RECOMMENDED DERIVED FIELDS & LOGIC
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-emerald-700 font-bold">1. Efficiency Pacing score</span>
                    <p className="text-xs text-slate-500 leading-normal">
                      Calculated as: <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-700 font-mono">expected_duration / actual_duration</code>.
                      If the index is &lt;0.80, it indicates <strong>Sluggish Labeling</strong>. If &gt;1.20, it flags <strong>Active Rushing</strong> (high propensity for bounding box misalignment).
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-emerald-700 font-bold">2. Contour standard Deviation (Pacing)</span>
                    <p className="text-xs text-slate-500 leading-normal">
                      Calculated over consecutive tasks by contributor. High fluctuations standard deviations flag worker cognitive burn-out, sensor fatigue, or extreme meteorological distraction.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200/50 pb-2 font-bold">
                  RECOMMENDED DIMENSION TABLES
                </h4>
                <table className="w-full text-left text-xs text-slate-500">
                  <thead className="text-[10px] font-mono uppercase text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="py-2">Dimension</th>
                      <th className="py-2">Key Fields</th>
                      <th className="py-2">Operational Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 font-mono text-xs text-slate-800 font-bold">dim_cohort</td>
                      <td className="py-2 font-mono text-[10px]">cohort_id, size, leading_tl</td>
                      <td className="py-2 text-slate-500">Maps team size and Team Lead ownership SLA to analyze group efficiency shifts.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-xs text-slate-800 font-bold">dim_driving_seq</td>
                      <td className="py-2 font-mono text-[10px]">seq_id, time_of_day, weather, slope</td>
                      <td className="py-2 text-slate-500">Provides context (e.g. night glare, heavy fog, steep San Francisco hills) to isolate uncontrollable drifts.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* QMS MODULES BLUEPRINT */}
        {activeDocTab === "blueprint" && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              2. QMS Module Blueprint Matrix
            </h3>
            <p>
              The structural framework below details all 11 core QMS modules, their default RACI ownership mappings, and standard KPIs.
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-4">QMS MODULE</th>
                    <th className="p-4">MAIN PURPOSE</th>
                    <th className="p-4">RACI ACCOUNTABLE (A)</th>
                    <th className="p-4">CORE MEASURABLE KPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="p-4 font-bold text-slate-800">1. Audit & QC Process</td>
                    <td className="p-4 text-slate-500">Controls gates, sample review, and link replay.</td>
                    <td className="p-4 font-mono text-slate-600">STQC TL</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">Sampling Quota (10-20%)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">2. Calibration Framework</td>
                    <td className="p-4 text-slate-500">Synchronizes joint reviewer alignment on edge cases.</td>
                    <td className="p-4 font-mono text-slate-600">QA Lead / Auditor</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">Consensus Jaccard Score (≥95%)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">3. Error Management & RCA</td>
                    <td className="p-4 text-slate-500">Analyzes and taxonomizes failureReason trends.</td>
                    <td className="p-4 font-mono text-slate-600">Auditor Panel</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">Controllable Error Share (%)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">4. Contributor Certification</td>
                    <td className="p-4 text-slate-500">Restricts operations access to certified high-performers.</td>
                    <td className="p-4 font-mono text-slate-600">Auditor Panel</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">Certified Contributor Ratio (&gt;85%)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">5. Performance Coaching</td>
                    <td className="p-4 text-slate-500">Executes corrective coaching and huddles.</td>
                    <td className="p-4 font-mono text-slate-600">V2 TL</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">Coaching Graduation Success (≥80%)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">6. Queries & Escalations</td>
                    <td className="p-4 text-slate-500">Manages visual ambiguity loops and Nuro feedback.</td>
                    <td className="p-4 font-mono text-slate-600">STQC TL</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">Query Resolution Cycle (&lt;4 hours)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">7. Knowledge Base</td>
                    <td className="p-4 text-slate-500">Deploys and maintains SOPs and rulebooks.</td>
                    <td className="p-4 font-mono text-slate-600">Auditor Spec Specialist</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">SOP Guideline Coverage (100%)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">8. Auditor Governance</td>
                    <td className="p-4 text-slate-500">Monitors double-blind checks on reviewers to prevent fatigue.</td>
                    <td className="p-4 font-mono text-slate-600">Auditor</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">Ref Audit Discrepancy Rate (&lt;1.5%)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">9. Change & QC Comm</td>
                    <td className="p-4 text-slate-500">Deploys standard guideline changes dynamically.</td>
                    <td className="p-4 font-mono text-slate-600">QA Lead / Auditor</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">Spec Acknowledgment Speed (&lt;6 hrs)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">10. Quality Risk monitoring</td>
                    <td className="p-4 text-slate-500">Establishes control triggers blockades before SLA leaks.</td>
                    <td className="p-4 font-mono text-slate-600">Auditor Panel</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">Discrepancy Drift Trigger</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-800">11. Quality Governance Sync</td>
                    <td className="p-4 text-slate-500">Holds weekly reviews to align resource allocations.</td>
                    <td className="p-4 font-mono text-slate-600">Staging Board Panel</td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">RCA Action Completion Rate (≥90%)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI DASHBOARD SPECIFICATION */}
        {activeDocTab === "specification" && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              3. AI-Powered Dashboard Specifications
            </h3>
            <p>
              The <strong>AV Quality Control Core Dashboard</strong> tracks operational efficiency through high-precision telemetry, offering smart corrective protocols.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="space-y-2">
                <span className="text-xs font-mono text-emerald-700 font-bold uppercase block">I. DATA VISUALIZATION LAYERS</span>
                <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside">
                  <li><strong>Failure Taxonomy breakdown</strong>: Real frequency of failureReason errors grouped by type.</li>
                  <li><strong>Productivity Deviation timeline</strong>: Expected V2 duration against active values.</li>
                  <li><strong>Geographic accuracy map</strong>: Tracks metrics across Calcutta, Bangalore, Phoenix, and SF.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono text-indigo-700 font-bold uppercase block">II. ENHANCED AI CAPABILITIES</span>
                <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside">
                  <li><strong>Auto RCA</strong>: Generates deep qualitative investigations for selected error categories using Gemini 3.5.</li>
                  <li><strong>Performance Coaching Logs</strong>: Automatically writes SMART retraining milestones.</li>
                  <li><strong>Drift Alerts</strong>: Flags statistical deviations between First-pass, QC, and Nuro.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono text-amber-700 font-bold uppercase block">III. DECISION BLOCKADES</span>
                <p className="text-xs text-slate-500 leading-normal">
                  System triggers <strong>Preventative Batch Holds</strong> if a cohort accuracy index slips beyond baseline tolerance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CERTIFICATION FRAMEWORK */}
        {activeDocTab === "certification" && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              4. Operational Certification Framework (SLA Compliance)
            </h3>
            <p>
              To protect dataset integrity, contributors and Team Leads must meet rigorous, multi-layered SLA benchmarks before accessing premium labeling lines or reviews.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200/60 pb-2 font-bold">
                  CONTRIBUTOR (V2 LABELER) CRITERIA
                </h4>
                <div className="space-y-2 text-xs leading-5">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Primary Goal (First-Pass Accuracy)</span>
                    <span className="text-emerald-600 font-mono font-bold">≥ 98.0% accuracy</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Duration Efficiency Window</span>
                    <span className="text-slate-700 font-mono">80% to 120% variance limit</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Client Defect Slip Boundary</span>
                    <span className="text-red-600 font-mono font-bold">&lt; 2.0% defects</span>
                  </div>
                  <div className="flex justify-between pb-1.5">
                    <span className="text-slate-500">Audit Check (Standard Deviation)</span>
                    <span className="text-indigo-600 font-mono">Stable pacing, low variation</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200/60 pb-2 font-bold">
                  LEADS, AUDITORS & CONTROLLERS CRITERIA
                </h4>
                <div className="space-y-2 text-xs leading-5">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Calibration Alignment Jaccard</span>
                    <span className="text-emerald-600 font-mono font-bold">≥ 95.0% score</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">QC Review Consensus Agreement</span>
                    <span className="text-indigo-600 font-mono">≥ 99.5% consensus limit</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Audit Discrepancy Margin</span>
                    <span className="text-red-600 font-mono font-bold">&lt; 1.5% discrepancy</span>
                  </div>
                  <div className="flex justify-between pb-1.5">
                    <span className="text-slate-500">Huddle Accountability</span>
                    <span className="text-slate-700 font-mono">100% attendance recorded</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GUIDELINES FOR LEADS */}
        {activeDocTab === "guidelines" && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-indigo-600" />
              5. Operational Guidelines for Leads (System Usage Routine)
            </h3>
            <p>
              Team Leads and QA Auditors are instructed to follow this explicit daily and weekly steering routine to maintain optimal throughput.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-mono text-emerald-700 font-bold block uppercase border-b border-slate-150 pb-1">
                  DAILY OPERATIONAL STANDARDS
                </span>
                <ul className="text-xs text-slate-500 space-y-2 list-decimal list-inside leading-relaxed">
                  <li><strong>Morning Drift Sweep</strong>: Query the AI Dashboard's <strong>Pacing Index</strong>. If any cohort is &gt;125% of expectations, identify rushing labelers immediately.</li>
                  <li><strong>Trigger Auto-RCA</strong>: Address any emerging QC rejections in <em>Bounding Box Misalignment</em> or <em>Attributes</em>. Run Gemini-RCA on high-frequency error categories.</li>
                  <li><strong>Update KB Alerts Feed</strong>: Cross-reference recent Nuro feedback note changes and broadcast immediate spec alerts.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-mono text-indigo-700 font-bold block uppercase border-b border-slate-150 pb-1">
                  WEEKLY STEERING ROUTINES
                </span>
                <ul className="text-xs text-slate-500 space-y-2 list-decimal list-inside leading-relaxed">
                  <li><strong>SOP Calibration Campaigns</strong>: Host at least one joint alignment huddle. Review borderline cases and log Jaccard scores to maintain a target calibration rate &ge;95.0%.</li>
                  <li><strong>Remedial Coaching Graduation</strong>: Retrieve low-range performers. Evaluate their standard deviations and accuracy improvement curves to approve or continue coaching plans.</li>
                  <li><strong>Board Sync Alignment</strong>: Assemble lead reviewers to resolve pending edge-case escalation tickets.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ROADMAP & PRIORITIES */}
        {activeDocTab === "priority" && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              6. Governance Implementation Priority
            </h3>
            <p>
              To guarantee seamless platform execution, operational components are assigned targeted deployment phases.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded uppercase">
                  PHASE 1 (IMMEDIATE DEPLOYMENT)
                </span>
                <h4 className="text-sm font-display font-bold text-slate-800 pt-1">CORE QUALITY GATES</h4>
                <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
                  <li>Task Tracker Data Integration</li>
                  <li>Audit Sampling Gate (Module 1)</li>
                  <li>Taxonomy Error Logs (Module 3)</li>
                  <li>Auto-RCA Generator</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded uppercase">
                  PHASE 2 (STABILIZATION)
                </span>
                <h4 className="text-sm font-display font-bold text-slate-800 pt-1">RETAINING & REVIEWS</h4>
                <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
                  <li>Performance Coaching logs (Module 5)</li>
                  <li>Calibration joint matrix (Module 2)</li>
                  <li>Knowledge Base lookup SOP (Module 7)</li>
                  <li>Performance Coach Drafts</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded uppercase">
                  PHASE 3 (OVERSIGHT & DRIFT)
                </span>
                <h4 className="text-sm font-display font-bold text-slate-800 pt-1">CERTIFICATION & DRIFT ALERTS</h4>
                <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
                  <li>Credentials Certification (Module 4)</li>
                  <li>High-precision Drift Controls (Module 10)</li>
                  <li>Edge-case Ticketer (Module 6)</li>
                  <li>Drift & Cert Auditing</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
