const SESSION_KEY = "qms_access_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export type AccessLogPayload = {
  email: string;
  displayName?: string;
  action?: string;
  page?: string;
};

/** Fire-and-forget access log to BigQuery via server API. */
export async function logDashboardAccess(payload: AccessLogPayload): Promise<void> {
  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) return;

  try {
    const res = await fetch("/api/access-log", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email,
        displayName: payload.displayName || "",
        action: payload.action || "dashboard_open",
        page: payload.page || (typeof window !== "undefined" ? window.location.pathname : "/"),
        sessionId: getSessionId(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
      }),
      keepalive: true
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn("Access log failed:", data?.error || res.status);
    }
  } catch (error) {
    console.warn("Access log request error:", error);
  }
}
