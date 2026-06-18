import React, { useState } from "react";
import {
  Layers,
  BookOpen,
  Award,
  Users,
  Activity,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Plus,
  CheckCircle,
  Clock,
  Gauge,
  Send,
  Trash2,
  FileText,
  Search,
  Check,
  ShieldAlert,
  ClipboardList
} from "lucide-react";

// Standard RACI Models for the 11 Modules
interface QmsModuleDefinition {
  id: number;
  title: string;
  purpose: string;
  raci: {
    r: string; // Responsible
    a: string; // Accountable
    c: string; // Consulted
    i: string; // Informed
  };
  kpis: string[];
  dataConnection: string;
}

const QMS_MODULES_STATIC: QmsModuleDefinition[] = [
  {
    id: 1,
    title: "1. Audit & QC Process",
    purpose: "Define the standard gatekeeping, sampling, and verification workflows on first-pass annotations.",
    raci: {
      r: "STQC QC Reviewer (qa_user_id)",
      a: "STQC Team Lead (STQC TL)",
      c: "Auditor (Lead / Trainer)",
      i: "V2 First-pass Member (labeler)"
    },
    kpis: ["QC Sampling Rate (Target: 10%-20% of batch)", "STQC Review Accuracy (Target: ≥99.5%)", "QC Turnaround Limit (SLA: <24 hours)"],
    dataConnection: "Direct support via `selectQcResult` decisions, qc durations, and `qc_replay_link` verification parameters."
  },
  {
    id: 2,
    title: "2. Calibration Framework",
    purpose: "Synchronize accuracy baselines across labelers, QC teams, and the Nuro client to eliminate alignment gaps.",
    raci: {
      r: "Auditor & STQC TL",
      a: "Auditor (Lead / Trainer)",
      c: "Nuro Review Layer",
      i: "V2 Labeler & QC Reviewer"
    },
    kpis: ["Jaccard Alignment Score (Target: ≥95.0%)", "Active Calibration Frequency (Weekly target: 1 round)", "Inter-Reviewer Consensus Rate"],
    dataConnection: "Supports alignment comparison between V2 first-pass status (`v2_task_status_final`) vs. Auditor judgment vs. `nuro_findings` results."
  },
  {
    id: 3,
    title: "3. Error Management & RCA",
    purpose: "Trace and dissect error trends systematically, separating controllable worker faults from uncontrollable sensor noise.",
    raci: {
      r: "STQC TL & Auditor",
      a: "Auditor (Lead / Trainer)",
      c: "V2 TL & Nuro",
      i: "Labeler Pools"
    },
    kpis: ["Taxonomy Defect Counts (failureReason)", "Controllable Error Share (% of total rejects)", "CAPA Huddle Attendance (Target: 100%)"],
    dataConnection: "Direct alignment to the primary `failureReason` data field and `is_controllable` tag distribution."
  },
  {
    id: 4,
    title: "4. Contributor Certification",
    purpose: "Control credentialing of labelers and leads based on historical precision performance and task pacing boundaries.",
    raci: {
      r: "Auditor Panel",
      a: "Auditor (Lead / Trainer)",
      c: "V2 TL & STQC TL",
      i: "Entire Contributor Pool"
    },
    kpis: ["Certified Contributor Ratio (Target: >85%)", "Re-certification Interval (Quarterly)", "Pre-qualification Pass Rate"],
    dataConnection: "Supported by analyzing labeler-level V2 accuracy baselines, duration standard deviations, and Nuro defect slip rates."
  },
  {
    id: 5,
    title: "5. Performance Monitoring & Coaching",
    purpose: "Execute structured training huddles and corrective coaching pipelines for margin or low-performing individuals.",
    raci: {
      r: "V2 Team Lead (V2 TL)",
      a: "V2 TL",
      c: "Auditor (QA Trainer)",
      i: "Coached Contributor"
    },
    kpis: ["Coaching Graduation Success Range (Target: ≥80%)", "Duration Std Deviation Stabilization", "First-pass Accuracy Improvement Curve"],
    dataConnection: "Tracks individual `v2_task_duration_seconds` against standard expected pacing limit guidelines."
  },
  {
    id: 6,
    title: "6. Query & Escalation Management",
    purpose: "Manage a rapid lane for resolving complex visual ambiguities (such as novel objects) and cascading client specifications.",
    raci: {
      r: "V2 TL & STQC TL",
      a: "STQC TL",
      c: "Nuro (Client review layer)",
      i: "Active Labeling Floor"
    },
    kpis: ["Query Loop Resolution Cycle (SLA: <4 hours)", "Client-Nuro Escalation Ratio (<5% of queries)", "Documentation Update Interval"],
    dataConnection: "Driven by `nuro_findings` logs and comment notes that represent unclassified scene anomalies."
  },
  {
    id: 7,
    title: "7. Knowledge Base & Decisions",
    purpose: "Preserve and maintain the single source of truth for annotation specs, guidelines, and 'Do' vs 'Don't' catalogs.",
    raci: {
      r: "Auditor & Spec Specialist",
      a: "Auditor (Lead / Trainer)",
      c: "Nuro Technical Engineers",
      i: "Labelers & QC teams"
    },
    kpis: ["KB Search Accessibility Index", "SOP Guideline Coverage (Target: 100%)", "Obsolete Reference Rate (Target: 0%)"],
    dataConnection: "Directly bridges to specific location-based and weather-based trends where annotation rules deviate."
  },
  {
    id: 8,
    title: "8. Auditor Governance & QC Effectiveness",
    purpose: "Enable strict oversight and double-blind checks on reviewers to prevent quality inflation or fatigue-induced slipping.",
    raci: {
      r: "Auditor Panels",
      a: "Auditor (Lead / Trainer)",
      c: "STQC TL",
      i: "STQC QC Reviewers"
    },
    kpis: ["Over-Audit Discrepancy Rate (Target: <1.5%)", "Double-blind consensus index", "Reviewer Fatigue Signal (SLA tracking)"],
    dataConnection: "Calculated by matching `qa_user_id` selectQcResult outcomes with direct `auditor` findings (such as Auditor Preeti vs QC user)."
  },
  {
    id: 9,
    title: "9. Change & Quality Communication",
    purpose: "Safely deploy client instruction changes across all operating cohorts with strict verification of awareness.",
    raci: {
      r: "V2 TL & STQC TL",
      a: "Auditor (Lead / Trainer)",
      c: "Nuro Operations Manager",
      i: "Active Labeling Floor"
    },
    kpis: ["Spec Acknowledgment Speed (Target: <6 hours)", "Change Readiness Alignment Range", "Post-change Defect Spikes"],
    dataConnection: "Monitors chronological changes in batches (`batch_id`) to detect quality fluctuations post spec change."
  },
  {
    id: 10,
    title: "10. Quality Risk & Drift Monitoring",
    purpose: "Set up control limits and hazard monitors to trigger blockades BEFORE SLA limits are breached with the client.",
    raci: {
      r: "Auditor & STQC TL",
      a: "Auditor Panel",
      c: "Entire Management Chain",
      i: "Labeling Floor"
    },
    kpis: ["Inter-layer Drift Discrepancy Gate", "Active Drift Warnings triggered", "Preventative Blockade cycle time"],
    dataConnection: "Leverages the statistical gap between first-pass passed results and client defect findings rates."
  },
  {
    id: 11,
    title: "11. Quality Governance & Reviews",
    purpose: "Schedule recurring core quality syncs to review systemic bottlenecks, resource constraints, and client SLAs.",
    raci: {
      r: "Entire QMS Steering Panel (TLs, Auditors)",
      a: "Auditor (Lead / Trainer)",
      c: "Nuro Quality Sponsor",
      i: "Senior Operations Stakeholders"
    },
    kpis: ["Review Goal Attainment", "RCA Action Items completed in Sprint (Target: ≥90%)", "Systemic SLA Compliance Score"],
    dataConnection: "Translates high-level statistical summaries by Locations and Cohorts into Boardroom review agendas."
  }
];

