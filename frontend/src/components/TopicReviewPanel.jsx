import { useMemo, useState } from "react";
import { topicApi } from "../services/api";
import { Feedback, StatusBadge } from "./StatusBadge";

/**
 * Accept / decline controls for student-submitted topics.
 * Supervisors only receive the topics of students assigned to them; coordinators receive all.
 */
export default function TopicReviewPanel({ topics, loading = false, emptyMessage = "No topics have been submitted yet." }) {
  const [overrides, setOverrides] = useState({});
  const [reasons, setReasons] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Server-confirmed reviews are layered over the shared portal payload.
  const items = useMemo(
    () => (topics ?? []).map((topic) => overrides[topic.id] ?? topic),
    [topics, overrides],
  );

  const replaceTopic = (updated) => {
    setOverrides((current) => ({ ...current, [updated.id]: updated }));
  };

  const handleAccept = async (topic) => {
    setBusyId(topic.id);
    setError("");
    setSuccess("");
    try {
      const response = await topicApi.accept(topic.id);
      if (response.topic) replaceTopic(response.topic);
      setSuccess(`${topic.student?.name || "The student"}'s topic was accepted.`);
    } catch (requestError) {
      setError(requestError.message || "Unable to accept this topic.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (topic) => {
    setBusyId(topic.id);
    setError("");
    setSuccess("");
    try {
      const response = await topicApi.decline(topic.id, reasons[topic.id] || "");
      if (response.topic) replaceTopic(response.topic);
      setSuccess(`${topic.student?.name || "The student"}'s topic was declined.`);
      setReasons((current) => ({ ...current, [topic.id]: "" }));
    } catch (requestError) {
      setError(requestError.message || "Unable to decline this topic.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = items.filter((topic) => topic.status === "pending");
  const reviewed = items.filter((topic) => topic.status !== "pending");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Topic review</h2>
          <p className="text-sm text-slate-500">
            Accept or decline the project topics your students have submitted.
          </p>
        </div>
        {pending.length ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
            {pending.length} awaiting review
          </span>
        ) : null}
      </div>

      {error ? <Feedback>{error}</Feedback> : null}
      {success ? (
        <div className="mt-2">
          <Feedback tone="success">{success}</Feedback>
        </div>
      ) : null}

      {loading ? <p className="mt-5 text-sm text-slate-500">Loading topics...</p> : null}

      {!loading && !items.length ? (
        <p className="mt-5 rounded-xl border border-slate-200 p-5 text-sm text-slate-500">{emptyMessage}</p>
      ) : null}

      <div className="mt-5 space-y-3">
        {pending.map((topic) => (
          <div key={topic.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{topic.student?.name || "Unknown student"}</p>
                <p className="text-sm text-slate-500">
                  {topic.student?.studentId || topic.student?.email || "No student ID"}
                  {topic.student?.department ? ` • ${topic.student.department}` : ""}
                </p>
              </div>
              <StatusBadge status={topic.status} />
            </div>

            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
              {topic.title || "Untitled topic"}
            </p>

            <textarea
              value={reasons[topic.id] || ""}
              onChange={(event) =>
                setReasons((current) => ({ ...current, [topic.id]: event.target.value }))
              }
              placeholder="Reason for declining (optional)"
              className="mt-3 min-h-16 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAccept(topic)}
                disabled={busyId === topic.id}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {busyId === topic.id ? "Processing..." : "Accept Topic"}
              </button>
              <button
                type="button"
                onClick={() => handleDecline(topic)}
                disabled={busyId === topic.id}
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
              >
                Decline Topic
              </button>
            </div>
          </div>
        ))}
      </div>

      {reviewed.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Reviewed</h3>
          <div className="mt-3 space-y-3">
            {reviewed.map((topic) => (
              <div
                key={topic.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{topic.student?.name || "Unknown student"}</p>
                  <p className="text-sm text-slate-500">{topic.title || "Untitled topic"}</p>
                  {topic.status === "declined" && topic.declineReason ? (
                    <p className="mt-1 text-sm text-red-700">Reason: {topic.declineReason}</p>
                  ) : null}
                </div>
                <StatusBadge status={topic.status} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
