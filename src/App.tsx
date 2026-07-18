import React, { useState } from "react";
import OperationsDashboard from "./components/OperationsDashboard";
import AccessGate from "./components/AccessGate";
import {
  Sparkles,
  MapPin,
  Clock,
} from "lucide-react";

export default function App() {
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
          </div>
        </div>
      </header>
      {/* Primary Page Canvas */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" id="root-portal-canvas">
        <AccessGate>
          <OperationsDashboard
            onLocationsUpdate={(locs: string[]) => setHeaderLocations(locs.join(" • ").toUpperCase())}
          />
        </AccessGate>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500 font-mono text-center space-y-2 mt-auto" id="app-footer">
        <p>© 2026 iMerit Operations Steering Layer. Integrated with Gemini API Server-Side Protocols.</p>
        <p className="text-[10px] text-slate-400">Standard design rules compliant. Fully functional client sandboxes.</p>
      </footer>
    </div>
  );
}


