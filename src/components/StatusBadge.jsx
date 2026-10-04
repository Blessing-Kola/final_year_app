const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  available: "bg-emerald-50 text-emerald-700",
  assigned: "bg-emerald-50 text-emerald-700",
  submitted: "bg-indigo-50 text-indigo-700",
  under_review: "bg-sky-50 text-sky-700",
  completed: "bg-sky-50 text-sky-700",
  not_started: "bg-slate-100 text-slate-500",
  needs_revision: "bg-amber-50 text-amber-700",
  declined: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
  draft: "bg-slate-100 text-slate-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  locked: "bg-slate-100 text-slate-500",
  not_available: "bg-slate-100 text-slate-500",
  not_assigned: "bg-slate-100 text-slate-500",
  not_submitted: "bg-slate-100 text-slate-500",
};

const normalizeKey = (value) => String(value ?? "not_available").trim().toLowerCase().replace(/\s+/g, "_");

export function StatusBadge({ status, fallback = "Not available" }) {
  if (!status) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
        {fallback}
      </span>
    );
  }

  const key = normalizeKey(status);
  const label = String(status).replace(/_/g, " ");

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[key] || "bg-slate-100 text-slate-700"}`}
    >
      {label}
    </span>
  );
}

export function Feedback({ tone = "error", children }) {
  if (!children) return null;

  const styles =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "info"
        ? "bg-indigo-50 text-indigo-800"
        : "bg-red-50 text-red-700";

  return (
    <p className={`rounded-xl px-3 py-2 text-sm ${styles}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export default StatusBadge;
