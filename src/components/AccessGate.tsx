import React, { useEffect, useState } from "react";
import { LogIn, Shield, User } from "lucide-react";
import {
  isFirebaseConfigured,
  googleSignInIdentity,
  initIdentityAuth,
  logout,
  type IdentityUser
} from "../lib/firebaseAuth";
import { logDashboardAccess } from "../lib/accessLogClient";

const GUEST_KEY = "qms_access_guest";

type GateState =
  | { status: "loading" }
  | { status: "need_login" }
  | { status: "ready"; user: { email: string; displayName: string; source: "google" | "guest" } };

type Props = {
  children: React.ReactNode;
};

/**
 * Requires identity before showing the dashboard, then logs access to BigQuery.
 * - Prefer Google sign-in when Firebase env is set
 * - Fallback: name + email form (stored for the browser session)
 */
export default function AccessGate({ children }: Props) {
  const [gate, setGate] = useState<GateState>({ status: "loading" });
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    let unsub = () => {};

    if (firebaseReady) {
      unsub = initIdentityAuth(
        (user) => {
          const identity = {
            email: user.email,
            displayName: user.displayName || user.email,
            source: "google" as const
          };
          setGate({ status: "ready", user: identity });
          void logDashboardAccess({
            email: identity.email,
            displayName: identity.displayName,
            action: "dashboard_open"
          });
        },
        () => {
          // Not signed in — try guest session
          const guest = readGuest();
          if (guest) {
            setGate({ status: "ready", user: { ...guest, source: "guest" } });
            void logDashboardAccess({
              email: guest.email,
              displayName: guest.displayName,
              action: "dashboard_open"
            });
          } else {
            setGate({ status: "need_login" });
          }
        }
      );
    } else {
      const guest = readGuest();
      if (guest) {
        setGate({ status: "ready", user: { ...guest, source: "guest" } });
        void logDashboardAccess({
          email: guest.email,
          displayName: guest.displayName,
          action: "dashboard_open"
        });
      } else {
        setGate({ status: "need_login" });
      }
    }

    return () => unsub();
  }, [firebaseReady]);

  const handleGoogle = async () => {
    setSigningIn(true);
    setError(null);
    try {
      const user = await googleSignInIdentity();
      if (!user) throw new Error("Sign-in cancelled.");
      const identity = {
        email: user.email,
        displayName: user.displayName || user.email,
        source: "google" as const
      };
      setGate({ status: "ready", user: identity });
      void logDashboardAccess({
        email: identity.email,
        displayName: identity.displayName,
        action: "google_sign_in"
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleGuest = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = guestEmail.trim().toLowerCase();
    const displayName = guestName.trim() || email;
    if (!email || !email.includes("@")) {
      setError("Enter a valid work email.");
      return;
    }
    const identity = { email, displayName, source: "guest" as const };
    try {
      sessionStorage.setItem(GUEST_KEY, JSON.stringify({ email, displayName }));
    } catch {
      /* ignore */
    }
    setGate({ status: "ready", user: identity });
    void logDashboardAccess({
      email,
      displayName,
      action: "guest_continue"
    });
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem(GUEST_KEY);
    } catch {
      /* ignore */
    }
    await logout();
    setGate({ status: "need_login" });
  };

  if (gate.status === "loading") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-slate-500 font-mono">
        Checking access…
      </div>
    );
  }

  if (gate.status === "need_login") {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900">Dashboard access</h2>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {firebaseReady && (
          <button
            type="button"
            disabled={signingIn}
            onClick={() => void handleGoogle()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            {signingIn ? "Signing in…" : "Continue with Google"}
          </button>
        )}

        <div className={firebaseReady ? "border-t border-slate-100 pt-5 space-y-3" : "space-y-3"}>
          <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">
            {firebaseReady ? "Or continue with work email" : "Enter your work email"}
          </p>
          <form onSubmit={handleGuest} className="space-y-3">
            <div>
              <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Name</label>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Email</label>
              <input
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="you@imerit.net"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <User className="w-4 h-4" />
              Continue
            </button>
          </form>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Access is written to BigQuery table <code className="font-mono">dashboard_access_log</code>
          {" "}(email, time, action). Not shared publicly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2">
        <span>
          Signed in as{" "}
          <strong className="text-slate-800">{gate.user.displayName}</strong>
          {" "}
          <span className="text-slate-400">({gate.user.email})</span>
          {gate.user.source === "guest" && (
            <span className="ml-2 text-[10px] uppercase bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
              guest
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}

function readGuest(): { email: string; displayName: string } | null {
  try {
    const raw = sessionStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; displayName?: string };
    if (!parsed.email) return null;
    return {
      email: String(parsed.email).toLowerCase(),
      displayName: String(parsed.displayName || parsed.email)
    };
  } catch {
    return null;
  }
}
