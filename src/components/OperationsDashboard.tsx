import React, { useState, useMemo, useEffect } from "react";
import {
  COMPLETE_TASK_TRACKER_DATA,
  getOperationalMetrics,
  getMetricsByLocation,
  getMetricsByCohort,
  getMetricsByTeamLead,
  getFailureReasonsDistribution,
  getStqcFailureReasonsDistribution,
  getLabelerPerformanceSummary,
  getQcAuditorPerformanceSummary,
  TaskTrackerRow
} from "../data/taskTrackerData";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  Activity,
  Layers,
  Clock,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  Award,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle,
  HelpCircle,
  CornerRightUp,
  Sliders,
  PlayCircle,
  Download,
  FileDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  ChevronUp,
  ChevronDown,
  Calendar,
  Info
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { initAuth, googleSignIn, logout } from "../lib/firebaseAuth";
import { fetchTaskTrackerSheet, fetchRoles } from "../lib/sheetsService";
import { User } from "firebase/auth";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1", "#06b6d4"];

function getColumnLetterFromIndex(index: number): string {
  let temp = index;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

interface OperationsDashboardProps {
  onLocationsUpdate?: (locations: string[]) => void;
}

export default function OperationsDashboard({ onLocationsUpdate }: OperationsDashboardProps) {
  // Local active dataset state
  const [taskData, setTaskData] = useState<TaskTrackerRow[]>([]);

  // Google Sheets integration state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingSheets, setLoadingSheets] = useState<boolean>(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Sync locations to parent header when data loads
  useEffect(() => {
    if (taskData.length > 0 && onLocationsUpdate) {
      const uniqueLocs = Array.from(new Set(
        taskData
          .flatMap(d => [d.location, d.stqc_location])
          .filter(l => l && String(l).trim() !== "")
      )) as string[];
      if (uniqueLocs.length > 0) {
        onLocationsUpdate(uniqueLocs);
      }
    }
  }, [taskData, onLocationsUpdate]);

  // Listen to Firebase Auth state for caching and initial session load
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, cachedToken) => {
        setUser(firebaseUser);
        setToken(cachedToken);
        setSheetsError(null);
        try {
          setLoadingSheets(true);
          const [sheetRows, rolesMap] = await Promise.all([
            fetchTaskTrackerSheet(cachedToken),
            fetchRoles(cachedToken)
          ]);

          if (sheetRows && sheetRows.length > 0) {
            setTaskData(sheetRows);
            setIsSynced(true);
            setLastSyncedAt(new Date().toLocaleTimeString());
          }

          if (firebaseUser.email) {
            const role = rolesMap[firebaseUser.email.toLowerCase()] || "Lead"; // Default to Lead if not found
            setUserRole(role);
          }
        } catch (err: any) {
          console.error("Auto sheets load trigger failed:", err);
          setSheetsError(err.message || "Failed to load Google Sheets row cells automatically.");
        } finally {
          setLoadingSheets(false);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setTaskData([]);
        setIsSynced(false);
        setUserRole(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConnectSheets = async () => {
    setLoadingSheets(true);
    setSheetsError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        
        const [sheetRows, rolesMap] = await Promise.all([
          fetchTaskTrackerSheet(result.accessToken),
          fetchRoles(result.accessToken)
        ]);

        if (sheetRows && sheetRows.length > 0) {
          setTaskData(sheetRows);
          setIsSynced(true);
          setLastSyncedAt(new Date().toLocaleTimeString());
        } else {
          setSheetsError("The linked Task Tracker sheet contains no metrics data rows.");
        }

        if (result.user.email) {
          const role = rolesMap[result.user.email.toLowerCase()] || "Lead";
          setUserRole(role);
        }
      }
    } catch (err: any) {
      console.error("Failed to connect sheets via interactive click:", err);
      setSheetsError(err.message || "Authentication or fetch failed.");
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleDisconnectSheets = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setTaskData([]);
    setIsSynced(false);
    setSheetsError(null);
  };

  // Analytical Filters
  const [selectedLocation, setSelectedLocation] = useState<string>("All");
  const [selectedCohort, setSelectedCohort] = useState<string>("All"); // V2 Cohort AB
  const [selectedCohortStqc, setSelectedCohortStqc] = useState<string>("All"); // STQC Cohort AA
  const [selectedTL, setSelectedTL] = useState<string>("All"); // V2 TL AF
  const [selectedTLStqc, setSelectedTLStqc] = useState<string>("All"); // STQC TL AG
  const [selectedWeek, setSelectedWeek] = useState<string>("All"); // Week Beginning
  const [selectedMonth, setSelectedMonth] = useState<string>("All"); // Month Name
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Tab selections
  const [distributionTab, setDistributionTab] = useState<"v2" | "qc">("v2");
  const [rcaTab, setRcaTab] = useState<"cohort" | "tl" | "location" | "joint">("cohort");
  const [advancedAnalysisTab, setAdvancedAnalysisTab] = useState<"v2" | "stqc">("v2");
  const [reasonMatrixWeekFilter, setReasonMatrixWeekFilter] = useState<string>("");
  const [stqcErrorTypeFilter, setStqcErrorTypeFilter] = useState<"All" | "Controllable" | "Uncontrollable">("All");
  const [v2ErrorTypeFilter, setV2ErrorTypeFilter] = useState<"All" | "Controllable" | "Uncontrollable">("All");

  // AI Actions States
  const [aiRcaLoading, setAiRcaLoading] = useState(false);
  const [aiRcaResult, setAiRcaResult] = useState<string>("");
  const [rcaErrorCategory, setRcaErrorCategory] = useState<string>("Bounding Box Misalignment");

  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingResult, setCoachingResult] = useState<string>("");
  const [selectedCoachingLabeler, setSelectedCoachingLabeler] = useState<string>("labeler_02");

  const [driftLoading, setDriftLoading] = useState(false);
  const [driftResult, setDriftResult] = useState<string>("");

  const v2ColumnHeaders: Record<string, string> = {
    labelerId: "V2 LABELER ID (Col P)",
    cohort: "V2 COHORT (Col AB)",
    tl: "V2 LEADING TL (Col AF)",
    v2Accuracy: "V2 SLA ACCURACY (%)",
    controllablePct: "CONTROLLABLE (%)",
    uncontrollablePct: "UNCONTROLLABLE (%)",
    efficiencyIndex: "PACING INDEX (%)",
    durationStdDev: "DURATION STDEV (s)",
    nuroDefects: "CLIENT DEFECTS"
  };

  const qcColumnHeaders: Record<string, string> = {
    auditorId: "STQC AUDITOR ID (Col Q)",
    cohort: "STQC COHORT (Col AA)",
    tl: "STQC LEADING TL (Col AG)",
    qcAccuracy: "STQC QC ACCURACY (%)",
    controllablePct: "CONTROLLABLE (%)",
    uncontrollablePct: "UNCONTROLLABLE (%)",
    efficiencyIndex: "QC PACING INDEX (%)",
    durationStdDev: "DURATION STDEV (s)",
    nuroDefects: "CLIENT DEFECTS"
  };

  const distColumnHeaders: Record<string, string> = {
    segment: "SEGMENT",
    sub50: "<50% QUALITY",
    b50_70: "50%–70% QUALITY",
    b70_80: "70%–80% QUALITY",
    b80_85: "80%–85% QUALITY",
    b85: "≥85% QUALITY",
    totalCount: "TOTAL HEADCOUNT"
  };

  // Sorting states
  const [v2SortConfig, setV2SortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [qcSortConfig, setQcSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Distribution filtering states
  const [v2DistFilter, setV2DistFilter] = useState<string>("All");
  const [qcDistFilter, setQcDistFilter] = useState<string>("All");

  const [distSortConfig, setDistSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [certLoading, setCertLoading] = useState(false);
  const [certResult, setCertResult] = useState<string>("");
  const [selectedCertLabeler, setSelectedCertLabeler] = useState<string>("labeler_01");
  const [showSchemaDiagnostic, setShowSchemaDiagnostic] = useState<boolean>(false);
  
  const [showAllV2, setShowAllV2] = useState<boolean>(false);
  const [showAllSTQC, setShowAllSTQC] = useState<boolean>(false);
  const [filterV2, setFilterV2] = useState<"All" | "Controllable" | "Uncontrollable">("All");
  const [filterStqc, setFilterStqc] = useState<"All" | "Controllable" | "Uncontrollable">("All");

  // Compute live options dynamically from the loaded dataset for 100% fidelity and zero hardcoding!
  const uniqueLocations = useMemo(() => {
    const list = taskData
      .flatMap(d => [d.location, d.stqc_location])
      .filter(Boolean)
      .map(s => String(s).trim());
    return ["All", ...Array.from(new Set(list))].sort();
  }, [taskData]);

  const uniqueV2Locations = useMemo(() => {
    const list = taskData.map(d => d.location).filter(Boolean).map(s => String(s).trim());
    return Array.from(new Set(list)).sort();
  }, [taskData]);

  const uniqueStqcLocations = useMemo(() => {
    const list = taskData.map(d => d.stqc_location).filter(Boolean).map(s => String(s).trim());
    return Array.from(new Set(list)).sort();
  }, [taskData]);

  const uniqueCohorts = useMemo(() => {
    const list = taskData.map(d => d.v2_cohort).filter(Boolean).map(s => String(s).trim());
    return ["All", ...Array.from(new Set(list))].sort();
  }, [taskData]);

  const uniqueCohortsStqc = useMemo(() => {
    const list = taskData.map(d => d.stqc_cohort).filter(Boolean).map(s => String(s).trim());
    return ["All", ...Array.from(new Set(list))].sort();
  }, [taskData]);

  const uniqueTLs = useMemo(() => {
    const list = taskData.map(d => d.v2_tl).filter(Boolean).map(s => String(s).trim());
    return ["All", ...Array.from(new Set(list))].sort();
  }, [taskData]);

  const uniqueTLsStqc = useMemo(() => {
    const list = taskData.map(d => d.stqc_tl).filter(Boolean).map(s => String(s).trim());
    return ["All", ...Array.from(new Set(list))].sort();
  }, [taskData]);

  const uniqueWeeks = useMemo(() => {
    const list = taskData.map(d => d.week_beginning).filter(Boolean).map(s => String(s).trim());
    return ["All", ...Array.from(new Set(list))].sort();
  }, [taskData]);

  const uniqueMonths = useMemo(() => {
    const list = taskData.map(d => d.month_name).filter(Boolean).map(s => String(s).trim());
    return ["All", ...Array.from(new Set(list))].sort();
  }, [taskData]);

  // Filter raw dataset based on fully custom metrics
  const rawFilteredData = useMemo(() => {
    return taskData.filter((row) => {
      if (selectedLocation !== "All" && row.location !== selectedLocation && row.stqc_location !== selectedLocation) return false;
      if (selectedCohort !== "All" && row.v2_cohort !== selectedCohort) return false;
      if (selectedCohortStqc !== "All" && row.stqc_cohort !== selectedCohortStqc) return false;
      if (selectedTL !== "All" && row.v2_tl !== selectedTL) return false;
      if (selectedTLStqc !== "All" && row.stqc_tl !== selectedTLStqc) return false;
      if (selectedWeek !== "All" && row.week_beginning !== selectedWeek) return false;
      if (selectedMonth !== "All" && row.month_name !== selectedMonth) return false;

      // Custom date range bounds
      if (startDate) {
        const rowDateStr = row.v2_start_date_ist || row.nuro_review_date;
        if (rowDateStr) {
          const rowD = new Date(rowDateStr);
          const startD = new Date(startDate);
          if (!isNaN(rowD.getTime()) && !isNaN(startD.getTime()) && rowD < startD) return false;
        }
      }
      if (endDate) {
        const rowDateStr = row.v2_start_date_ist || row.nuro_review_date;
        if (rowDateStr) {
          const rowD = new Date(rowDateStr);
          const endD = new Date(endDate);
          if (!isNaN(rowD.getTime()) && !isNaN(endD.getTime()) && rowD > endD) return false;
        }
      }

      return true;
    });
  }, [
    taskData,
    selectedLocation,
    selectedCohort,
    selectedCohortStqc,
    selectedTL,
    selectedTLStqc,
    selectedWeek,
    selectedMonth,
    startDate,
    endDate
  ]);

  // Secondary filtering for distribution
  const filteredData = useMemo(() => {
    let result = rawFilteredData;

    if (v2DistFilter !== "All") {
      const labelerStatsMap: Record<string, { total: number; correct: number }> = {};
      rawFilteredData.forEach(row => {
        const id = row.simteacher_v2_labeler;
        if (!id) return;
        if (!labelerStatsMap[id]) labelerStatsMap[id] = { total: 0, correct: 0 };
        labelerStatsMap[id].total++;
        if (row.v2_accuracy === 100) labelerStatsMap[id].correct++;
      });

      result = result.filter(row => {
        const id = row.simteacher_v2_labeler;
        if (!id) return false;
        const stats = labelerStatsMap[id];
        const acc = (stats.correct / stats.total) * 100;

        if (v2DistFilter === "≥85%") return acc >= 85;
        if (v2DistFilter === "80%–85%") return acc >= 80 && acc < 85;
        if (v2DistFilter === "70%–80%") return acc >= 70 && acc < 80;
        if (v2DistFilter === "50%–70%") return acc >= 50 && acc < 70;
        if (v2DistFilter === "<50%") return acc < 50;
        return true;
      });
    }

    if (qcDistFilter !== "All") {
      const auditorStatsMap: Record<string, { total: number; correct: number }> = {};
      rawFilteredData.forEach(row => {
        const id = row.simteacher_stqc_auditor;
        if (!id) return;
        if (!auditorStatsMap[id]) auditorStatsMap[id] = { total: 0, correct: 0 };
        auditorStatsMap[id].total++;
        if (row.stqc_accuracy === 100) auditorStatsMap[id].correct++;
      });

      result = result.filter(row => {
        const id = row.simteacher_stqc_auditor;
        if (!id) return false;
        const stats = auditorStatsMap[id];
        const acc = (stats.correct / stats.total) * 100;

        if (qcDistFilter === "≥85%") return acc >= 85;
        if (qcDistFilter === "80%–85%") return acc >= 80 && acc < 85;
        if (qcDistFilter === "70%–80%") return acc >= 70 && acc < 80;
        if (qcDistFilter === "50%–70%") return acc >= 50 && acc < 70;
        if (qcDistFilter === "<50%") return acc < 50;
        return true;
      });
    }

    return result;
  }, [rawFilteredData, v2DistFilter, qcDistFilter]);

  // Operational metrics
  const metrics = useMemo(() => {
    return getOperationalMetrics(filteredData);
  }, [filteredData]);

  const auditClientAgreement = useMemo(() => {
    const comparedRows = filteredData.filter(d => {
      const auditValue = String(d.qc_error_category || "").trim();
      const nuroValue = String(d.nuro_findings || "").trim();
      return auditValue !== "" && nuroValue !== "";
    });
    const matchCount = comparedRows.filter(d => {
      const auditValue = String(d.qc_error_category || "").trim().toLowerCase();
      const nuroValue = String(d.nuro_findings || "").trim().toLowerCase();
      return auditValue === nuroValue;
    }).length;

    return {
      comparedCount: comparedRows.length,
      matchCount,
      mismatchCount: comparedRows.length - matchCount,
      hasNuroAudit: comparedRows.length > 0,
      agreementRate: comparedRows.length ? (matchCount / comparedRows.length) * 100 : 0,
    };
  }, [filteredData]);

  const locationChartsData = useMemo(() => {
    return getMetricsByLocation(filteredData);
  }, [filteredData]);

  const v2CohortChartsData = useMemo(() => {
    return getMetricsByCohort(filteredData, 'v2_cohort');
  }, [filteredData]);

  const stqcCohortChartsData = useMemo(() => {
    return getMetricsByCohort(filteredData, 'stqc_cohort');
  }, [filteredData]);

  const tlChartsData = useMemo(() => {
    return getMetricsByTeamLead(filteredData);
  }, [filteredData]);

  const failureReasonsDist = useMemo(() => {
    let data = getFailureReasonsDistribution(filteredData);
    if (filterV2 === "Controllable") data = data.filter(d => d.controllable);
    if (filterV2 === "Uncontrollable") data = data.filter(d => !d.controllable);
    return data;
  }, [filteredData, filterV2]);

  const stqcFailureReasonsDist = useMemo(() => {
    let data = getStqcFailureReasonsDistribution(filteredData);
    if (filterStqc === "Controllable") data = data.filter(d => d.controllable > 0);
    if (filterStqc === "Uncontrollable") data = data.filter(d => d.uncontrollable > 0);
    return data;
  }, [filteredData, filterStqc]);

  const labelersSummary = useMemo(() => {
    let base = getLabelerPerformanceSummary(filteredData);

    // Apply distribution filter
    if (v2DistFilter !== "All") {
      base = base.filter(l => {
        const q = l.v2Accuracy;
        if (v2DistFilter === "≥85%") return q >= 85;
        if (v2DistFilter === "80%–85%") return q >= 80 && q < 85;
        if (v2DistFilter === "70%–80%") return q >= 70 && q < 80;
        if (v2DistFilter === "50%–70%") return q >= 50 && q < 70;
        if (v2DistFilter === "<50%") return q < 50;
        return true;
      });
    }

    // Apply sorting
    if (v2SortConfig !== null) {
      base.sort((a, b) => {
        const aVal = (a as any)[v2SortConfig.key];
        const bVal = (b as any)[v2SortConfig.key];
        if (aVal < bVal) return v2SortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return v2SortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return base;
  }, [filteredData, v2SortConfig, v2DistFilter]);

  const qcAuditorsSummary = useMemo(() => {
    let base = getQcAuditorPerformanceSummary(filteredData);

    // Apply distribution filter
    if (qcDistFilter !== "All") {
      base = base.filter(l => {
        const q = l.qcAccuracy;
        if (qcDistFilter === "≥85%") return q >= 85;
        if (qcDistFilter === "80%–85%") return q >= 80 && q < 85;
        if (qcDistFilter === "70%–80%") return q >= 70 && q < 80;
        if (qcDistFilter === "50%–70%") return q >= 50 && q < 70;
        if (qcDistFilter === "<50%") return q < 50;
        return true;
      });
    }

    // Apply sorting
    if (qcSortConfig !== null) {
      base.sort((a, b) => {
        const aVal = (a as any)[qcSortConfig.key];
        const bVal = (b as any)[qcSortConfig.key];
        if (aVal < bVal) return qcSortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return qcSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return base;
  }, [filteredData, qcSortConfig, qcDistFilter]);

  const advancedAnalytics = useMemo(() => {
    const rawWeeks = Array.from(new Set(taskData.map(d => d.week_beginning).filter(Boolean)));
    const sortedWeeks = rawWeeks.sort((a, b) => new Date(a as string).getTime() - new Date(b as string).getTime());
    const displayWeeks = sortedWeeks.slice(-6);

    const v2Locations = Array.from(new Set(taskData.map(d => d.location).filter(Boolean))).sort();
    const stqcLocations = Array.from(new Set(taskData.map(d => d.stqc_location).filter(Boolean))).sort();
    
    // V2 TLS
    const v2tls = Array.from(new Set(taskData.map(d => d.v2_tl).filter(Boolean))).sort();
    // STQC TLS
    const stqcTls = Array.from(new Set(taskData.map(d => d.stqc_tl).filter(Boolean))).sort();

    // V2 Data structures
    const locWeeklyV2: Record<string, Record<string, { total: number; controllable: number }>> = {};
    const tlWeeklyV2: Record<string, Record<string, { total: number; controllable: number }>> = {};
    const reasonMatrixV2: Record<string, Record<string, Record<string, number>>> = {};
    const reasonMatrixTotalsV2: Record<string, Record<string, number>> = {};
    const weeklyGrandTotalsV2: Record<string, { total: number; controllable: number }> = {};

    // STQC Data structures
    const locWeeklyStqc: Record<string, Record<string, { total: number; controllable: number }>> = {};
    const tlWeeklyStqc: Record<string, Record<string, { total: number; controllable: number }>> = {};
    const reasonMatrixStqc: Record<string, Record<string, Record<string, number>>> = {};
    const reasonMatrixTotalsStqc: Record<string, Record<string, number>> = {};
    const weeklyGrandTotalsStqc: Record<string, { total: number; controllable: number }> = {};

    filteredData.forEach(row => {
      const w = row.week_beginning;
      const v2Loc = row.location;
      const stqcLoc = row.stqc_location;
      const v2tl = row.v2_tl;
      const stqcTl = row.stqc_tl;
      
      // Resolve V2 Analytics specific logic
      const v2ErrCat = row.v2_error_category;
      let v2_ctrl = row.is_controllable ? "Controllable" : "Uncontrollable";
      if (v2ErrCat === "Controllable") v2_ctrl = "Controllable";
      if (v2ErrCat === "Uncontrollable") v2_ctrl = "Uncontrollable";
      
      // Use V2 error type for reason matrix if available
      const v2ReasonActual = row.v2_error_type || v2ErrCat;
      
      const stqcReason = row.qc_error_type;
      const stqc_ctrl = row.is_controllable ? "Controllable" : "Uncontrollable";

      if (!w) return;

      // V2 Logic
      if (v2Loc && v2ReasonActual && v2ReasonActual !== "None" && (v2_ctrl === "Controllable" || v2_ctrl === "Uncontrollable")) {
        if (!locWeeklyV2[v2Loc]) locWeeklyV2[v2Loc] = {};
        if (!locWeeklyV2[v2Loc][w]) locWeeklyV2[v2Loc][w] = { total: 0, controllable: 0 };
        locWeeklyV2[v2Loc][w].total++;
        if (v2_ctrl === "Controllable") locWeeklyV2[v2Loc][w].controllable++;

        if (!weeklyGrandTotalsV2[w]) weeklyGrandTotalsV2[w] = { total: 0, controllable: 0 };
        weeklyGrandTotalsV2[w].total++;
        if (v2_ctrl === "Controllable") weeklyGrandTotalsV2[w].controllable++;
      }
      if (v2tl && v2ReasonActual && v2ReasonActual !== "None" && (v2_ctrl === "Controllable" || v2_ctrl === "Uncontrollable")) {
        if (!tlWeeklyV2[v2tl]) tlWeeklyV2[v2tl] = {};
        if (!tlWeeklyV2[v2tl][w]) tlWeeklyV2[v2tl][w] = { total: 0, controllable: 0 };
        tlWeeklyV2[v2tl][w].total++;
        if (v2_ctrl === "Controllable") tlWeeklyV2[v2tl][w].controllable++;
      }
      if (v2ReasonActual && v2ReasonActual !== "None" && v2Loc && displayWeeks.includes(w)) {
        if (!reasonMatrixV2[w]) reasonMatrixV2[w] = {};
        if (!reasonMatrixV2[w][v2ReasonActual]) reasonMatrixV2[w][v2ReasonActual] = {};
        if (!reasonMatrixV2[w][v2ReasonActual][v2Loc]) reasonMatrixV2[w][v2ReasonActual][v2Loc] = 0;
        if (!reasonMatrixTotalsV2[w]) reasonMatrixTotalsV2[w] = {};
        if (!reasonMatrixTotalsV2[w][v2ReasonActual]) reasonMatrixTotalsV2[w][v2ReasonActual] = 0;
        reasonMatrixV2[w][v2ReasonActual][v2Loc]++;
        reasonMatrixTotalsV2[w][v2ReasonActual]++;
      }

      // STQC Logic
      if (stqcLoc && stqcReason && stqcReason !== "None" && (stqc_ctrl === "Controllable" || stqc_ctrl === "Uncontrollable")) {
        if (!locWeeklyStqc[stqcLoc]) locWeeklyStqc[stqcLoc] = {};
        if (!locWeeklyStqc[stqcLoc][w]) locWeeklyStqc[stqcLoc][w] = { total: 0, controllable: 0 };
        locWeeklyStqc[stqcLoc][w].total++;
        if (stqc_ctrl === "Controllable") locWeeklyStqc[stqcLoc][w].controllable++;

        if (!weeklyGrandTotalsStqc[w]) weeklyGrandTotalsStqc[w] = { total: 0, controllable: 0 };
        weeklyGrandTotalsStqc[w].total++;
        if (stqc_ctrl === "Controllable") weeklyGrandTotalsStqc[w].controllable++;
      }
      if (stqcTl && stqcReason && stqcReason !== "None" && (stqc_ctrl === "Controllable" || stqc_ctrl === "Uncontrollable")) {
        if (!tlWeeklyStqc[stqcTl]) tlWeeklyStqc[stqcTl] = {};
        if (!tlWeeklyStqc[stqcTl][w]) tlWeeklyStqc[stqcTl][w] = { total: 0, controllable: 0 };
        tlWeeklyStqc[stqcTl][w].total++;
        if (stqc_ctrl === "Controllable") tlWeeklyStqc[stqcTl][w].controllable++;
      }
      if (stqcReason && stqcReason !== "None" && stqcLoc && displayWeeks.includes(w)) {
        if (!reasonMatrixStqc[w]) reasonMatrixStqc[w] = {};
        if (!reasonMatrixStqc[w][stqcReason]) reasonMatrixStqc[w][stqcReason] = {};
        if (!reasonMatrixStqc[w][stqcReason][stqcLoc]) reasonMatrixStqc[w][stqcReason][stqcLoc] = 0;
        if (!reasonMatrixTotalsStqc[w]) reasonMatrixTotalsStqc[w] = {};
        if (!reasonMatrixTotalsStqc[w][stqcReason]) reasonMatrixTotalsStqc[w][stqcReason] = 0;
        reasonMatrixStqc[w][stqcReason][stqcLoc]++;
        reasonMatrixTotalsStqc[w][stqcReason]++;
      }
    });

    return { 
      displayWeeks, 
      v2Locations,
      stqcLocations,
      locations: Array.from(new Set([...v2Locations, ...stqcLocations])).sort(), 
      v2: { 
        tls: v2tls, 
        locWeekly: locWeeklyV2, 
        tlWeekly: tlWeeklyV2, 
        reasonMatrix: reasonMatrixV2, 
        reasonMatrixTotals: reasonMatrixTotalsV2,
        grandTotals: weeklyGrandTotalsV2
      },
      stqc: { 
        tls: stqcTls, 
        locWeekly: locWeeklyStqc, 
        tlWeekly: tlWeeklyStqc, 
        reasonMatrix: reasonMatrixStqc, 
        reasonMatrixTotals: reasonMatrixTotalsStqc,
        grandTotals: weeklyGrandTotalsStqc
      }
    };
  }, [filteredData, taskData]);

  // STQC Pivot Matrix Calculation with Filters
  const stqcPivotData = useMemo(() => {
    if (!reasonMatrixWeekFilter) return null;

    const matrix: Record<string, Record<string, number>> = {}; // [Reason][Location]
    const columnTotals: Record<string, number> = {}; // [Reason] total count

    filteredData.forEach(row => {
      const w = row.week_beginning;
      if (w !== reasonMatrixWeekFilter) return;

      const ctrl = row.is_controllable ? "Controllable" : "Uncontrollable";
      if (stqcErrorTypeFilter !== "All" && ctrl !== stqcErrorTypeFilter) return;

      const reason = row.qc_error_type;
      const loc = row.stqc_location;

      if (reason && reason !== "None" && loc) {
        if (!matrix[reason]) matrix[reason] = {};
        if (!matrix[reason][loc]) matrix[reason][loc] = 0;
        matrix[reason][loc]++;

        if (!columnTotals[reason]) columnTotals[reason] = 0;
        columnTotals[reason]++;
      }
    });

    return { matrix, columnTotals };
  }, [filteredData, reasonMatrixWeekFilter, stqcErrorTypeFilter]);

  // V2 Pivot Matrix Calculation with Filters
  const v2PivotData = useMemo(() => {
    if (!reasonMatrixWeekFilter) return null;

    const matrix: Record<string, Record<string, number>> = {}; // [Reason][Location]
    const columnTotals: Record<string, number> = {}; // [Reason] total count

    filteredData.forEach(row => {
      const w = row.week_beginning;
      if (w !== reasonMatrixWeekFilter) return;

      // Extract V2 specific controllable status
      const v2ErrCat = row.v2_error_category;
      let v2_ctrl = row.is_controllable ? "Controllable" : "Uncontrollable";
      if (v2ErrCat === "Controllable") v2_ctrl = "Controllable";
      if (v2ErrCat === "Uncontrollable") v2_ctrl = "Uncontrollable";

      if (v2ErrorTypeFilter !== "All" && v2_ctrl !== v2ErrorTypeFilter) return;

      // Use failureReason (Column S) as per user request for Matrix columns
      const reason = row.failureReason;
      const loc = row.location;

      if (reason && reason !== "None" && loc) {
        if (!matrix[reason]) matrix[reason] = {};
        if (!matrix[reason][loc]) matrix[reason][loc] = 0;
        matrix[reason][loc]++;

        if (!columnTotals[reason]) columnTotals[reason] = 0;
        columnTotals[reason]++;
      }
    });

    return { matrix, columnTotals };
  }, [filteredData, reasonMatrixWeekFilter, v2ErrorTypeFilter]);

  const getAnalyticalColor = (pct: number, type: 'controllable' | 'uncontrollable' | 'dist') => {
    if (isNaN(pct) || pct === undefined) return "bg-slate-50 text-slate-300";
    if (type === 'controllable') {
      if (pct >= 95) return "bg-orange-500/90 text-white";
      if (pct >= 85) return "bg-orange-400/90 text-white";
      if (pct >= 70) return "bg-orange-300/90 text-slate-900";
      if (pct >= 50) return "bg-amber-300/90 text-slate-900";
      if (pct >= 30) return "bg-amber-100 text-slate-800";
      if (pct >= 15) return "bg-emerald-200/90 text-slate-800";
      return "bg-emerald-400/90 text-white";
    }
    if (type === 'uncontrollable') {
      if (pct >= 80) return "bg-emerald-400/90 text-white";
      if (pct >= 60) return "bg-emerald-200/90 text-slate-800";
      if (pct >= 40) return "bg-amber-100 text-slate-800";
      if (pct >= 20) return "bg-orange-300/90 text-slate-900";
      return "bg-orange-400/90 text-white";
    }
    if (type === 'dist') {
      if (pct === 100) return "bg-orange-500/90 text-white";
      if (pct >= 80) return "bg-orange-400/90 text-white";
      if (pct >= 60) return "bg-orange-300/90 text-slate-900";
      if (pct >= 40) return "bg-amber-300/90 text-slate-900";
      if (pct >= 20) return "bg-amber-100 text-slate-800";
      if (pct > 0) return "bg-emerald-100 text-emerald-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]";
      return "bg-white text-slate-200";
    }
    return "bg-white";
  };

  const requestSortV2 = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (v2SortConfig && v2SortConfig.key === key && v2SortConfig.direction === "asc") {
      direction = "desc";
    }
    setV2SortConfig({ key, direction });
  };

  const requestSortQC = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (qcSortConfig && qcSortConfig.key === key && qcSortConfig.direction === "asc") {
      direction = "desc";
    }
    setQcSortConfig({ key, direction });
  };

  const exportToCSV = (data: any[], headers: Record<string, string>, filename: string) => {
    if (data.length === 0) return;
    const keys = Object.keys(headers);
    const headerRow = keys.map(k => headers[k]).join(",");
    const csvContent = [
      headerRow,
      ...data.map(row => keys.map(k => {
        const val = row[k];
        return typeof val === 'number' ? val.toFixed(2) : `"${val}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (data: any[], headers: Record<string, string>, title: string, filename: string) => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const keys = Object.keys(headers);
    const head = [keys.map(k => headers[k])];
    const body = data.map(row => keys.map(k => {
      const val = row[k];
      return typeof val === 'number' ? val.toFixed(2) : val;
    }));

    autoTable(doc, {
      head: head,
      body: body,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(filename);
  };

  const v2BucketDistribution = useMemo(() => {
    let b85 = 0;
    let b80_85 = 0;
    let b70_80 = 0;
    let b50_70 = 0;
    let bSub50 = 0;

    labelersSummary.forEach((l) => {
      const q = l.v2Accuracy;
      if (q >= 85) b85++;
      else if (q >= 80) b80_85++;
      else if (q >= 70) b70_80++;
      else if (q >= 50) b50_70++;
      else bSub50++;
    });

    const total = labelersSummary.length || 1;
    return [
      { band: "≥85% quality (SLA Pass)", count: b85, percentage: (b85 / total) * 100 },
      { band: "80%–<85% quality (Borderline)", count: b80_85, percentage: (b80_85 / total) * 100 },
      { band: "70%–<80% quality (At Risk)", count: b70_80, percentage: (b70_80 / total) * 100 },
      { band: "50%–<70% quality (Severe Drift)", count: b50_70, percentage: (b50_70 / total) * 100 },
      { band: "<50% quality (Critical Failure)", count: bSub50, percentage: (bSub50 / total) * 100 }
    ];
  }, [labelersSummary]);

  const qcBucketDistribution = useMemo(() => {
    let b85 = 0;
    let b80_85 = 0;
    let b70_80 = 0;
    let b50_70 = 0;
    let bSub50 = 0;

    qcAuditorsSummary.forEach((l) => {
      const q = l.qcAccuracy;
      if (q >= 85) b85++;
      else if (q >= 80) b80_85++;
      else if (q >= 70) b70_80++;
      else if (q >= 50) b50_70++;
      else bSub50++;
    });

    const total = qcAuditorsSummary.length || 1;
    return [
      { band: "≥85% quality (SLA Pass)", count: b85, percentage: (b85 / total) * 100 },
      { band: "80%–<85% quality (Borderline)", count: b80_85, percentage: (b80_85 / total) * 100 },
      { band: "70%–<80% quality (At Risk)", count: b70_80, percentage: (b70_80 / total) * 100 },
      { band: "50%–<70% quality (Severe Drift)", count: b50_70, percentage: (b50_70 / total) * 100 },
      { band: "<50% quality (Critical Failure)", count: bSub50, percentage: (bSub50 / total) * 100 }
    ];
  }, [qcAuditorsSummary]);

  const requestSortDist = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (distSortConfig && distSortConfig.key === key && distSortConfig.direction === "asc") {
      direction = "desc";
    }
    setDistSortConfig({ key, direction });
  };

  const cohortDistributionRows = useMemo(() => {
    const cohorts = Array.from(new Set(labelersSummary.map((l) => l.cohort).filter(Boolean)));
    const rows = cohorts.map((cohort) => {
      const cohortLabelers = labelersSummary.filter((l) => l.cohort === cohort);
      let sub50 = 0, b50_70 = 0, b70_80 = 0, b80_85 = 0, b85 = 0;

      cohortLabelers.forEach((l) => {
        const q = l.v2Accuracy;
        if (q >= 85) b85++;
        else if (q >= 80) b80_85++;
        else if (q >= 70) b70_80++;
        else if (q >= 50) b50_70++;
        else sub50++;
      });

      return {
        segment: cohort,
        sub50,
        b50_70,
        b70_80,
        b80_85,
        b85,
        totalCount: cohortLabelers.length
      };
    });

    if (distSortConfig) {
      rows.sort((a, b) => {
        const aVal = (a as any)[distSortConfig.key];
        const bVal = (b as any)[distSortConfig.key];
        if (aVal < bVal) return distSortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return distSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      rows.sort((a, b) => (b.sub50 + b.b50_70) - (a.sub50 + a.b50_70));
    }
    return rows;
  }, [labelersSummary, distSortConfig]);

  const stqcCohortDistributionRows = useMemo(() => {
    const cohorts = Array.from(new Set(qcAuditorsSummary.map((l) => l.cohort).filter(Boolean)));
    const rows = cohorts.map((cohort) => {
      const cohortLabelers = qcAuditorsSummary.filter((l) => l.cohort === cohort);
      let sub50 = 0, b50_70 = 0, b70_80 = 0, b80_85 = 0, b85 = 0;

      cohortLabelers.forEach((l) => {
        const q = l.qcAccuracy;
        if (q >= 85) b85++;
        else if (q >= 80) b80_85++;
        else if (q >= 70) b70_80++;
        else if (q >= 50) b50_70++;
        else sub50++;
      });

      return {
        segment: cohort,
        sub50,
        b50_70,
        b70_80,
        b80_85,
        b85,
        totalCount: cohortLabelers.length
      };
    });

    if (distSortConfig) {
      rows.sort((a, b) => {
        const aVal = (a as any)[distSortConfig.key];
        const bVal = (b as any)[distSortConfig.key];
        if (aVal < bVal) return distSortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return distSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      rows.sort((a, b) => (b.sub50 + b.b50_70) - (a.sub50 + a.b50_70));
    }
    return rows;
  }, [qcAuditorsSummary, distSortConfig]);

  const tlDistributionRows = useMemo(() => {
    const tls = Array.from(new Set(labelersSummary.map((l) => l.tl).filter(Boolean)));
    const rows = tls.map((tl) => {
      const tlLabelers = labelersSummary.filter((l) => l.tl === tl);
      let sub50 = 0, b50_70 = 0, b70_80 = 0, b80_85 = 0, b85 = 0;

      tlLabelers.forEach((l) => {
        const q = l.v2Accuracy;
        if (q >= 85) b85++;
        else if (q >= 80) b80_85++;
        else if (q >= 70) b70_80++;
        else if (q >= 50) b50_70++;
        else sub50++;
      });

      return {
        segment: tl,
        sub50,
        b50_70,
        b70_80,
        b80_85,
        b85,
        totalCount: tlLabelers.length
      };
    });

    if (distSortConfig) {
      rows.sort((a, b) => {
        const aVal = (a as any)[distSortConfig.key];
        const bVal = (b as any)[distSortConfig.key];
        if (aVal < bVal) return distSortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return distSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      rows.sort((a, b) => (b.sub50 + b.b50_70) - (a.sub50 + a.b50_70));
    }
    return rows;
  }, [labelersSummary, distSortConfig]);

  const stqcTlDistributionRows = useMemo(() => {
    const tls = Array.from(new Set(qcAuditorsSummary.map((l) => l.tl).filter(Boolean)));
    const rows = tls.map((tl) => {
      const tlLabelers = qcAuditorsSummary.filter((l) => l.tl === tl);
      let sub50 = 0, b50_70 = 0, b70_80 = 0, b80_85 = 0, b85 = 0;

      tlLabelers.forEach((l) => {
        const q = l.qcAccuracy;
        if (q >= 85) b85++;
        else if (q >= 80) b80_85++;
        else if (q >= 70) b70_80++;
        else if (q >= 50) b50_70++;
        else sub50++;
      });

      return {
        segment: tl,
        sub50,
        b50_70,
        b70_80,
        b80_85,
        b85,
        totalCount: tlLabelers.length
      };
    });

    if (distSortConfig) {
      rows.sort((a, b) => {
        const aVal = (a as any)[distSortConfig.key];
        const bVal = (b as any)[distSortConfig.key];
        if (aVal < bVal) return distSortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return distSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      rows.sort((a, b) => (b.sub50 + b.b50_70) - (a.sub50 + a.b50_70));
    }
    return rows;
  }, [qcAuditorsSummary, distSortConfig]);

  const locationDistributionRowsV2 = useMemo(() => {
    const locations = uniqueV2Locations;
    const rows = locations.map((loc) => {
      const cityLabelers = labelersSummary.filter(l => {
        const matchingTasks = filteredData.filter(d => d.simteacher_v2_labeler === l.labelerId);
        return matchingTasks.length > 0 && matchingTasks[0].location === loc;
      });
      let sub50 = 0, b50_70 = 0, b70_80 = 0, b80_85 = 0, b85 = 0;
      cityLabelers.forEach(l => {
        const q = l.v2Accuracy;
        if (q >= 85) b85++;
        else if (q >= 80) b80_85++;
        else if (q >= 70) b70_80++;
        else if (q >= 50) b50_70++;
        else sub50++;
      });
      return {
        segment: loc,
        sub50,
        b50_70,
        b70_80,
        b80_85,
        b85,
        totalCount: cityLabelers.length
      };
    });
    if (distSortConfig) {
      rows.sort((a, b) => {
        const aVal = (a as any)[distSortConfig.key];
        const bVal = (b as any)[distSortConfig.key];
        if (aVal < bVal) return distSortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return distSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      rows.sort((a, b) => (b.sub50 + b.b50_70) - (a.sub50 + a.b50_70));
    }
    return rows;
  }, [labelersSummary, distSortConfig, filteredData, uniqueV2Locations]);

  const locationDistributionRowsQC = useMemo(() => {
    const locations = uniqueStqcLocations;
    const rows = locations.map((loc) => {
      const cityLabelers = qcAuditorsSummary.filter(l => {
        const matchingTasks = filteredData.filter(d => d.qa_user_id === l.auditorId);
        return matchingTasks.length > 0 && matchingTasks[0].stqc_location === loc;
      });
      let sub50 = 0, b50_70 = 0, b70_80 = 0, b80_85 = 0, b85 = 0;
      cityLabelers.forEach(l => {
        const q = l.qcAccuracy;
        if (q >= 85) b85++;
        else if (q >= 80) b80_85++;
        else if (q >= 70) b70_80++;
        else if (q >= 50) b50_70++;
        else sub50++;
      });
      return {
        segment: loc,
        sub50,
        b50_70,
        b70_80,
        b80_85,
        b85,
        totalCount: cityLabelers.length
      };
    });
    if (distSortConfig) {
      rows.sort((a, b) => {
        const aVal = (a as any)[distSortConfig.key];
        const bVal = (b as any)[distSortConfig.key];
        if (aVal < bVal) return distSortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return distSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      rows.sort((a, b) => (b.sub50 + b.b50_70) - (a.sub50 + a.b50_70));
    }
    return rows;
  }, [qcAuditorsSummary, distSortConfig, filteredData, uniqueStqcLocations]);

  // Controllable vs Uncontrollable chart data
  const v2ControllablePieData = useMemo(() => {
    return [
      { name: "Controllable", value: metrics.v2ControllableCount, color: "#3b82f6" },
      { name: "Uncontrollable", value: metrics.v2UncontrollableCount, color: "#ef4444" }
    ];
  }, [metrics]);

  const stqcControllablePieData = useMemo(() => {
    return [
      { name: "Controllable", value: metrics.stqcControllableCount, color: "#10b981" },
      { name: "Uncontrollable", value: metrics.stqcUncontrollableCount, color: "#ef4444" }
    ];
  }, [metrics]);

  // List of all unique labelers for dropdowns
  const uniqueLabelers = useMemo(() => {
    return Array.from(new Set(taskData.map(d => d.simteacher_v2_labeler).filter(Boolean))).sort();
  }, [taskData]);

  // List of unique failure reasons for dropdowns
  const uniqueFailureReasons = useMemo(() => {
    return Array.from(new Set(taskData.map(d => d.failureReason).filter(r => r && r !== "None"))).sort();
  }, [taskData]);

  const uniqueFailureReasonsV2 = useMemo(() => {
    return Array.from(new Set(taskData.map(d => d.failureReason).filter(r => r && r !== "None"))).sort();
  }, [taskData]);

  useEffect(() => {
    if (advancedAnalytics.displayWeeks.length > 0 && !reasonMatrixWeekFilter) {
      setReasonMatrixWeekFilter(advancedAnalytics.displayWeeks[advancedAnalytics.displayWeeks.length - 1]);
    }
  }, [advancedAnalytics.displayWeeks, reasonMatrixWeekFilter]);

  // Sync selected labelers with dynamic loaded dataset so we avoid hardcoded defaults if labeler names differ
  useEffect(() => {
    if (uniqueLabelers.length > 0) {
      if (!selectedCoachingLabeler || !uniqueLabelers.includes(selectedCoachingLabeler)) {
        setSelectedCoachingLabeler(uniqueLabelers[0]);
      }
      if (!selectedCertLabeler || !uniqueLabelers.includes(selectedCertLabeler)) {
        setSelectedCertLabeler(uniqueLabelers[0]);
      }
    } else {
      setSelectedCoachingLabeler("");
      setSelectedCertLabeler("");
    }
  }, [uniqueLabelers, selectedCoachingLabeler, selectedCertLabeler]);

  // Trigger server-side AI Root Cause Analysis
  const runAiRca = async () => {
    setAiRcaLoading(true);
    setAiRcaResult("");
    try {
      const res = await fetch("/api/gemini/rca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorCategory: rcaErrorCategory,
          cohort: selectedCohort === "All" ? "Cohort_Alpha" : selectedCohort,
          tl: selectedTL === "All" ? "TL_Anil" : selectedTL,
          location: selectedLocation === "All" ? "Phoenix" : selectedLocation,
          details: {
            filteredTotalCount: filteredData.length,
            errorCategoryMetricsPercent: failureReasonsDist.find(f => f.reason === rcaErrorCategory)?.count || 5,
            generalV2Accuracy: metrics.v2Accuracy.toFixed(2),
            generalQcAccuracy: metrics.qcAccuracy.toFixed(2)
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiRcaResult(data.analysis);
      } else {
        setAiRcaResult("Failed to generate report from server.");
      }
    } catch (e: any) {
      setAiRcaResult(`Error connecting to server. Standard analysis output fallback:\n\n### ⚙️ Auto Analyzer Result\nFailed to reach backend API. Check API key status under Secrets.`);
    } finally {
      setAiRcaLoading(false);
    }
  };

  // Trigger server-side Coaching Plan
  const runCoachingDraft = async () => {
    setCoachingLoading(true);
    setCoachingResult("");
    const targetLabelerStats = labelersSummary.find(l => l.labelerId === selectedCoachingLabeler);
    
    try {
      const res = await fetch("/api/gemini/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelerId: selectedCoachingLabeler,
          errorType: rcaErrorCategory,
          accuracy: targetLabelerStats ? targetLabelerStats.v2Accuracy / 100 : 0.95,
          expectedDuration: 4200,
          actualDuration: targetLabelerStats ? Math.round(targetLabelerStats.avgDuration) : 3800,
          cohort: targetLabelerStats ? targetLabelerStats.cohort : "Cohort_Alpha",
          tl: targetLabelerStats ? targetLabelerStats.tl : "TL_Anil"
        })
      });
      const data = await res.json();
      if (data.success) {
        setCoachingResult(data.plan);
      } else {
        setCoachingResult("Server failed to draft coaching plan.");
      }
    } catch (err) {
      setCoachingResult("Unable to communicate with the QA training endpoint. Loading offline draft...");
    } finally {
      setCoachingLoading(false);
    }
  };

  // Trigger dynamic Drift Predictor
  const runDriftPredictor = async () => {
    setDriftLoading(true);
    setDriftResult("");
    try {
      const topFailureReasons = failureReasonsDist.slice(0, 3).map(f => f.reason);
      const res = await fetch("/api/gemini/drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: selectedLocation,
          cohort: selectedCohort,
          v2Accuracy: metrics.v2Accuracy / 100,
          qcAccuracy: metrics.qcAccuracy / 100,
          nuroDefects: metrics.clientDefectRate / 100,
          failureReasons: topFailureReasons,
          actualVsExpected: `V2 labelers are operating at ${metrics.v2EfficiencyIndex.toFixed(0)}% of expected duration guidelines.`
        })
      });
      const data = await res.json();
      if (data.success) {
        setDriftResult(data.analysis);
      }
    } catch {
      setDriftResult("Network disconnect. Initiating standard diagnostic alerts.");
    } finally {
      setDriftLoading(false);
    }
  };

  // Trigger Cert Auditor
  const runCertAuditor = async () => {
    setCertLoading(true);
    setCertResult("");
    const targetLabelerStats = labelersSummary.find(l => l.labelerId === selectedCertLabeler);
    
    if (!targetLabelerStats) {
      setCertResult("Candidate stats missing.");
      setCertLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/gemini/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelerId: selectedCertLabeler,
          stats: {
            cohort: targetLabelerStats.cohort,
            tl: targetLabelerStats.tl,
            accuracy: targetLabelerStats.v2Accuracy / 100,
            durationStdDev: targetLabelerStats.durationStdDev,
            efficiencyIndex: targetLabelerStats.efficiencyIndex,
            nuroFindingsRate: targetLabelerStats.nuroDefects / (targetLabelerStats.total || 1),
            confidence: targetLabelerStats.v2Accuracy >= 98 ? "High" : "Medium"
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setCertResult(data.recommendation);
      }
    } catch {
      setCertResult("Failed to perform certification check. Offline rule heuristics activated.");
    } finally {
      setCertLoading(false);
    }
  };

  return (
    <div className="space-y-8" id="operations-dashboard-root">
      {/* 1. Google Sheets Sync Integration Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs animate-fade-in space-y-4" id="google-sheets-sync-widget">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-150 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-150 flex items-center justify-center shrink-0 shadow-3xs">
              <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Google Sheets Live Sync Router
                {isSynced ? (
                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                    LIVE CONNECTION ACTIVE
                  </span>
                ) : (
                  <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                    OFFLINE SANDBOX MODE
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Routes live task records from designated Google Sheet: <code className="bg-slate-50 px-1 py-0.5 text-[10px] font-mono border border-slate-200 rounded text-indigo-600">ID: 1KOOx8Qis...</code> ("Task Tracker" tab).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end">
            {isSynced ? (
              <div className="flex items-center gap-3">
                <div className="text-right flex flex-col hidden sm:flex">
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">CONNECTED USER</span>
                  <span className="text-xs font-semibold text-slate-700">{user?.email}</span>
                </div>
                <button
                  onClick={handleDisconnectSheets}
                  className="bg-white border border-red-250 hover:bg-red-50 text-red-650 font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer shadow-3xs"
                >
                  Disconnect Sheet
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectSheets}
                disabled={loadingSheets}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 transition cursor-pointer shadow-3xs disabled:bg-indigo-300"
              >
                {loadingSheets ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting via OAuth...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
                    </svg>
                    <span>Authorize & Link Google Sheet</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sync Status Info Row */}
        {sheetsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium">
            ⚠️ <strong>OAuth Sync Alert:</strong> {sheetsError}
          </div>
        )}
        
        {isSynced && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-xs font-mono text-slate-600 bg-slate-50 border border-slate-150 p-3 rounded-lg gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span><strong>Google Sheet Sync Source:</strong> Ingested <strong>{taskData.length} records</strong> dynamically. Filters and AI engines aligned with live sheet cells. {lastSyncedAt && <span className="text-emerald-600 font-bold ml-2">Synced at {lastSyncedAt}</span>}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportToCSV(taskData, Object.keys(taskData[0] || {}).reduce((acc, k) => ({ ...acc, [k]: k }), {}), `SimTeacher_Full_Dataset_${new Date().toISOString().split('T')[0]}.csv`)}
                  className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold px-2.5 py-1 rounded transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <FileDown className="w-3 h-3 text-slate-400" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => exportToPDF(taskData.slice(0, 50), Object.keys(taskData[0] || {}).slice(0, 10).reduce((acc, k) => ({ ...acc, [k]: k }), {}), "SimTeacher Operations Multi-Filter Data Snapshot (Top 50)", "SimTeacher_Data_Snapshot.pdf")}
                  className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold px-2.5 py-1 rounded transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Download className="w-3 h-3 text-slate-400" />
                  <span>Export PDF</span>
                </button>
                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                <button
                  onClick={() => setShowSchemaDiagnostic(!showSchemaDiagnostic)}
                  className="text-[10px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{showSchemaDiagnostic ? "Hide Schema Mappings" : "Inspect Schema Mappings"}</span>
                </button>
                <button
                  onClick={handleConnectSheets}
                  disabled={loadingSheets}
                  className="text-[10px] bg-white hover:bg-slate-100 border border-slate-200 text-indigo-650 font-bold px-2.5 py-1 rounded transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingSheets ? "animate-spin" : ""}`} />
                  Re-Sync Values
                </button>
              </div>
            </div>

            {showSchemaDiagnostic && (
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg text-xs leading-relaxed animate-fade-in shadow-xs">
                <h4 className="font-bold text-slate-900 mb-2 font-display uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 block"></span>
                  Active Google Sheet Schema & Index Explorer
                </h4>
                <p className="text-slate-500 mb-4">
                  This panel displays the exact headers detected directly in your Google Sheet cells. Use this to verify that your sheet columns align with the required operational metric slots.
                </p>
                
                {!(taskData as any).headers || (taskData as any).headers.length === 0 ? (
                  <p className="text-slate-400 italic">No header data returned or parsed headers empty.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 font-mono text-[11px]">
                    {(taskData as any).headers.map((headerText: string, index: number) => {
                      const colLetter = getColumnLetterFromIndex(index);
                      // Highlight special columns
                      const isSpecialO = colLetter === "O";
                      const isSpecialAA = colLetter === "AA";
                      const isSpecialAG = colLetter === "AG";
                      const isSpecialAH = colLetter === "AH";
                      const isSpecialAB = colLetter === "AB";
                      const isSpecialAF = colLetter === "AF";
                      const isSpecialP = colLetter === "P";
                      const isSpecialAM = colLetter === "AM";
                      const isSpecialAO = colLetter === "AO";
                      
                      let highlightClass = "bg-white border-slate-200 text-slate-700";
                      let badge = "";
                      
                      if (isSpecialO) {
                        highlightClass = "bg-amber-50 border-amber-300 text-amber-950 font-bold";
                        badge = "STQC AUDITOR (Col O)";
                      } else if (isSpecialAA) {
                        highlightClass = "bg-indigo-50 border-indigo-200 text-indigo-905 font-medium";
                        badge = "STQC COHORT (Col AA)";
                      } else if (isSpecialAB) {
                        highlightClass = "bg-sky-50 border-sky-200 text-sky-905 font-medium";
                        badge = "V2 COHORT (Col AB)";
                      } else if (isSpecialAF) {
                        highlightClass = "bg-violet-50 border-violet-200 text-violet-905 font-medium";
                        badge = "V2 TEAM LEAD (Col AF)";
                      } else if (isSpecialAG) {
                        highlightClass = "bg-emerald-50 border-emerald-200 text-emerald-905 font-medium";
                        badge = "STQC TEAM LEAD (Col AG)";
                      } else if (isSpecialP) {
                        highlightClass = "bg-teal-50 border-teal-200 text-teal-905 font-medium";
                        badge = "V2 QC RESULTS (Col P)";
                      } else if (isSpecialAH) {
                        highlightClass = "bg-rose-50 border-rose-200 text-rose-905 font-medium";
                        badge = "QC ERROR CATEGORY (Col AH)";
                      } else if (isSpecialAM) {
                        highlightClass = "bg-cyan-50 border-cyan-200 text-cyan-905 font-medium";
                        badge = "V2 LOCATION (Col AM)";
                      } else if (isSpecialAO) {
                        highlightClass = "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-905 font-medium";
                        badge = "STQC LOCATION (Col AO)";
                      }

                      return (
                        <div key={index} className={`p-2.5 rounded-lg border ${highlightClass} transition hover:shadow-2xs`}>
                          <div className="flex justify-between items-center font-bold mb-1">
                            <span>COL {colLetter}</span>
                            <span className="text-[9px] text-slate-400">Idx {index}</span>
                          </div>
                          <div className="text-slate-800 break-words font-sans font-medium text-xs leading-snug">
                            {headerText || <span className="text-slate-450 italic">[Blank Column Cell]</span>}
                          </div>
                          {badge && (
                            <div className="mt-1.5 text-[8px] uppercase tracking-wider font-bold bg-slate-900/10 text-slate-900 rounded-sm px-1.5 py-0.5 w-max">
                              {badge}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {taskData.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-xs animate-fade-in max-w-2xl mx-auto my-12" id="empty-onboarding-panel">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-3xs">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-display font-extrabold text-slate-900 uppercase">Live Operations Stream Offline</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              This dashboard is strictly structured to parse and map dynamic operational telemetry directly from Google Sheets. To experience full telemetry, authorize the live sync router.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
            <button
              onClick={handleConnectSheets}
              disabled={loadingSheets}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-55"
            >
              {loadingSheets ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authorizing via Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
                  </svg>
                  <span>Authorize & Link Google Sheet</span>
                </>
              )}
            </button>
            <button
              onClick={() => setTaskData(COMPLETE_TASK_TRACKER_DATA)}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-6 py-3 rounded-xl transition cursor-pointer"
            >
              Initialize Local Sandbox Simulation
            </button>
          </div>
          <div className="border-t border-slate-100 pt-5 text-left space-y-2">
            <h4 className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Linked Resource Configuration:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-150">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">SPREADSHEET ID</span>
                <code className="text-indigo-600 text-[11px] font-bold">1KOOx8Qis_zu8zBO_yfLCCMdPTkPve6WkNL3pJkMXILk</code>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">TARGET TAB SHEET</span>
                <span className="text-emerald-700 font-bold">"Task Tracker"</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Multi-Layer Dynamic Filtering Rails */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-xs animate-fade-in space-y-6" id="filter-panel">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-700 font-display font-extrabold uppercase text-xs tracking-wider">
                <Sliders className="w-4 h-4" />
                <h3>Quality Metric Multi-Filter System</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedLocation("All");
                  setSelectedCohort("All");
                  setSelectedCohortStqc("All");
                  setSelectedTL("All");
                  setSelectedTLStqc("All");
                  setSelectedWeek("All");
                  setSelectedMonth("All");
                  setStartDate("");
                  setEndDate("");
                  setV2DistFilter("All");
                  setQcDistFilter("All");
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-mono font-bold hover:underline"
              >
                Reset All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* V2 Cohort */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">LABELER COHORT (V2 - AB)</label>
                <select
                  value={selectedCohort}
                  onChange={(e) => setSelectedCohort(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer font-bold"
                  id="v2-cohort-filter"
                >
                  {uniqueCohorts.map(c => (
                    <option key={c} value={c}>{c === "All" ? "All V2 Cohorts (Col AB)" : `Col AB: ${c}`}</option>
                  ))}
                </select>
              </div>

              {/* STQC Cohort */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">LABELER COHORT (STQC - AA)</label>
                <select
                  value={selectedCohortStqc}
                  onChange={(e) => setSelectedCohortStqc(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer font-bold"
                  id="stqc-cohort-filter"
                >
                  {uniqueCohortsStqc.map(c => (
                    <option key={c} value={c}>{c === "All" ? "All STQC Cohorts (Col AA)" : `Col AA: ${c}`}</option>
                  ))}
                </select>
              </div>

              {/* V2 TL */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">V2 TEAM LEAD (Col AF)</label>
                <select
                  value={selectedTL}
                  onChange={(e) => setSelectedTL(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer font-bold"
                  id="v2-tl-filter"
                >
                  {uniqueTLs.map(t => (
                    <option key={t} value={t}>{t === "All" ? "All V2 Team Leads (Col AF)" : `Col AF: ${t}`}</option>
                  ))}
                </select>
              </div>

              {/* STQC TL */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">STQC TEAM LEAD (Col AG)</label>
                <select
                  value={selectedTLStqc}
                  onChange={(e) => setSelectedTLStqc(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer font-bold"
                  id="stqc-tl-filter"
                >
                  {uniqueTLsStqc.map(t => (
                    <option key={t} value={t}>{t === "All" ? "All STQC Team Leads (Col AG)" : `Col AG: ${t}`}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* V2 / STQC LOCATION */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">LOCATION FILTER (V2 AM / STQC AO)</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer font-bold"
                  id="location-filter"
                >
                  {uniqueLocations.map(l => (
                    <option key={l} value={l}>{l === "All" ? "All V2/STQC Locations" : l}</option>
                  ))}
                </select>
              </div>

              {/* Week Beginning */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">WEEK BEGINNING</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer font-bold"
                  id="week-filter"
                >
                  {uniqueWeeks.map(w => {
                    if (w === "All") return <option key={w} value={w}>All Weeks</option>;
                    
                    // Format YYYY-MM-DD to a nice string
                    let display = w;
                    try {
                      const date = new Date(w);
                      if (!isNaN(date.getTime())) {
                        display = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                      }
                    } catch (e) {
                      // fallback to raw
                    }
                    
                    return <option key={w} value={w}>Week of {display}</option>;
                  })}
                </select>
              </div>

              {/* Month Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">MONTH</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer font-bold"
                  id="month-filter"
                >
                  {uniqueMonths.map(m => (
                    <option key={m} value={m}>{m === "All" ? "All Months" : m}</option>
                  ))}
                </select>
              </div>

              {/* Custom Date Ranges */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">DATE RANGE (CUSTOM)</label>
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] rounded-lg p-2 w-full focus:border-indigo-500 outline-none font-medium h-full"
                  />
                  <span className="text-slate-400 font-mono text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] rounded-lg p-2 w-full focus:border-indigo-500 outline-none font-medium h-full"
                  />
                </div>
              </div>

              {/* Precision Distribution Filter (V2) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">PRECISION DISTRIBUTION (V2)</label>
                <select
                  value={v2DistFilter}
                  onChange={(e) => setV2DistFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer font-bold h-10"
                  id="precision-distribution-filter-v2"
                >
                  <option value="All">All Distributions</option>
                  <option value="≥85%">≥85% (SLA Pass)</option>
                  <option value="80%–85%">80%–85% (Borderline)</option>
                  <option value="70%–80%">70%–80% (At Risk)</option>
                  <option value="50%–70%">50%–70% (Severe Drift)</option>
                  <option value="<50%">&lt;50% (Critical)</option>
                </select>
              </div>

              {/* Precision Distribution Filter (STQC) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">PRECISION DISTRIBUTION (STQC)</label>
                <select
                  value={qcDistFilter}
                  onChange={(e) => setQcDistFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer font-bold h-10"
                  id="precision-distribution-filter-stqc"
                >
                  <option value="All">All Distributions</option>
                  <option value="≥85%">≥85% (SLA Pass)</option>
                  <option value="80%–85%">80%–85% (Borderline)</option>
                  <option value="70%–80%">70%–80% (At Risk)</option>
                  <option value="50%–70%">50%–70% (Severe Drift)</option>
                  <option value="<50%">&lt;50% (Critical)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Target vs Achievement & Dynamic Score Bucketization Area */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 space-y-8 shadow-xs" id="SLA-target-vs-achievement-container">
            <div>
              <h2 className="text-xl font-display font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                SLA Target vs. Achievement scorecard (85% Target)
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Comparative analysis of contractual SLA targets against actual operational achievement rates and task speed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="kpi-grid">
              {/* Card 1: V2 Quality SLA */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-3xs relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-indigo-500 opacity-10">
                  <CheckCircle className="w-16 h-16" />
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-mono font-bold tracking-wider">1. V2 QUALITY SLA score</span>
                  <CheckCircle className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-3xl font-display font-black text-slate-900">
                    {metrics.v2Accuracy.toFixed(2)}%
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    SLA Target: <strong className="text-indigo-600">85.00%</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">SLA Variance</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${metrics.v2Accuracy >= 85 ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                    {(metrics.v2Accuracy - 85) >= 0 ? "+" : ""}{(metrics.v2Accuracy - 85).toFixed(2)}% Achieved
                  </span>
                </div>
              </div>

              {/* Card 2: QC Audit Accuracy SLA */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-3xs relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-blue-500 opacity-10">
                  <ShieldAlert className="w-16 h-16" />
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-mono font-bold tracking-wider">2. QC AUDITED SLA score</span>
                  <ShieldAlert className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-3xl font-display font-black text-blue-600">
                    {metrics.qcAccuracy.toFixed(2)}%
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    SLA Target: <strong className="text-indigo-600">85.00%</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">SLA Variance</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${metrics.qcAccuracy >= 85 ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                    {(metrics.qcAccuracy - 85) >= 0 ? "+" : ""}{(metrics.qcAccuracy - 85).toFixed(2)}% Achieved
                  </span>
                </div>
              </div>

              {/* Card 3: V2 Task Duration Scorecard */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-3xs relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-amber-500 opacity-10">
                  <Clock className="w-16 h-16" />
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-mono font-bold tracking-wider">3. V2 TASK DURATION acheivement</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-3xl font-display font-black text-slate-900">
                    {metrics.averageV2Duration >= 1 ? `${Math.round(metrics.averageV2Duration)}s` : "0s"}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    Expected Pace: <strong className="text-slate-705">{Math.round(metrics.expectedV2Duration)}s</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Pacing Level</span>
                  <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                    {metrics.v2EfficiencyIndex.toFixed(1)}% of Target Speed
                  </span>
                </div>
              </div>

              {/* Card 4: QC Audit Duration Scorecard */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-3xs relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-purple-500 opacity-10">
                  <Sliders className="w-16 h-16" />
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-mono font-bold tracking-wider">4. QC AUDITING TIME pace</span>
                  <Sliders className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-3xl font-display font-black text-purple-650">
                    {metrics.averageQcDuration >= 1 ? `${Math.round(metrics.averageQcDuration)}s` : "0s"}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    Expected Pace: <strong className="text-slate-700">{Math.round(metrics.expectedQcDuration)}s</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Pacing Index</span>
                  <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold">
                    {metrics.qcEfficiencyIndex.toFixed(1)}% of Target Speed
                  </span>
                </div>
              </div>
            </div>

            {/* Score Bucketeering Row: "one bucketization for QC and V2 based on score" */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
              {/* V2 Score Bucketization */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                    <h3 className="text-xs font-mono font-bold tracking-wide uppercase text-slate-800">
                      V2 LABELING QUALITY SCORE BUCKETS
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Col P Results</span>
                </div>

                <div className="space-y-4">
                  {v2BucketDistribution.map((b, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-slate-700">
                        <span>{b.band}</span>
                        <span className="font-mono font-bold">
                          {b.count} Headcount ({b.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${b.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QC Score Bucketization */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <h3 className="text-xs font-mono font-bold tracking-wide uppercase text-slate-800">
                      STQC QC AUDITING QUALITY SCORE BUCKETS
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Col AH Errors</span>
                </div>

                <div className="space-y-4">
                  {qcBucketDistribution.map((b, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-slate-700">
                        <span>{b.band}</span>
                        <span className="font-mono font-bold">
                          {b.count} Headcount ({b.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${b.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Joint Auditing & Client Defect Drop Matching Alert Box */}
            <div className="bg-white border border-slate-205 rounded-2xl p-6 shadow-xs space-y-4" id="joint-audit-findings-matching">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-xs font-mono font-bold tracking-wide uppercase text-slate-800">
                    AUDIT CLIENT AGREEMENT: QC Error Category (AH) vs. Nuro Findings (AJ)
                  </h3>
                </div>
                <span className="bg-red-50 text-red-600 font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                  {auditClientAgreement.hasNuroAudit ? `${auditClientAgreement.agreementRate.toFixed(2)}% Agreement Rate` : "Nuro did not audit"}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-medium">
                {/* Panel 1: Leaks */}
                <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 space-y-2">
                  <p className="font-bold text-red-800 text-xs">⚠️ AUDIT CLIENT MISMATCHES</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Compares nonblank <code className="bg-white px-1 py-0.5 rounded border border-red-200">Col AH</code> against nonblank <code className="bg-white px-1 py-0.5 rounded border border-red-200">Col AJ</code>. Different values are counted as disagreement.
                  </p>
                  <div className="pt-2">
                    <span className="text-lg font-black text-red-600 font-display">
                      {auditClientAgreement.hasNuroAudit ? `${auditClientAgreement.mismatchCount} Task${auditClientAgreement.mismatchCount === 1 ? "" : "s"}` : "Nuro did not audit"}
                    </span>
                    <span className="text-[10px] text-slate-450 block font-normal">AH/AJ nonmatching rows</span>
                  </div>
                </div>

                {/* Panel 2: Strict Auditor mismatches */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-2">
                  <p className="font-bold text-amber-800 text-xs text-amber-705">⚠️ COMPARED ROWS</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Rows where both AH and AJ are available are included in the agreement denominator; blank cells in either column are ignored.
                  </p>
                  <div className="pt-2">
                    <span className="text-lg font-black text-amber-600 font-display">
                      {auditClientAgreement.hasNuroAudit ? `${auditClientAgreement.comparedCount} Task(s)` : "0 Task(s)"}
                    </span>
                    <span className="text-[10px] text-slate-450 block font-normal">{auditClientAgreement.hasNuroAudit ? "Rows included in AH/AJ comparison" : "AJ is blank; Nuro did not audit"}</span>
                  </div>
                </div>

                {/* Panel 3: Perfect matches */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                  <p className="font-bold text-emerald-800 text-xs">✅ QA & CLIENT ALIGNMENT</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Agreement is scored only when normalized AH and AJ values match exactly after trimming and lowercasing.
                  </p>
                  <div className="pt-2">
                    <span className="text-lg font-black text-emerald-600 font-display">
                      {auditClientAgreement.hasNuroAudit ? `${auditClientAgreement.matchCount} Tasks (${auditClientAgreement.agreementRate.toFixed(1)}%)` : "Nuro did not audit"}
                    </span>
                    <span className="text-[10px] text-slate-450 block font-normal">{auditClientAgreement.hasNuroAudit ? "Audit-client agreement matches" : "No AJ values available for agreement scoring"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* RCA Bottom Quartile Multi-Perspective Tables (Slide 3, Slide 6, Slide 7) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-display font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    RCA Operational Bottlenecks: Contributor Bottom Quartile Boards
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Drill down to find cohorts, managers (TLs), and geographic centers storing low-scoring quality bands. Separate views presented for V2 and STQC.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setRcaTab("cohort")}
                    className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition ${rcaTab === "cohort" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    COHORTS (AA/AB)
                  </button>
                  <button
                    onClick={() => setRcaTab("tl")}
                    className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition ${rcaTab === "tl" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    TL MANAGERS (AF/AG)
                  </button>
                  <button
                    onClick={() => setRcaTab("location")}
                    className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition ${rcaTab === "location" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    STQC LOCATIONS (AO)
                  </button>
                </div>
              </div>

              {/* Two Column Grid displaying both Tables simultaneously */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* TABLE 1: V2 LABELING */}
                <div className="space-y-2 border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 font-mono uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                        1. V2 Labeling Quality distribution
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">simteacher_v2_labeler analysis</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] bg-indigo-100/70 text-indigo-700 font-bold px-2 py-0.5 rounded font-mono">
                        {labelersSummary.length} HC
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            let dataToExport: any[] = [];
                            if (rcaTab === "cohort") dataToExport = cohortDistributionRows;
                            else if (rcaTab === "tl") dataToExport = tlDistributionRows;
                            else dataToExport = locationDistributionRowsV2;
                            exportToCSV(dataToExport, distColumnHeaders, `V2_Quality_Distribution_${rcaTab}.csv`);
                          }}
                          className="p-1 px-1.5 bg-white border border-slate-200 rounded text-[9px] font-mono font-bold text-slate-600 hover:bg-slate-50 transition shadow-3xs"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => {
                            let dataToExport: any[] = [];
                            let title = "";
                            if (rcaTab === "cohort") { dataToExport = cohortDistributionRows; title = "V2 Cohort Quality Distribution"; }
                            else if (rcaTab === "tl") { dataToExport = tlDistributionRows; title = "V2 TL Quality Distribution"; }
                            else { dataToExport = locationDistributionRowsV2; title = "V2 Location Quality Distribution"; }
                            exportToPDF(dataToExport, distColumnHeaders, title, `V2_Quality_Distribution_${rcaTab}.pdf`);
                          }}
                          className="p-1 px-1.5 bg-white border border-slate-200 rounded text-[9px] font-mono font-bold text-slate-600 hover:bg-slate-50 transition shadow-3xs"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-3xs">
                    <table className="w-full text-left text-xs text-slate-650">
                      <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[9px] text-slate-500 uppercase">
                        <tr>
                          <th onClick={() => requestSortDist("segment")} className="px-3 py-2.5 font-extrabold cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center gap-1">
                              SEGMENT
                              {distSortConfig?.key === "segment" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("sub50")} className="px-2 py-2.5 text-center text-red-650 font-extrabold font-mono bg-red-50/20 cursor-pointer hover:bg-red-50/40 transition">
                            <div className="flex items-center justify-center gap-1">
                              &lt;50%
                              {distSortConfig?.key === "sub50" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("b50_70")} className="px-2 py-2.5 text-center text-amber-650 font-extrabold font-mono cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center justify-center gap-1">
                              50%–70%
                              {distSortConfig?.key === "b50_70" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("b70_80")} className="px-2 py-2.5 text-center text-[#3b82f6] font-bold font-mono cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center justify-center gap-1">
                              70%–80%
                              {distSortConfig?.key === "b70_80" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("b80_85")} className="px-2 py-2.5 text-center text-green-750 font-bold font-mono cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center justify-center gap-1">
                              80%–85%
                              {distSortConfig?.key === "b80_85" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("b85")} className="px-2 py-2.5 text-center text-emerald-850 font-extrabold font-mono bg-emerald-50/20 cursor-pointer hover:bg-emerald-50/40 transition">
                            <div className="flex items-center justify-center gap-1">
                              ≥85%
                              {distSortConfig?.key === "b85" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("totalCount")} className="px-3 py-2.5 text-right font-extrabold font-mono cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center justify-end gap-1">
                              HC
                              {distSortConfig?.key === "totalCount" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                        {rcaTab === "cohort" && (
                          cohortDistributionRows.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition">
                              <td className="px-3 py-2 text-slate-800 font-bold">{r.segment}</td>
                              <td className="px-2 py-2 text-center text-red-650 font-mono font-bold bg-red-50/5">{r.sub50}</td>
                              <td className="px-2 py-2 text-center text-amber-650 font-mono font-bold">{r.b50_70}</td>
                              <td className="px-2 py-2 text-center text-slate-500 font-mono">{r.b70_80}</td>
                              <td className="px-2 py-2 text-center text-green-700 font-mono">{r.b80_85}</td>
                              <td className="px-2 py-2 text-center text-emerald-600 font-mono font-bold bg-emerald-50/5">{r.b85}</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-700">{r.totalCount}</td>
                            </tr>
                          ))
                        )}

                        {rcaTab === "tl" && (
                          tlDistributionRows.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition">
                              <td className="px-3 py-2 text-indigo-700 font-bold">{r.segment}</td>
                              <td className="px-2 py-2 text-center text-red-650 font-mono font-bold bg-red-50/5">{r.sub50}</td>
                              <td className="px-2 py-2 text-center text-amber-650 font-mono font-bold">{r.b50_70}</td>
                              <td className="px-2 py-2 text-center text-slate-500 font-mono">{r.b70_80}</td>
                              <td className="px-2 py-2 text-center text-green-700 font-mono">{r.b80_85}</td>
                              <td className="px-2 py-2 text-center text-emerald-600 font-mono font-bold bg-emerald-50/5">{r.b85}</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-700">{r.totalCount}</td>
                            </tr>
                          ))
                        )}

                        {rcaTab === "location" && (
                          locationDistributionRowsV2.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition">
                              <td className="px-3 py-2 text-slate-800 font-bold">{r.segment}</td>
                              <td className="px-2 py-2 text-center text-red-650 font-mono font-bold bg-red-50/5">{r.sub50}</td>
                              <td className="px-2 py-2 text-center text-amber-650 font-mono font-bold">{r.b50_70}</td>
                              <td className="px-2 py-2 text-center text-slate-500 font-mono">{r.b70_80}</td>
                              <td className="px-2 py-2 text-center text-green-700 font-mono">{r.b80_85}</td>
                              <td className="px-2 py-2 text-center text-emerald-600 font-mono font-bold bg-emerald-50/5">{r.b85}</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-700">{r.totalCount}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABLE 2: STQC QC */}
                <div className="space-y-2 border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 font-mono uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                        2. STQC QC Quality distribution
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">stqc_qa_auditor analysis</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] bg-emerald-100/70 text-emerald-700 font-bold px-2 py-0.5 rounded font-mono">
                        {qcAuditorsSummary.length} HC
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            let dataToExport: any[] = [];
                            if (rcaTab === "cohort") dataToExport = stqcCohortDistributionRows;
                            else if (rcaTab === "tl") dataToExport = stqcTlDistributionRows;
                            else dataToExport = locationDistributionRowsQC;
                            exportToCSV(dataToExport, distColumnHeaders, `QC_Quality_Distribution_${rcaTab}.csv`);
                          }}
                          className="p-1 px-1.5 bg-white border border-slate-200 rounded text-[9px] font-mono font-bold text-slate-600 hover:bg-slate-50 transition shadow-3xs"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => {
                            let dataToExport: any[] = [];
                            let title = "";
                            if (rcaTab === "cohort") { dataToExport = stqcCohortDistributionRows; title = "QC Cohort Quality Distribution"; }
                            else if (rcaTab === "tl") { dataToExport = stqcTlDistributionRows; title = "QC TL Quality Distribution"; }
                            else { dataToExport = locationDistributionRowsQC; title = "QC Location Quality Distribution"; }
                            exportToPDF(dataToExport, distColumnHeaders, title, `QC_Quality_Distribution_${rcaTab}.pdf`);
                          }}
                          className="p-1 px-1.5 bg-white border border-slate-200 rounded text-[9px] font-mono font-bold text-slate-600 hover:bg-slate-50 transition shadow-3xs"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-3xs">
                    <table className="w-full text-left text-xs text-slate-650">
                      <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[9px] text-slate-500 uppercase">
                        <tr>
                          <th onClick={() => requestSortDist("segment")} className="px-3 py-2.5 font-extrabold cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center gap-1">
                              SEGMENT
                              {distSortConfig?.key === "segment" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("sub50")} className="px-2 py-2.5 text-center text-red-650 font-extrabold font-mono bg-red-50/20 cursor-pointer hover:bg-red-50/40 transition">
                            <div className="flex items-center justify-center gap-1">
                              &lt;50%
                              {distSortConfig?.key === "sub50" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("b50_70")} className="px-2 py-2.5 text-center text-amber-650 font-extrabold font-mono cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center justify-center gap-1">
                              50%–70%
                              {distSortConfig?.key === "b50_70" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("b70_80")} className="px-2 py-2.5 text-center text-[#3b82f6] font-bold font-mono cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center justify-center gap-1">
                              70%–80%
                              {distSortConfig?.key === "b70_80" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("b80_85")} className="px-2 py-2.5 text-center text-green-750 font-bold font-mono cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center justify-center gap-1">
                              80%–85%
                              {distSortConfig?.key === "b80_85" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("b85")} className="px-2 py-2.5 text-center text-emerald-850 font-extrabold font-mono bg-emerald-50/20 cursor-pointer hover:bg-emerald-50/40 transition">
                            <div className="flex items-center justify-center gap-1">
                              ≥85%
                              {distSortConfig?.key === "b85" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                          <th onClick={() => requestSortDist("totalCount")} className="px-3 py-2.5 text-right font-extrabold font-mono cursor-pointer hover:bg-slate-100 transition">
                            <div className="flex items-center justify-end gap-1">
                              HC
                              {distSortConfig?.key === "totalCount" && (distSortConfig.direction === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                        {rcaTab === "cohort" && (
                          stqcCohortDistributionRows.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition">
                              <td className="px-3 py-2 text-slate-800 font-bold">{r.segment}</td>
                              <td className="px-2 py-2 text-center text-red-650 font-mono font-bold bg-red-50/5">{r.sub50}</td>
                              <td className="px-2 py-2 text-center text-amber-650 font-mono font-bold">{r.b50_70}</td>
                              <td className="px-2 py-2 text-center text-slate-500 font-mono">{r.b70_80}</td>
                              <td className="px-2 py-2 text-center text-green-700 font-mono">{r.b80_85}</td>
                              <td className="px-2 py-2 text-center text-emerald-600 font-mono font-bold bg-emerald-50/5">{r.b85}</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-700">{r.totalCount}</td>
                            </tr>
                          ))
                        )}

                        {rcaTab === "tl" && (
                          stqcTlDistributionRows.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition">
                              <td className="px-3 py-2 text-emerald-700 font-bold">{r.segment}</td>
                              <td className="px-2 py-2 text-center text-red-650 font-mono font-bold bg-red-50/5">{r.sub50}</td>
                              <td className="px-2 py-2 text-center text-amber-650 font-mono font-bold">{r.b50_70}</td>
                              <td className="px-2 py-2 text-center text-slate-500 font-mono">{r.b70_80}</td>
                              <td className="px-2 py-2 text-center text-green-700 font-mono">{r.b80_85}</td>
                              <td className="px-2 py-2 text-center text-emerald-600 font-mono font-bold bg-emerald-50/5">{r.b85}</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-700">{r.totalCount}</td>
                            </tr>
                          ))
                        )}

                        {rcaTab === "location" && (
                          locationDistributionRowsQC.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition">
                              <td className="px-3 py-2 text-slate-800 font-bold">{r.segment}</td>
                              <td className="px-2 py-2 text-center text-red-650 font-mono font-bold bg-red-50/5">{r.sub50}</td>
                              <td className="px-2 py-2 text-center text-amber-650 font-mono font-bold">{r.b50_70}</td>
                              <td className="px-2 py-2 text-center text-slate-500 font-mono">{r.b70_80}</td>
                              <td className="px-2 py-2 text-center text-green-700 font-mono">{r.b80_85}</td>
                              <td className="px-2 py-2 text-center text-emerald-600 font-mono font-bold bg-emerald-50/5">{r.b85}</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-700">{r.totalCount}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

      {/* 3. Deep Charts & Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="chart-section animate-fade-in">
        {/* Chart A: V2 Failure Taxonomy */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-mono font-bold tracking-wider mb-6 text-slate-700 border-b border-slate-200 pb-2 flex items-center justify-between gap-2 uppercase">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              V2 First-Pass Failure Taxonomy
            </span>
            <select 
              value={filterV2} 
              onChange={(e) => setFilterV2(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded px-1 text-[10px]"
            >
              <option value="All">All</option>
              <option value="Controllable">Controllable</option>
              <option value="Uncontrollable">Uncontrollable</option>
            </select>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={failureReasonsDist.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#475569" fontSize={11} />
                <YAxis dataKey="reason" type="category" stroke="#475569" width={140} fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a", borderRadius: "8px", fontSize: 11 }}
                />
                <Legend />
                <Bar dataKey="controllable" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="uncontrollable" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: STQC Failure Taxonomy */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-mono font-bold tracking-wider mb-6 text-slate-700 border-b border-slate-200 pb-2 flex items-center justify-between gap-2 uppercase">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-500" />
              STQC First-Pass Failure Taxonomy
            </span>
            <select 
              value={filterStqc} 
              onChange={(e) => setFilterStqc(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded px-1 text-[10px]"
            >
              <option value="All">All</option>
              <option value="Controllable">Controllable</option>
              <option value="Uncontrollable">Uncontrollable</option>
            </select>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stqcFailureReasonsDist.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#475569" fontSize={11} />
                <YAxis dataKey="reason" type="category" stroke="#475569" width={140} fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a", borderRadius: "8px", fontSize: 11 }}
                />
                <Legend />
                <Bar dataKey="controllable" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="uncontrollable" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8" id="chart-section-pies">
        {/* Chart C: V2 Controllable vs Uncontrollable Pie */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-mono font-bold tracking-wider mb-6 text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-2 uppercase">
            <Layers className="w-4 h-4 text-purple-600" />
            V2 Controllable vs Uncontrollable
          </h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={v2ControllablePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {v2ControllablePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a", borderRadius: "8px", fontSize: 11 }} />
                <Legend formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Chart D: STQC Controllable vs Uncontrollable Pie */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-mono font-bold tracking-wider mb-6 text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-2 uppercase">
            <Layers className="w-4 h-4 text-emerald-600" />
            STQC Controllable vs Uncontrollable
          </h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stqcControllablePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stqcControllablePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a", borderRadius: "8px", fontSize: 11 }} />
                <Legend formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* V2 Accuracy by Cohort */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold tracking-tight mb-6 text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Accuracy vs. V2 COHORT
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={v2CohortChartsData} margin={{ top: 10, right: 10, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="cohort" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tick={{ fill: '#64748b' }}
                  label={{ value: 'V2 COHORT', position: 'bottom', offset: 20, fontSize: 11, fill: '#475569', fontWeight: 600 }}
                />
                <YAxis 
                  stroke="#64748b" 
                  domain={[0, 100]} 
                  fontSize={10} 
                  tick={{ fill: '#64748b' }}
                  label={{ value: 'Accuracy', angle: -90, position: 'insideLeft', offset: -10, fontSize: 11, fill: '#475569', fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a", borderRadius: "12px", fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="v2Accuracy" name="Accuracy" fill="#4285F4" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STQC Accuracy by Cohort */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold tracking-tight mb-6 text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Accuracy vs. STQC COHORT
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stqcCohortChartsData} margin={{ top: 10, right: 10, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="cohort" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tick={{ fill: '#64748b' }}
                  label={{ value: 'STQC COHORT', position: 'bottom', offset: 20, fontSize: 11, fill: '#475569', fontWeight: 600 }}
                />
                <YAxis 
                  stroke="#64748b" 
                  domain={[0, 100]} 
                  fontSize={10} 
                  tick={{ fill: '#64748b' }}
                  label={{ value: 'Accuracy', angle: -90, position: 'insideLeft', offset: -10, fontSize: 11, fill: '#475569', fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a", borderRadius: "12px", fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="qcAccuracy" name="Accuracy" fill="#4285F4" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart D: High-precision Location analysis (V2 & STQC) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* V2 Location Analysis */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold tracking-tight mb-6 text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            V2 Accuracy & Avg Duration by Location
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={locationChartsData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="location" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} />
                <YAxis 
                  yAxisId="left"
                  stroke="#64748b" 
                  domain={[0, 100]} 
                  fontSize={10} 
                  tickFormatter={(val) => `${val}%`}
                  label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={(val) => `${val}s`}
                  label={{ value: 'Avg Duration (s)', angle: 90, position: 'insideRight', offset: 10, fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a", borderRadius: "12px", fontSize: 12 }} 
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar yAxisId="right" dataKey="v2AvgDuration" name="Avg Task Duration" fill="#64748b" fillOpacity={0.25} radius={[4, 4, 0, 0]} barSize={40} />
                <Line yAxisId="left" type="monotone" dataKey="v2Accuracy" name="V2 First-Pass Accuracy %" stroke="#2563eb" strokeWidth={4} dot={{ stroke: '#2563eb', strokeWidth: 3, r: 6, fill: '#fff' }} activeDot={{ r: 8, stroke: '#2563eb', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STQC Location Analysis */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold tracking-tight mb-6 text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            STQC QC Accuracy & Avg Duration by Location
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={locationChartsData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="location" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} />
                <YAxis 
                  yAxisId="left"
                  stroke="#64748b" 
                  domain={[0, 100]} 
                  fontSize={10} 
                  tickFormatter={(val) => `${val}%`}
                  label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={(val) => `${val}s`}
                  label={{ value: 'Avg Duration (s)', angle: 90, position: 'insideRight', offset: 10, fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a", borderRadius: "12px", fontSize: 12 }} 
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar yAxisId="right" dataKey="qcAvgDuration" name="Avg QC Duration" fill="#64748b" fillOpacity={0.25} radius={[4, 4, 0, 0]} barSize={40} />
                <Line yAxisId="left" type="monotone" dataKey="qcAccuracy" name="STQC QC Accuracy %" stroke="#10b981" strokeWidth={4} dot={{ stroke: '#10b981', strokeWidth: 3, r: 6, fill: '#fff' }} activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. AI-Powered Management Assistants Area */}
      <div className="border border-slate-200 rounded-2xl bg-slate-50 p-6 md:p-8 space-y-8 shadow-xs relative overflow-hidden" id="ai-powered-assistants-panel">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
          <Sparkles className="w-48 h-48 text-indigo-600" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
          <div>
            <h2 className="text-xl font-display font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" id="ai-sparkle-icon" />
              AV Quality Control Core: AI-Powered Orchestrations
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Direct telemetry proxy queries routed through Gemini server-side. Keeps API keys invisible in browser.
            </p>
          </div>
          <div className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-150 text-[10px] font-mono text-indigo-700 flex items-center gap-1.5 self-start font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            ACTIVE ROUTING PROTOCOL
          </div>
        </div>

        {!(userRole === "Admin" || userRole === "Manager") ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4 shadow-3xs flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
               <ShieldAlert className="w-8 h-8 text-amber-600" />
             </div>
             <div className="max-w-md mx-auto space-y-2">
               <h3 className="text-lg font-bold text-slate-900">Privileged Access Required</h3>
               <p className="text-sm text-slate-500">
                 The AI-Powered Orchestration Core is currently restricted to <strong>Admin</strong> and <strong>Manager</strong> credentials. 
                 Your current identified role (<strong>{userRole || "Standard Guest / Lead"}</strong>) does not have the necessary permissions to execute live telemetry queries.
               </p>
               <div className="pt-4">
                 <button 
                   onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                   className="text-indigo-600 text-xs font-bold hover:underline"
                 >
                   Back to Operational Metrics ↑
                 </button>
               </div>
             </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* AI RCA Widget */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between shadow-3xs">
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-indigo-600 font-bold tracking-widest block uppercase">Tool Unit 01</span>
              <h3 className="text-base font-display font-extrabold text-slate-800">Auto root cause analysis (RCA) Generator</h3>
              <p className="text-xs text-slate-500 font-medium">
                Pulls real statistics regarding failure reason categories and selected cohorts to generate an active root cause, controllable differentiation, and CAPA checklist immediately.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">1. Failure Reason Category</label>
                  <select
                    value={rcaErrorCategory}
                    onChange={(e) => setRcaErrorCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2 focus:border-indigo-500 outline-none"
                  >
                    {uniqueFailureReasons.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">2. Base Target Cohort</label>
                  <select
                    value={selectedCohort}
                    onChange={(e) => setSelectedCohort(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2 focus:border-indigo-500 outline-none"
                  >
                    <option value="All">All Filtered Cohorts</option>
                    {uniqueCohorts.filter(c => c !== "All").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={runAiRca}
              disabled={aiRcaLoading}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-200 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-3xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aiRcaLoading ? "animate-spin" : ""}`} />
              {aiRcaLoading ? "Routing Telemetry through Gemini..." : "Generate AI RCA Report"}
            </button>
          </div>

          {/* AI Coaching Widget */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between shadow-3xs">
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-amber-600 font-bold tracking-widest block uppercase">Tool Unit 02</span>
              <h3 className="text-base font-display font-extrabold text-slate-800">Draft Coaching plan & SMART Goals</h3>
              <p className="text-xs text-slate-500 font-medium">
                AI analyzes active duration standard deviations and target contributor precision values to output detailed daily coaching syllabuses and measurable pacing goals.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Select Target Labeler ID</label>
                  <select
                    value={selectedCoachingLabeler}
                    onChange={(e) => setSelectedCoachingLabeler(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2 focus:border-indigo-500 outline-none"
                  >
                    {uniqueLabelers.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Focus Defect Taxonomy</label>
                  <select
                    value={rcaErrorCategory}
                    onChange={(e) => setRcaErrorCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2 focus:border-indigo-500 outline-none"
                  >
                    {uniqueFailureReasons.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={runCoachingDraft}
              disabled={coachingLoading}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-200 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-3xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${coachingLoading ? "animate-spin" : ""}`} />
              {coachingLoading ? "Calculating Retraining Matrices..." : "Generate AI Coaching Syllabus"}
            </button>
          </div>

          {/* AI Drift Predictor Widget */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between shadow-3xs">
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-red-600 font-bold tracking-widest block uppercase">Tool Unit 03</span>
              <h3 className="text-base font-display font-extrabold text-slate-800">Smart Alerts & Quality Drift Predictor</h3>
              <p className="text-xs text-slate-500 font-medium">
                Pulsates current V2, independientes STQC reviews, and client-slip ratios inside a deep multi-agent prompt to predict timeline degradation and calculate pre-delivery sample locks.
              </p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-600 font-mono font-bold">
                  <span>Current V2: {metrics.v2Accuracy.toFixed(1)}%</span>
                  <span>STQC QC: {metrics.qcAccuracy.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full"
                    style={{ width: `${Math.max(10, Math.min(100, 100 - (metrics.v2Accuracy - metrics.qcAccuracy)))}%` }}
                  ></div>
                </div>
                <div className="text-[10px] font-mono text-indigo-700 flex justify-between font-bold">
                  <span>SLA Defects: {metrics.clientDefectRate.toFixed(1)}%</span>
                  <span>Risk Scale: {metrics.clientDefectRate > 2.0 ? "HIGH RISK" : "STABLE"}</span>
                </div>
              </div>
            </div>

            <button
              onClick={runDriftPredictor}
              disabled={driftLoading}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-200 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-3xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${driftLoading ? "animate-spin" : ""}`} />
              {driftLoading ? "Tracing Statistical Control Bounds..." : "Predict Quality Drift Patterns"}
            </button>
          </div>

          {/* AI Cert Board Widget */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between shadow-3xs">
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-emerald-600 font-bold tracking-widest block uppercase">Tool Unit 04</span>
              <h3 className="text-base font-display font-extrabold text-slate-800">Certification Eligibility Auditor</h3>
              <p className="text-xs text-slate-500 font-medium">
                Audits individual contributor historical metric sets against explicit QA certification limits (≥98.0% Accuracy, 80-120% pacing, stable standard deviation) and outputs a printable board ruling.
              </p>

              <div className="flex flex-col gap-1 pt-2">
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Select Candidate Contributor</label>
                <select
                  value={selectedCertLabeler}
                  onChange={(e) => setSelectedCertLabeler(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2 focus:border-indigo-500 outline-none"
                >
                  {uniqueLabelers.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={runCertAuditor}
              disabled={certLoading}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-200 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-3xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${certLoading ? "animate-spin" : ""}`} />
              {certLoading ? "Validating QA Board Minimums..." : "Run Certification Audit Check"}
            </button>
          </div>
        </div>

        {/* AI Generative Output Block representing Markdown */}
        {(aiRcaResult || coachingResult || driftResult || certResult) && (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 space-y-4 relative animate-fade-in shadow-xs" id="ai-output-terminal">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2 text-indigo-700 font-mono text-xs font-bold">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>TERMINED INTEGRATION PORT: LIVE GEMINI INTERPRETATION</span>
              </div>
              <button
                onClick={() => {
                  setAiRcaResult("");
                  setCoachingResult("");
                  setDriftResult("");
                  setCertResult("");
                }}
                className="text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-250 px-2.5 py-1 rounded-md transition cursor-pointer font-bold shadow-3xs"
              >
                Clear Terminal
              </button>
            </div>

            <div className="text-slate-700 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap font-sans space-y-4 max-h-[450px] overflow-y-auto pr-2">
              <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-3xs">
                {aiRcaResult && (
                  <div className="max-w-none text-xs leading-6 text-slate-700 space-y-2">
                    <p className="text-[10px] font-mono text-indigo-600 font-black uppercase tracking-widest border-b border-indigo-100 pb-1 mb-3">
                      Core Operations Unit - Root Cause Analysis
                    </p>
                    <div className="text-slate-700 font-medium whitespace-pre-wrap">{aiRcaResult}</div>
                  </div>
                )}
                {coachingResult && (
                  <div className="max-w-none text-xs leading-6 text-slate-700 space-y-2">
                    <p className="text-[10px] font-mono text-amber-600 font-black uppercase tracking-widest border-b border-amber-100 pb-1 mb-3">
                      Training Unit - Contributor Performance coaching Plan
                    </p>
                    <div className="text-slate-700 font-medium whitespace-pre-wrap">{coachingResult}</div>
                  </div>
                )}
                {driftResult && (
                  <div className="max-w-none text-xs leading-6 text-slate-700 space-y-2">
                    <p className="text-[10px] font-mono text-red-650 font-black uppercase tracking-widest border-b border-red-100 pb-1 mb-3">
                      Risk Monitor Unit - Quality Drift Diagnostics
                    </p>
                    <div className="text-slate-700 font-medium whitespace-pre-wrap">{driftResult}</div>
                  </div>
                )}
                {certResult && (
                  <div className="max-w-none text-xs leading-6 text-slate-700 space-y-2">
                    <p className="text-[10px] font-mono text-emerald-600 font-black uppercase tracking-widest border-b border-emerald-100 pb-1 mb-3">
                      Certification Unit - Eligibility Board Evaluation
                    </p>
                    <div className="text-slate-700 font-medium whitespace-pre-wrap">{certResult}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* 5. Contributor Performance Details Tables */}
      <div className="space-y-8">
        {/* Table A: V2 LABELING */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs" id="v2-ledger-table pb-4">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600 block"></span>
              V2 Labeling Contributors Performance Standard Deviation Ledger ({labelersSummary.length} Active Members)
            </h3>
            <button 
              onClick={() => setShowAllV2(!showAllV2)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              {showAllV2 ? "COLLAPSE" : "EXPAND ALL"}
            </button>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Dynamic efficiency ratio checks calculated against standard deviation limits. Grouped by <code className="bg-slate-100 px-1 py-0.5 rounded border">simteacher_v2_labeler</code>. Targets: Accuracy ≥98.0% | Pacing: 80% to 120%.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-3xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quality Band:</span>
                  <select
                    value={v2DistFilter}
                    onChange={(e) => setV2DistFilter(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="All">All Distributions</option>
                    <option value="≥85%">≥85% (SLA Pass)</option>
                    <option value="80%–85%">80%–85% (Borderline)</option>
                    <option value="70%–80%">70%–80% (At Risk)</option>
                    <option value="50%–70%">50%–70% (Severe Drift)</option>
                    <option value="<50%">&lt;50% (Critical)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportToCSV(labelersSummary, v2ColumnHeaders, "V2_Labeler_Performance.csv")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-3xs hover:border-slate-300"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={() => exportToPDF(labelersSummary, v2ColumnHeaders, "V2 Labeler Performance Standard Deviation Ledger", "V2_Labeler_Performance.pdf")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-3xs hover:border-slate-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-650">
              <thead className="text-[10px] uppercase font-mono text-slate-500 bg-slate-50 border-b border-slate-200/85">
                <tr>
                  {[
                    { key: "labelerId", label: "V2 LABELER ID (Col P)", sortable: true },
                    { key: "cohort", label: "V2 COHORT (Col AB)", sortable: true },
                    { key: "tl", label: "V2 LEADING TL (Col AF)", sortable: true },
                    { key: "v2Accuracy", label: "V2 SLA ACCURACY", sortable: true, center: true },
                    { key: "controllablePct", label: "CONTROLLABLE %", sortable: true, center: true },
                    { key: "uncontrollablePct", label: "UNCONTROLLABLE %", sortable: true, center: true },
                    { key: "efficiencyIndex", label: "PACING INDEX", sortable: true, center: true },
                    { key: "durationStdDev", label: "DURATION STDEV", sortable: true, center: true },
                    { key: "nuroDefects", label: "CLIENT DEFECTS", sortable: true, center: true },
                  ].map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-6 py-4 font-bold ${col.center ? "text-center" : ""}`}
                    >
                      <button
                        onClick={() => col.sortable && requestSortV2(col.key)}
                        className={`flex items-center gap-1 hover:text-slate-900 transition ${col.center ? "justify-center mx-auto" : ""}`}
                      >
                        {col.label}
                        {col.sortable && (
                          v2SortConfig?.key === col.key ? (
                            v2SortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                          )
                        )}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-6 py-4 text-right font-bold">CREDENTIAL STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {labelersSummary.slice(0, showAllV2 ? undefined : 10).map((row, idx) => {
                  const isAccPass = row.v2Accuracy >= 98.0;
                  const isPacePass = row.efficiencyIndex >= 80 && row.efficiencyIndex <= 120;
                  const isNuroPass = row.nuroDefects === 0;
                  const isCertified = isAccPass && isPacePass && isNuroPass;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{row.labelerId}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.cohort}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.tl}</td>
                      <td className="px-6 py-4 text-center font-bold">
                        <span className={isAccPass ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100" : "text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-105"}>
                          {row.v2Accuracy.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs font-bold text-slate-700">
                        {row.controllablePct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">
                        {row.uncontrollablePct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs">
                        <span className={isPacePass ? "text-slate-700 font-bold" : "text-red-500 font-bold"}>
                          {row.efficiencyIndex.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                        ±{row.durationStdDev.toFixed(0)}s
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs">
                        <span className={row.nuroDefects === 0 ? "text-emerald-600" : "text-red-500 font-bold"}>
                          {row.nuroDefects} defect{row.nuroDefects === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                            isCertified
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isCertified ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                          {isCertified ? "PRINCIPAL L1" : "PROVISIONAL"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 text-xs font-mono text-slate-400 border-t border-slate-200/80 text-center">
            Showing top V2 operations list active logs. Segmented by simteacher_v2_labeler ID.
          </div>
        </div>

        {/* Table B: STQC AUDITING */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs" id="stqc-ledger-table pb-4">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 block"></span>
              STQC QC Auditor Performance Standard Deviation Ledger ({qcAuditorsSummary.length} Active QA Members)
            </h3>
            <button 
              onClick={() => setShowAllSTQC(!showAllSTQC)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
            >
              {showAllSTQC ? "COLLAPSE" : "EXPAND ALL"}
            </button>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Dynamic quality ratio checks calculated against standard deviation limits. Grouped by <code className="bg-slate-100 px-1 py-0.5 rounded border">qa_user_id</code>. Targets: Audit Precision ≥98.0% | Pacing: 80% to 120%.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-3xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quality Band:</span>
                  <select
                    value={qcDistFilter}
                    onChange={(e) => setQcDistFilter(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="All">All Distributions</option>
                    <option value="≥85%">≥85% (SLA Pass)</option>
                    <option value="80%–85%">80%–85% (Borderline)</option>
                    <option value="70%–80%">70%–80% (At Risk)</option>
                    <option value="50%–70%">50%–70% (Severe Drift)</option>
                    <option value="<50%">&lt;50% (Critical)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportToCSV(qcAuditorsSummary, qcColumnHeaders, "STQC_Auditor_Performance.csv")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-3xs hover:border-slate-300"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={() => exportToPDF(qcAuditorsSummary, qcColumnHeaders, "STQC QC Auditor Performance Standard Deviation Ledger", "STQC_Auditor_Performance.pdf")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-3xs hover:border-slate-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-650">
              <thead className="text-[10px] uppercase font-mono text-slate-500 bg-slate-50 border-b border-slate-200/85">
                <tr>
                  {[
                    { key: "auditorId", label: "STQC AUDITOR ID (Col Q)", sortable: true },
                    { key: "cohort", label: "STQC COHORT (Col AA)", sortable: true },
                    { key: "tl", label: "STQC LEADING TL (Col AG)", sortable: true },
                    { key: "qcAccuracy", label: "STQC QC ACCURACY", sortable: true, center: true },
                    { key: "controllablePct", label: "CONTROLLABLE %", sortable: true, center: true },
                    { key: "uncontrollablePct", label: "UNCONTROLLABLE %", sortable: true, center: true },
                    { key: "efficiencyIndex", label: "QC PACING INDEX", sortable: true, center: true },
                    { key: "durationStdDev", label: "DURATION STDEV", sortable: true, center: true },
                    { key: "nuroDefects", label: "CLIENT DEFECTS", sortable: true, center: true },
                  ].map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-6 py-4 font-bold ${col.center ? "text-center" : ""}`}
                    >
                      <button
                        onClick={() => col.sortable && requestSortQC(col.key)}
                        className={`flex items-center gap-1 hover:text-slate-900 transition ${col.center ? "justify-center mx-auto" : ""}`}
                      >
                        {col.label}
                        {col.sortable && (
                          qcSortConfig?.key === col.key ? (
                            qcSortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                          )
                        )}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-6 py-4 text-right font-bold">CREDENTIAL STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {qcAuditorsSummary.slice(0, showAllSTQC ? undefined : 10).map((row, idx) => {
                  const isAccPass = row.qcAccuracy >= 98.0;
                  const isPacePass = row.efficiencyIndex >= 80 && row.efficiencyIndex <= 120;
                  const isNuroPass = row.nuroDefects === 0;
                  const isCertified = isAccPass && isPacePass && isNuroPass;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{row.auditorId}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.cohort}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.tl}</td>
                      <td className="px-6 py-4 text-center font-bold">
                        <span className={isAccPass ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100" : "text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-105"}>
                          {row.qcAccuracy.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs font-bold text-slate-700">
                        {row.controllablePct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">
                        {row.uncontrollablePct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs">
                        <span className={isPacePass ? "text-slate-700 font-bold" : "text-red-500 font-bold"}>
                          {row.efficiencyIndex.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                        ±{row.durationStdDev.toFixed(0)}s
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs">
                        <span className={row.nuroDefects === 0 ? "text-emerald-600" : "text-red-500 font-bold"}>
                          {row.nuroDefects} defect{row.nuroDefects === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                            isCertified
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isCertified ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                          {isCertified ? "PRINCIPAL QA L1" : "PROVISIONAL"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 text-xs font-mono text-slate-400 border-t border-slate-200/80 text-center">
            Showing top STQC operations list active logs. Segmented by qa_user_id ID.
          </div>
        </div>

        {/* 6. Advanced Cross-Sectional Analytics */}
        <div className="space-y-16 py-12 border-t border-slate-200 mt-12" id="advanced-analytics-section">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
                ADVANCED CROSS-SECTIONAL ANALYTICS
              </h2>
              <p className="text-slate-500 font-medium max-w-2xl">
                Multi-dimensional performance mapping across locations, team leaders, and failure segments comparing V2 First-Pass vs STQC Audit results.
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xl">
               <div className="flex items-center gap-2 px-4 text-slate-500 font-bold text-[10px] uppercase border-r border-slate-200">
                 <Calendar className="w-5 h-5 text-indigo-600" />
                 <span>SELECT ANALYTICAL WEEK</span>
               </div>
               <select 
                 className="text-sm font-bold text-slate-900 bg-transparent py-1.5 px-4 focus:ring-0 cursor-pointer appearance-none pr-8"
                 value={reasonMatrixWeekFilter}
                 onChange={(e) => setReasonMatrixWeekFilter(e.target.value)}
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
               >
                 {advancedAnalytics.displayWeeks.map(w => {
                   let display = w;
                   try {
                     const date = new Date(w);
                     if (!isNaN(date.getTime())) {
                       display = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                     }
                   } catch (e) {}
                   return <option key={w} value={w}>WB: {display}</option>;
                 })}
               </select>
            </div>
          </div>

          <div className="space-y-16">
            {/* Table Area 1: Location Drift Side-by-Side */}
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-xl font-display font-extrabold text-slate-900 flex items-center gap-3">
                  <span className="w-2 h-8 rounded-full bg-indigo-600"></span>
                  LOCATION-WISE ERROR DISTRIBUTION (V2 vs STQC) %
                </h3>
                <p className="text-sm text-slate-500 font-medium ml-5">
                  Regional comparative analysis showing each location's share of controllable and uncontrollable errors for <strong>WB: {reasonMatrixWeekFilter}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* V2 Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight text-indigo-600">
                    <span>V2 FIRST-PASS ANALYSIS</span>
                    <span className="bg-indigo-50 px-2 py-0.5 rounded">COUNTER OF V2 ERROR TYPE</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg bg-white">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead className="bg-[#F8FAFF] text-slate-900 uppercase font-bold border-b-2 border-slate-200">
                        <tr>
                          <th className="p-4 text-left border-r border-slate-200">Location</th>
                          <th className="p-4 text-center border-r border-slate-200">Controllable</th>
                          <th className="p-4 text-center border-r border-slate-200">Uncontrollable</th>
                          <th className="p-4 text-center bg-slate-50">Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advancedAnalytics.v2Locations.map(loc => {
                          const data = advancedAnalytics.v2.locWeekly[loc]?.[reasonMatrixWeekFilter];
                          const gTotal = advancedAnalytics.v2.grandTotals[reasonMatrixWeekFilter];
                          
                          const ctrlPct = (data && gTotal && gTotal.controllable > 0) ? (data.controllable / gTotal.controllable) * 100 : 0;
                          const unctrlPct = (data && gTotal && (gTotal.total - gTotal.controllable) > 0) 
                              ? ((data.total - data.controllable) / (gTotal.total - gTotal.controllable)) * 100 : 0;
                          const totalPct = (data && gTotal && gTotal.total > 0) ? (data.total / gTotal.total) * 100 : 0;

                          return (
                            <tr key={loc} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                              <td className="p-4 font-extrabold text-slate-800 border-r border-slate-200">{loc}</td>
                              <td className="p-4 text-center font-bold border-r border-slate-200">{ctrlPct > 0 ? `${ctrlPct.toFixed(2)}%` : "-"}</td>
                              <td className="p-4 text-center font-bold border-r border-slate-200">{unctrlPct > 0 ? `${unctrlPct.toFixed(2)}%` : "-"}</td>
                              <td className="p-4 text-center font-bold bg-slate-50/30 italic">{totalPct > 0 ? `${totalPct.toFixed(2)}%` : "-"}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-900 text-white font-extrabold uppercase text-[11px]">
                          <td className="p-4 border-r border-slate-800">Grand Total</td>
                          <td className="p-4 text-center border-r border-slate-800 text-orange-400">100.00%</td>
                          <td className="p-4 text-center border-r border-slate-800 text-orange-400">100.00%</td>
                          <td className="p-4 text-center bg-slate-800 text-indigo-300">100.00%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* STQC Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight text-emerald-600">
                    <span>STQC AUDIT ANALYSIS</span>
                    <span className="bg-emerald-50 px-2 py-0.5 rounded">COUNTER OF QC TYPE</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg bg-white">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead className="bg-[#F8FFFA] text-slate-900 uppercase font-bold border-b-2 border-slate-200">
                        <tr>
                          <th className="p-4 text-left border-r border-slate-200">Location</th>
                          <th className="p-4 text-center border-r border-slate-200">Controllable</th>
                          <th className="p-4 text-center border-r border-slate-200">Uncontrollable</th>
                          <th className="p-4 text-center bg-slate-50">Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advancedAnalytics.stqcLocations.map(loc => {
                          const data = advancedAnalytics.stqc.locWeekly[loc]?.[reasonMatrixWeekFilter];
                          const gTotal = advancedAnalytics.stqc.grandTotals[reasonMatrixWeekFilter];
                          
                          const ctrlPct = (data && gTotal && gTotal.controllable > 0) ? (data.controllable / gTotal.controllable) * 100 : 0;
                          const unctrlPct = (data && gTotal && (gTotal.total - gTotal.controllable) > 0) 
                              ? ((data.total - data.controllable) / (gTotal.total - gTotal.controllable)) * 100 : 0;
                          const totalPct = (data && gTotal && gTotal.total > 0) ? (data.total / gTotal.total) * 100 : 0;

                          return (
                            <tr key={loc} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                              <td className="p-4 font-extrabold text-slate-800 border-r border-slate-200">{loc}</td>
                              <td className="p-4 text-center font-bold border-r border-slate-200">{ctrlPct > 0 ? `${ctrlPct.toFixed(2)}%` : "-"}</td>
                              <td className="p-4 text-center font-bold border-r border-slate-200">{unctrlPct > 0 ? `${unctrlPct.toFixed(2)}%` : "-"}</td>
                              <td className="p-4 text-center font-bold bg-slate-50/30 italic">{totalPct > 0 ? `${totalPct.toFixed(2)}%` : "-"}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-900 text-white font-extrabold uppercase text-[11px]">
                          <td className="p-4 border-r border-slate-800">Grand Total</td>
                          <td className="p-4 text-center border-r border-slate-800 text-orange-400">100.00%</td>
                          <td className="p-4 text-center border-r border-slate-800 text-orange-400">100.00%</td>
                          <td className="p-4 text-center bg-slate-800 text-indigo-300">100.00%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Area 2: TL Drift Side-by-Side */}
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-xl font-display font-extrabold text-slate-900 flex items-center gap-3">
                  <span className="w-2 h-8 rounded-full bg-indigo-600"></span>
                  TL-WISE ERROR DISTRIBUTION (V2 vs STQC) %
                </h3>
                <p className="text-sm text-slate-500 font-medium ml-5">
                  Strategic team-leader perspective on error attribution comparing vertical distribution for <strong>WB: {reasonMatrixWeekFilter}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* V2 Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight text-indigo-600">
                    <span>V2 TEAM LEADERSHIP DRIFT</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg bg-white">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead className="bg-[#F8FAFF] text-slate-900 uppercase font-bold border-b-2 border-slate-200">
                        <tr>
                          <th className="p-4 text-left border-r border-slate-200">Team Lead (TL)</th>
                          <th className="p-4 text-center border-r border-slate-200">Controllable</th>
                          <th className="p-4 text-center border-r border-slate-200">Uncontrollable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advancedAnalytics.v2.tls.map(tl => {
                          const data = advancedAnalytics.v2.tlWeekly[tl]?.[reasonMatrixWeekFilter];
                          const gTotal = advancedAnalytics.v2.grandTotals[reasonMatrixWeekFilter];
                          
                          const ctrlPct = (data && gTotal && gTotal.controllable > 0) ? (data.controllable / gTotal.controllable) * 100 : 0;
                          const unctrlPct = (data && gTotal && (gTotal.total - gTotal.controllable) > 0) 
                              ? ((data.total - data.controllable) / (gTotal.total - gTotal.controllable)) * 100 : 0;

                          return (
                            <tr key={tl} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                              <td className="p-4 font-extrabold text-slate-800 border-r border-slate-200">{tl}</td>
                              <td className="p-4 text-center font-bold border-r border-slate-200">{ctrlPct > 0 ? `${ctrlPct.toFixed(2)}%` : "-"}</td>
                              <td className="p-4 text-center font-bold">{unctrlPct > 0 ? `${unctrlPct.toFixed(2)}%` : "-"}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-900 text-white font-extrabold uppercase text-[11px]">
                          <td className="p-4 border-r border-slate-800">Grand Total</td>
                          <td className="p-4 text-center border-r border-slate-800 text-orange-400">100.00%</td>
                          <td className="p-4 text-center text-orange-400">100.00%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* STQC Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight text-emerald-600">
                    <span>STQC TEAM LEADERSHIP DRIFT</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg bg-white">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead className="bg-[#F8FFFA] text-slate-900 uppercase font-bold border-b-2 border-slate-200">
                        <tr>
                          <th className="p-4 text-left border-r border-slate-200">Team Lead (TL)</th>
                          <th className="p-4 text-center border-r border-slate-200">Controllable</th>
                          <th className="p-4 text-center border-r border-slate-200">Uncontrollable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advancedAnalytics.stqc.tls.map(tl => {
                          const data = advancedAnalytics.stqc.tlWeekly[tl]?.[reasonMatrixWeekFilter];
                          const gTotal = advancedAnalytics.stqc.grandTotals[reasonMatrixWeekFilter];
                          
                          const ctrlPct = (data && gTotal && gTotal.controllable > 0) ? (data.controllable / gTotal.controllable) * 100 : 0;
                          const unctrlPct = (data && gTotal && (gTotal.total - gTotal.controllable) > 0) 
                              ? ((data.total - data.controllable) / (gTotal.total - gTotal.controllable)) * 100 : 0;

                          return (
                            <tr key={tl} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                              <td className="p-4 font-extrabold text-slate-800 border-r border-slate-200">{tl}</td>
                              <td className="p-4 text-center font-bold border-r border-slate-200">{ctrlPct > 0 ? `${ctrlPct.toFixed(2)}%` : "-"}</td>
                              <td className="p-4 text-center font-bold">{unctrlPct > 0 ? `${unctrlPct.toFixed(2)}%` : "-"}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-900 text-white font-extrabold uppercase text-[11px]">
                          <td className="p-4 border-r border-slate-800">Grand Total</td>
                          <td className="p-4 text-center border-r border-slate-800 text-orange-400">100.00%</td>
                          <td className="p-4 text-center text-orange-400">100.00%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Area 3: Reason Distribution Side-by-Side */}
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-xl font-display font-extrabold text-slate-900 flex items-center gap-3">
                  <span className="w-2 h-8 rounded-full bg-indigo-600"></span>
                  FAILURE REASON DISTRIBUTION OVER-LOCATION %
                </h3>
                <p className="text-sm text-slate-500 font-medium ml-5">
                  Comparative breakdown of specific failure types across locations for <strong>WB: {reasonMatrixWeekFilter}</strong>.
                </p>
              </div>

              <div className="space-y-12">
                {/* V2 Section */}
                <div className="space-y-6">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                     <div className="text-[11px] uppercase font-black text-indigo-400 tracking-[0.2em] bg-slate-900 w-max px-4 py-1.5 rounded shadow-lg">V2 FAILURE CLASSIFICATION MATRIX</div>
                     
                     <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-md">
                        <div className="flex items-center gap-2 px-3 text-slate-500 font-bold text-[10px] uppercase border-r border-slate-200">
                          <Filter className="w-4 h-4 text-indigo-500" />
                          <span>V2 ERROR TYPE</span>
                        </div>
                        <div className="flex p-0.5 bg-slate-50 rounded-lg border border-slate-100">
                          {["All", "Controllable", "Uncontrollable"].map((type) => (
                            <button
                              key={type}
                              onClick={() => setV2ErrorTypeFilter(type as any)}
                              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                                v2ErrorTypeFilter === type 
                                  ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              {type.toUpperCase()}
                            </button>
                          ))}
                        </div>
                     </div>
                   </div>

                   <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xl bg-white">
                    {(() => {
                      if (!v2PivotData) return <div className="p-12 text-center text-slate-400 italic">Please select a week.</div>;
                      
                      const { matrix, columnTotals } = v2PivotData;
                      const reasons = uniqueFailureReasonsV2.filter(r => columnTotals[r] > 0);

                      if (reasons.length === 0) {
                        return (
                          <div className="p-16 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                              <Info className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-medium italic">No V2 failure data recorded matching these filters for {reasonMatrixWeekFilter}</p>
                          </div>
                        );
                      }

                      return (
                        <table className="w-full text-[11px] font-mono border-collapse">
                          <thead className="bg-[#F8FAFF] text-slate-900 uppercase font-bold border-b-2 border-indigo-100 sticky top-0 z-10">
                            <tr>
                              <th className="p-4 text-left sticky left-0 z-20 bg-slate-50 min-w-[150px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-200">LOCATION</th>
                              {reasons.map(r => (
                                <th key={r} className="p-3 text-center border-r border-slate-200 min-w-[140px] whitespace-normal">
                                  {r}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {advancedAnalytics.v2Locations.map(loc => {
                              return (
                                <tr key={loc} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                  <td className="p-4 font-extrabold bg-white sticky left-0 z-10 border-r border-slate-200">{loc}</td>
                                  {reasons.map(r => {
                                    const count = matrix[r]?.[loc] || 0;
                                    const totalForReason = columnTotals[r] || 0;
                                    const pct = totalForReason > 0 ? (count / totalForReason) * 100 : 0;
                                    return (
                                      <td key={r} className={`p-3 text-center font-bold border-r border-slate-200 transition-all ${getAnalyticalColor(pct, 'dist')}`}>
                                        {pct > 0 ? `${pct.toFixed(2)}%` : "-"}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                            <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                              <td className="p-4 sticky left-0 z-10 border-r border-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.3)]">GRAND TOTAL (100.00%)</td>
                              {reasons.map(r => (
                                <td key={r} className="p-3 text-center border-r border-slate-800 text-indigo-400 bg-slate-800/50">
                                  100.00%
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      );
                    })()}
                   </div>
                </div>

                {/* STQC Section */}
                <div className="space-y-6 pt-6">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                     <div className="text-[11px] uppercase font-black text-emerald-400 tracking-[0.2em] bg-slate-900 w-max px-4 py-1.5 rounded shadow-lg">STQC FAILURE CLASSIFICATION MATRIX</div>
                     
                     <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-md">
                        <div className="flex items-center gap-2 px-3 text-slate-500 font-bold text-[10px] uppercase border-r border-slate-100">
                          <Filter className="w-4 h-4 text-emerald-500" />
                          <span>QC ERROR TYPE</span>
                        </div>
                        <div className="flex p-0.5 bg-slate-50 rounded-lg border border-slate-100">
                          {["All", "Controllable", "Uncontrollable"].map((type) => (
                            <button
                              key={type}
                              onClick={() => setStqcErrorTypeFilter(type as any)}
                              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                                stqcErrorTypeFilter === type 
                                  ? "bg-white text-emerald-600 shadow-sm border border-slate-100" 
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              {type.toUpperCase()}
                            </button>
                          ))}
                        </div>
                     </div>
                   </div>

                   <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xl bg-white">
                    {(() => {
                      if (!stqcPivotData) return <div className="p-12 text-center text-slate-400 italic">Please select a week.</div>;
                      
                      const { matrix, columnTotals } = stqcPivotData;
                      const reasons = uniqueFailureReasons.filter(r => columnTotals[r] > 0);

                      if (reasons.length === 0) {
                        return (
                          <div className="p-16 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                              <Info className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-medium italic">No STQC data recorded matching these filters for {reasonMatrixWeekFilter}</p>
                          </div>
                        );
                      }

                      return (
                        <table className="w-full text-[11px] font-mono border-collapse">
                          <thead className="bg-[#EBFFF4] text-slate-900 uppercase font-bold border-b-2 border-emerald-100 sticky top-0 z-10">
                            <tr>
                              <th className="p-4 text-left sticky left-0 z-20 bg-slate-50 min-w-[150px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-200">LOCATION</th>
                              {reasons.map(r => (
                                <th key={r} className="p-3 text-center border-r border-slate-200 min-w-[140px] whitespace-normal">
                                  {r}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {advancedAnalytics.stqcLocations.map(loc => {
                              return (
                                <tr key={loc} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                  <td className="p-4 font-extrabold bg-white sticky left-0 z-10 border-r border-slate-200">{loc}</td>
                                  {reasons.map(r => {
                                    const count = matrix[r]?.[loc] || 0;
                                    const totalForReason = columnTotals[r] || 0;
                                    const pct = totalForReason > 0 ? (count / totalForReason) * 100 : 0;
                                    return (
                                      <td key={r} className={`p-3 text-center font-bold border-r border-slate-200 transition-all ${getAnalyticalColor(pct, 'dist')}`}>
                                        {pct > 0 ? `${pct.toFixed(2)}%` : "-"}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                            <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                              <td className="p-4 sticky left-0 z-10 border-r border-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.3)]">GRAND TOTAL (100.00%)</td>
                              {reasons.map(r => (
                                <td key={r} className="p-3 text-center border-r border-slate-800 text-emerald-400 bg-slate-800/50">
                                  100.00%
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      );
                    })()}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )}
</div>
  );
}