export default function QmsModuleSuite() {
  const [activeTab, setActiveTab2] = useState<number>(1);

  // Module 1 States: QC Sampling Calculator
  const [m1BatchSize, setM1BatchSize] = useState<number>(1200);
  const [m1Confidence, setM1Confidence] = useState<string>("95");

  // Module 2 States: Calibration Campaign logs
  const [m2Campaigns, setM2Campaigns] = useState([
    { id: "CAL-01", topic: "Lane Boundary Spline Stitching", date: "2026-06-12", alignmentJaccard: 96.4, status: "CALIBRATED" },
    { id: "CAL-02", topic: "Far Range Occluded Vehicle Boundary", date: "2026-06-15", alignmentJaccard: 92.1, status: "DEFERRED_RECALIBRATE" },
  ]);
  const [newCalTopic, setNewCalTopic] = useState("");
  const [newCalJaccard, setNewCalJaccard] = useState(95.0);

  // Module 3 States: Error logs details
  const [m3Taxonomy, setM3Taxonomy] = useState([
    { category: "Bounding Box Misalignment", targetSOP: "Para-4.2 Bbox Padding Guidelines", penaltyScore: "Critical Major" },
    { category: "Missing Objects", targetSOP: "Para-4.5 Occlusion Blindspot Rules", penaltyScore: "Critical Demerit" },
    { category: "Incorrect Semantic Labeling", targetSOP: "Para-5.1 Segmentation Spline SOP", penaltyScore: "Major" },
    { category: "Occlusion Handling Error", targetSOP: "Para-4.10 Tracklet Splits Guidelines", penaltyScore: "Minor" }
  ]);

  // Module 4 States: Certification issuing
  const [m4Certs, setM4Certs] = useState([
    { name: "labeler_01", cohort: "Cohort_Alpha", accuracy: 99.1, badge: "PRINCIPAL L1" },
    { name: "labeler_22", cohort: "Cohort_Gamma", accuracy: 98.4, badge: "PRINCIPAL L1" },
    { name: "qc_user_05", cohort: "STQC_North", accuracy: 99.6, badge: "LEAD REVIEWER" }
  ]);

  // Module 5 States: Coaching huddles
  const [m5Huddles, setM5Huddles] = useState([
    { name: "labeler_02", focus: "Bounding Box Sizes", planDate: "2026-06-18", status: "ASSIGNED" },
    { name: "labeler_12", focus: "Attribute Classification", planDate: "2026-06-19", status: "IN_HUDDLE" }
  ]);
  const [newHuddleLabeler, setNewHuddleLabeler] = useState("");
  const [newHuddleFocus, setNewHuddleFocus] = useState("");

  // Module 6 States: Escalation Ticket logs
  const [m6Tickets, setM6Tickets] = useState([
    { id: "ESC-801", subject: "Double-hinged trailer at Phoenix Coordinate", creator: "labeler_11", status: "ESCALATED_TO_NURO" },
    { id: "ESC-802", subject: "Semi-covered construction barrel classification", creator: "labeler_21", status: "RESOLVED" }
  ]);
  const [newEscSubject, setNewEscSubject] = useState("");
  const [newEscCreator, setNewEscCreator] = useState("");

  // Module 7 States: Searchable KB reference SOPs
  const [kbQuery, setKbQuery] = useState("");
  const kbSops = [
    { code: "KB-SOP-091", title: "Occlusion interpolation tracklet splits", content: "Split tracklets if an object remains occluded for more than 45 continuous frames. Do not interpolate manually." },
    { code: "KB-SOP-092", title: "Lidar Point cloud boundary box tightness", content: "Bounding boxes must wrap within 2cm of standard visible point boundaries on the horizontal plane." },
    { code: "KB-SOP-093", title: "Rain refraction lane mark spline annotations", content: "Under high rain/water reflections, trace splines based on previous dry daylight keyframes (reference Sequence map)." }
  ];

  // Module 8 States: QC Reviewer Governance consensus
  const m8Consensus = [
    { reviewer: "qc_user_05", reviewAccuracy: 99.6, blindAuditDiscrepancy: 0.4, status: "EXCELLENT" },
    { reviewer: "qc_user_12", reviewAccuracy: 98.9, blindAuditDiscrepancy: 1.1, status: "GOOD" },
    { reviewer: "qc_user_22", reviewAccuracy: 97.4, blindAuditDiscrepancy: 2.6, status: "RECALIBRATE_RECOMMENDED" }
  ];

  // Module 9 States: Broadcast Alerts
  const [m9Alerts, setM9Alerts] = useState([
    { date: "2026-06-14", batch: "BATCH-AV-03", text: "URGENT: Nuro updated parameters on bicycle attribute labeling. All bicycles parked on pavements must be tagged as 'Stationary Obstacle'." }
  ]);
  const [newAlertText, setNewAlertText] = useState("");

  // Module 10 States: Drift thresholds check
  const m10Indicators = [
    { indicator: "V2 to QC accuracy discrepancy", alertLimit: ">1.5%", currentStatus: "3.4% gap", triggerAction: "⚠️ ACTIVATE SPECIAL SAMPLING" },
    { indicator: "Pacing Duration Drop Below Limits", alertLimit: ">15%", currentStatus: "18% deviation", triggerAction: "⚠️ PAUSE NEXT BATCH RELEASES" },
    { indicator: "Nuro Defect Slip Rate", alertLimit: ">2.0%", currentStatus: "2.1% (Phoenix)", triggerAction: "🚨 ACTIVATE CONTAINER GATE OVERLAY" }
  ];

  // Module 11 States: RACI Board
  const m11SyncAgenda = [
    { id: "SYNC-60", date: "2026-06-19", topic: "Phoenix dust storm precision misalignment review", participants: "Auditor Amit, TL Srikrishnan, Nuro Rep" }
  ];

  // Helper to add calibration campaign
  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalTopic) return;
    const item = {
      id: `CAL-0${m2Campaigns.length + 1}`,
      topic: newCalTopic,
      date: new Date().toISOString().split("T")[0],
      alignmentJaccard: Number(newCalJaccard),
      status: Number(newCalJaccard) >= 95 ? "CALIBRATED" : "DEFERRED_RECALIBRATE"
    };
    setM2Campaigns([item, ...m2Campaigns]);
    setNewCalTopic("");
  };

  // Helper to add Coaching Huddle
  const handleAddHuddle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHuddleLabeler || !newHuddleFocus) return;
    const huddle = {
      name: newHuddleLabeler,
      focus: newHuddleFocus,
      planDate: new Date().toISOString().split("T")[0],
      status: "ASSIGNED"
    };
    setM5Huddles([huddle, ...m5Huddles]);
    setNewHuddleLabeler("");
    setNewHuddleFocus("");
  };

  // Helper to add Edge Case Ticket
  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEscSubject || !newEscCreator) return;
    const ticket = {
      id: `ESC-${800 + m6Tickets.length + 1}`,
      subject: newEscSubject,
      creator: newEscCreator,
      status: "ESCALATED_TO_NURO"
    };
    setM6Tickets([ticket, ...m6Tickets]);
    setNewEscSubject("");
    setNewEscCreator("");
  };

  // Helper to add change broadcast
  const handleAddChangeAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertText) return;
    const alert = {
      date: new Date().toISOString().split("T")[0],
      batch: "BATCH-AV-COMMON",
      text: newAlertText
    };
    setM9Alerts([alert, ...m9Alerts]);
    setNewAlertText("");
  };

  // Compute Active Tab detail
  const currentModule = QMS_MODULES_STATIC.find(m => m.id === activeTab);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs flex flex-col xl:flex-row animate-fade-in" id="qms-suite-root">
      {/* 1. Left Switcher Navigation Rails */}
      <div className="xl:w-80 bg-slate-50 border-r border-slate-200 p-6 flex flex-col justify-between shrink-0" id="qms-sidebar">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h3 className="font-display font-bold tracking-tight text-sm text-slate-800">QMS Modules Portal</h3>
          </div>
          
          <div className="space-y-1.5 flex xl:flex-col overflow-x-auto xl:overflow-visible pb-4 xl:pb-0" id="qms-tab-btns">
            {QMS_MODULES_STATIC.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab2(item.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-between shrink-0 xl:shrink border ${
                  activeTab === item.id
                    ? "bg-white border-slate-200 shadow-2xs border-l-4 border-l-indigo-600 text-indigo-600 font-extrabold"
                    : "border-transparent text-slate-500 hover:bg-slate-100/70 hover:text-slate-800"
                }`}
                id={`qms-tab-btn-${item.id}`}
              >
                <span className="truncate">{item.title}</span>
                {activeTab === item.id && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 hidden xl:inline" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-4 hidden xl:block">
          <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">QMS SYSTEM VERSION v4.5.3</p>
          <p className="text-[10px] font-mono text-slate-400">iMerit Operations steering overlay</p>
        </div>
      </div>

      {/* 2. Primary Detail Canvas */}
      {currentModule && (
        <div className="flex-1 p-6 md:p-8 space-y-8 bg-white" id="qms-content-canvas">
          {/* Module Heading */}
          <div className="border-b border-slate-200 pb-4">
            <span className="text-[10px] font-mono text-indigo-600 font-extrabold tracking-widest uppercase block mb-1">
              QUALITY CONTROL PROTOCOL CORE
            </span>
            <h2 className="text-2xl font-display font-bold tracking-tight text-slate-900">{currentModule.title}</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">{currentModule.purpose}</p>
          </div>

          {/* RACI matrix & support data */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 col-span-2">
              <h4 className="text-xs font-mono text-slate-500 font-bold tracking-wider uppercase border-b border-slate-200 pb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                RACI Governance Matrix (Explicit Owners)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-700">
                <div className="bg-white p-3 rounded-lg border border-slate-205 shadow-2xs">
                  <span className="text-emerald-750 text-emerald-700 font-bold block mb-1">RESPONSIBLE</span>
                  <span className="text-slate-600 text-[11px] font-sans font-medium">{currentModule.raci.r}</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-205 shadow-2xs">
                  <span className="text-indigo-750 text-indigo-700 font-bold block mb-1">ACCOUNTABLE</span>
                  <span className="text-slate-600 text-[11px] font-sans font-medium">{currentModule.raci.a}</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-205 shadow-2xs">
                  <span className="text-amber-750 text-amber-740 text-amber-700 font-bold block mb-1">CONSULTED</span>
                  <span className="text-slate-600 text-[11px] font-sans font-medium">{currentModule.raci.c}</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-205 shadow-2xs">
                  <span className="text-purple-750 text-purple-700 font-bold block mb-1">INFORMED</span>
                  <span className="text-slate-600 text-[11px] font-sans font-medium">{currentModule.raci.i}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-mono text-slate-500 font-bold tracking-wider uppercase border-b border-slate-200 pb-2 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Key Operational KPIs
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside font-medium leading-relaxed">
                {currentModule.kpis.map((kpi, idx) => (
                  <li key={idx} className="font-sans leading-5">{kpi}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5" id="data-support-line">
            <h4 className="text-xs font-mono text-slate-600 font-bold tracking-wider uppercase flex items-center gap-1.5 mb-2">
              <Activity className="w-4 h-4 text-teal-600" />
              Dynamic Task Tracker Data Alignment
            </h4>
            <p className="text-xs text-slate-600 font-sans leading-relaxed font-medium">
              <strong>Support Mechanic:</strong> {currentModule.dataConnection}
            </p>
          </div>

          {/* 3. Tab Specific Interactive Admin Tool Component */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-xs" id="tab-interactive-tool">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-indigo-600 animate-spin" style={{ animationDuration: "10s" }} />
                <h3 className="font-display font-extrabold text-sm text-slate-800">
                  Active Operational Utility Sandbox
                </h3>
              </div>
              <span className="bg-slate-50 px-2.5 py-0.5 border border-slate-205 rounded text-[9px] font-mono font-bold text-slate-500 uppercase">
                CLIENT SIDE SIMULATED MEMORY ENGINE
              </span>
            </div>

            {/* TAB-1: Audit & QC Process Tool */}
            {activeTab === 1 && (
              <div className="space-y-4 animate-fade-in text-slate-750">
                <p className="text-xs text-slate-500 font-medium">
                  Operate the **STQC Dynamic Review gate calculator** to establish compliant random sampling quotas on incoming AV labeling frames.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">BATCH ENVELOPE SIZE (FRAMES)</label>
                      <input
                        type="number"
                        value={m1BatchSize}
                        onChange={(e) => setM1BatchSize(Number(e.target.value))}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-3xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">CONFIDENCE LIMIT ACCURACY Target</label>
                      <select
                        value={m1Confidence}
                        onChange={(e) => setM1Confidence(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-3xs cursor-pointer"
                      >
                        <option value="90">90% Confidence Level (10% standard sample)</option>
                        <option value="95">95% Confidence Level (15% specialty sample)</option>
                        <option value="99">99% High Risk / High Dust Segments (35% lock sample)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-center space-y-2 shadow-2xs">
                    <p className="text-slate-500 text-xs font-bold text-center font-mono uppercase tracking-wide">Calculated Audit sampling load</p>
                    <p className="text-3xl font-display font-black text-center text-indigo-600">
                      {Math.round(m1BatchSize * (m1Confidence === "90" ? 0.10 : m1Confidence === "95" ? 0.15 : 0.35))} frames
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-wider font-mono">
                      Quota requirement to pass client double-blind sync
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB-2: Calibration Framework Tool */}
            {activeTab === 2 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">
                  Log joint alignment ratings on challenging sequences to track Jaccard consensus scores across V2, STQC, and Nuro blocks.
                </p>

                <form onSubmit={handleAddCampaign} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 items-end">
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">1. Sequence Annotation Topic</label>
                    <input
                      type="text"
                      placeholder="e.g. Phoenix sunset truck trailer splits"
                      value={newCalTopic}
                      onChange={(e) => setNewCalTopic(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 uppercase outline-none focus:border-indigo-500 shadow-3xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">2. Consensus Jaccard %</label>
                    <input
                      type="number"
                      step="0.1"
                      min="50"
                      max="100"
                      value={newCalJaccard}
                      onChange={(e) => setNewCalJaccard(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 shadow-3xs"
                    />
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs p-2.5 rounded-lg transition cursor-pointer shadow-xs">
                    Log Campaign consensus
                  </button>
                </form>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Logged Alignment campaigns</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {m2Campaigns.map((camp) => (
                      <div key={camp.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs flex justify-between items-center text-xs text-slate-800">
                        <div>
                          <p className="font-bold text-slate-800 font-mono text-xs">{camp.topic}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{camp.date} | ID: {camp.id}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${camp.alignmentJaccard >= 95 ? "text-emerald-600" : "text-red-500"}`}>
                            {camp.alignmentJaccard}% Consensus
                          </p>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${camp.alignmentJaccard >= 95 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-500 border border-red-100"}`}>
                            {camp.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB-3: Error Management SOP mapping */}
            {activeTab === 3 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">
                  Explore standard error class hierarchies and their indexed penalization scores designated inside client spec contracts.
                </p>
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-3xs">
                  <table className="w-full text-left text-xs text-slate-705">
                    <thead className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-bold">ERROR CATEGORY TAXONOMY</th>
                        <th className="p-3 font-bold">MAPPED DESIGN SOP DECREE</th>
                        <th className="p-3 font-bold">PENALTY RISK CLASSIFICATION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {m3Taxonomy.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-slate-800">{row.category}</td>
                          <td className="p-3 font-sans text-slate-650 font-medium">{row.targetSOP}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              row.penaltyScore.includes("Critical") ? "bg-red-50 text-red-600 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {row.penaltyScore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB-4: Certification Badger Tool */}
            {activeTab === 4 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">
                  Review accredited contributors possessing live credentials to label and review premium autonomous vehicle datasets.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {m4Certs.map((row, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-3 relative overflow-hidden shadow-xs">
                      <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-50 border-l border-b border-emerald-105 text-emerald-600 font-mono text-[9px] font-extrabold uppercase">
                        Accredited
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-sm mx-auto shadow-3xs">
                        A
                      </div>
                      <div>
                        <p className="font-mono font-bold text-xs text-slate-800">{row.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono font-bold">{row.cohort}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-md inline-block uppercase font-bold">
                          {row.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB-5: Coaching tracker */}
            {activeTab === 5 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">
                  Log team coaching huddle sessions to track and retrain low precision outliers on critical specification changes.
                </p>

                <form onSubmit={handleAddHuddle} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Target Contributor ID</label>
                    <input
                      type="text"
                      placeholder="e.g. labeler_04"
                      value={newHuddleLabeler}
                      onChange={(e) => setNewHuddleLabeler(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 shadow-3xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Retraining Skill Focus</label>
                    <input
                      type="text"
                      placeholder="e.g. Occusion edge frames splits"
                      value={newHuddleFocus}
                      onChange={(e) => setNewHuddleFocus(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 shadow-3xs"
                    />
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs p-2.5 rounded-lg transition cursor-pointer shadow-xs">
                    Book Coaching Huddle
                  </button>
                </form>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Coaching list queue</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {m5Huddles.map((h, i) => (
                      <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs text-slate-800 shadow-3xs">
                        <div>
                          <p className="font-mono text-xs text-slate-800 font-black">{h.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium font-sans">Plan Date: {h.planDate} | focus: {h.focus}</p>
                        </div>
                        <span className="bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-mono font-bold">
                          {h.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB-6: Query & Escalation Management Ticketer */}
            {activeTab === 6 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">
                  Issue Edge-case queries on the labeling floor to escalate novel visual data objects to Nuro review layers or Leads.
                </p>

                <form onSubmit={handleAddTicket} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 items-end">
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Edge case description / object</label>
                    <input
                      type="text"
                      placeholder="e.g. Heavy fog occlusion - pedestrian partially visible under headlight scatter"
                      value={newEscSubject}
                      onChange={(e) => setNewEscSubject(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 shadow-3xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Creator ID</label>
                    <input
                      type="text"
                      placeholder="e.g. labeler_12"
                      value={newEscCreator}
                      onChange={(e) => setNewEscCreator(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 shadow-3xs"
                    />
                  </div>
                  <button type="submit" className="col-span-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs p-2.5 rounded-lg transition cursor-pointer shadow-xs">
                    Submit Edge Case Escalation
                  </button>
                </form>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Active query register</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {m6Tickets.map((t) => (
                      <div key={t.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs text-slate-800 shadow-3xs">
                        <div>
                          <p className="font-bold text-slate-800 font-mono text-xs">{t.subject}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Subject Creator: {t.creator} | ID: {t.id}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          t.status === "RESOLVED" ? "bg-emerald-50 border border-emerald-100 text-emerald-600" : "bg-red-50 border border-red-100 text-red-500"
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB-7: Knowledge Base rulebook search */}
            {activeTab === 7 && (
              <div className="space-y-4 animate-fade-in text-slate-800">
                <p className="text-xs text-slate-500 font-medium">
                  Search active rule digests inside our virtual Knowledge Base repository.
                </p>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search guidelines (e.g. rain, occlusion, spleen)..."
                    value={kbQuery}
                    onChange={(e) => setKbQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-700 outline-none focus:border-indigo-500 shadow-3xs transition"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  {kbSops.filter(s => s.title.toLowerCase().includes(kbQuery.toLowerCase()) || s.content.toLowerCase().includes(kbQuery.toLowerCase())).map((sop) => (
                    <div key={sop.code} className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex justify-between font-mono text-[10px] text-indigo-600 font-bold border-b border-slate-200 pb-1">
                        <span>{sop.code}</span>
                        <span>OFFICIAL SPECIFICATION GUIDE</span>
                      </div>
                      <h4 className="text-xs font-display font-extrabold text-slate-800 pt-1 uppercase">{sop.title}</h4>
                      <p className="text-xs text-slate-600 font-sans leading-relaxed pt-1 font-medium">{sop.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB-8: QC Oversight audit */}
            {activeTab === 8 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">
                  Review standard Consensus rating score sheets of independent STQC QC Reviewers to verify oversight effectiveness.
                </p>
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-3xs">
                  <table className="w-full text-left text-xs text-slate-705">
                    <thead className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-bold">QC REVIEWER ACCOUNT</th>
                        <th className="p-3 font-bold">QC REVIEWS PASSED ACCURACY</th>
                        <th className="p-3 font-bold">DOUBLE-BLIND DISCREPANCY LIMIT</th>
                        <th className="p-3 font-bold">AUDIT STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {m8Consensus.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-slate-800">{row.reviewer}</td>
                          <td className="p-3 text-emerald-600 font-black">{row.reviewAccuracy}%</td>
                          <td className="p-3 text-slate-500 font-mono font-medium">±{row.blindAuditDiscrepancy}%</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              row.status === "EXCELLENT" ? "bg-emerald-50 border border-emerald-100 text-emerald-600" : row.status === "GOOD" ? "bg-blue-50 border border-blue-100 text-blue-600" : "bg-red-50 border border-red-100 text-red-500"
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB-9: Spec Alerts communication feed */}
            {activeTab === 9 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">
                  Broadcast instant specification amendments to V2 first-pass teams to contain incoming batch defect drifts.
                </p>

                <form onSubmit={handleAddChangeAlert} className="flex gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                  <input
                    type="text"
                    placeholder="Type urgent guidelines change announcement..."
                    value={newAlertText}
                    onChange={(e) => setNewAlertText(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 shadow-3xs"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-bold text-xs rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs">
                    <Send className="w-3.5 h-3.5" />
                    Broadcast Alert
                  </button>
                </form>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Active specimen alerts feed</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {m9Alerts.map((a, i) => (
                      <div key={i} className="bg-white p-4 border border-slate-200 rounded-xl space-y-1 shadow-3xs text-slate-800 animate-slide-in">
                        <div className="flex justify-between text-[10px] font-mono font-bold text-indigo-600">
                          <span>{a.date}</span>
                          <span>{a.batch}</span>
                        </div>
                        <p className="text-xs text-slate-650 font-sans leading-relaxed font-semibold">{a.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB-10: Drift indicators checker */}
            {activeTab === 10 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">
                  Statistical control parameters to trigger systemic containment gates prior to client-Nuro reviews.
                </p>
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-3xs">
                  <table className="w-full text-left text-xs text-slate-305">
                    <thead className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-bold">STATISTICAL DRIFT VECTOR</th>
                        <th className="p-3 font-bold">ALERT CONTROL LIMITS</th>
                        <th className="p-3 font-bold">CURRENT RATIO EXCEEDED</th>
                        <th className="p-3 font-bold">PREVENTATIVE TACTICAL TRIGGER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {m10Indicators.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition text-slate-800 font-medium">
                          <td className="p-3 font-mono font-bold text-slate-800">{row.indicator}</td>
                          <td className="p-3 font-mono text-slate-500 font-bold">{row.alertLimit}</td>
                          <td className="p-3 text-red-600 font-mono font-black">{row.currentStatus}</td>
                          <td className="p-3 text-amber-700 font-mono font-bold text-[10px] uppercase">{row.triggerAction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB-11: Weekly Governance details */}
            {activeTab === 11 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">
                  Governance sync programs scheduled to review systemic pacing parameters and recalibrate operational SLA locks.
                </p>
                <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl space-y-3 shadow-3xs">
                  <div className="flex justify-between text-[10px] font-mono text-indigo-600 font-extrabold border-b border-slate-200 pb-2">
                    <span>UPCOMING REVIEW PROTOCOL NO: SYNC-60</span>
                    <span>100% SLA COMPLIANCE REGISTER</span>
                  </div>
                  {m11SyncAgenda.map(item => (
                    <div key={item.id} className="space-y-1.5 pt-1 text-slate-800">
                      <p className="text-xs font-display font-extrabold text-slate-800 uppercase">
                        {item.topic}
                      </p>
                      <p className="text-xs text-slate-600 font-sans font-medium">
                        <strong>Date Scheduled:</strong> {item.date} | <strong>Participants:</strong> {item.participants}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
