import { useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin, Save, Send } from "lucide-react";
import { defenceApi, supervisorApi } from "../../services/api";
import TopicReviewPanel from "../../components/TopicReviewPanel";
import { Feedback, StatusBadge } from "../../components/StatusBadge";
import { SCORE_MAX, describeResult, isWithinRange } from "../../lib/scores";
import { formatDefenceDate, formatDefenceTime, formatTimestamp } from "../../lib/defenceDay";
import { usePortalData } from "../../hooks/usePortalData";

export function CoordinatorDashboard() {
  const { data } = usePortalData();
  const stats = data?.stats ?? {};
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Course coordinator workspace
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Oversee course delivery, assignments, proposals, and academic
          planning.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total students", value: stats.students ?? 0 },
          { label: "Supervisors", value: stats.supervisors ?? 0 },
          {
            label: "Pending supervisor requests",
            value: stats.pendingRequests ?? 0,
          },
          { label: "Projects", value: stats.projects ?? 0 },
          { label: "Defenses scheduled", value: stats.defenses ?? 0 },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Pending actions
        </h2>
        <div className="mt-4 space-y-3">
          {(stats.pendingRequests
            ? [
                {
                  title: `${stats.pendingRequests} supervisor requests need assignment`,
                  urgency: "High",
                },
              ]
            : []
          ).map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-500">
                  Open the assignments queue
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {item.urgency}
              </span>
            </div>
          ))}
          {!stats.pendingRequests ? (
            <p className="text-sm text-slate-500">No pending actions.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CoordinatorUsersPage() {
  const { data } = usePortalData();
  const users = [
    ...(Array.isArray(data?.students) ? data.students : []),
    ...(Array.isArray(data?.supervisors) ? data.supervisors : []),
  ].filter((user) => user && user.id);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500">
            Manage all platform accounts and roles.
          </p>
        </div>
        <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Add user
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{user.role}</td>
                <td className="px-4 py-3 text-slate-600">{user.department}</td>
                <td className="px-4 py-3 text-slate-600">Active</td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-500" colSpan="4">
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CoordinatorAssignmentsPage() {
  const [requests, setRequests] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAssignments = () => {
    setLoading(true);
    Promise.all([supervisorApi.getRequest(), supervisorApi.listSupervisors()])
      .then(([requestResponse, supervisorResponse]) => {
        setRequests(requestResponse.requests ?? []);
        setSupervisors(supervisorResponse.users ?? []);
      })
      .catch((requestError) =>
        setError(requestError.message || "Unable to load assignments."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([supervisorApi.getRequest(), supervisorApi.listSupervisors()])
      .then(([requestResponse, supervisorResponse]) => {
        setRequests(requestResponse.requests ?? []);
        setSupervisors(supervisorResponse.users ?? []);
      })
      .catch((requestError) =>
        setError(requestError.message || "Unable to load assignments."),
      )
      .finally(() => setLoading(false));
  }, []);

  const assignSupervisor = async (requestId) => {
    const supervisorId = selectedSupervisors[requestId];
    if (!supervisorId) return;

    try {
      await supervisorApi.assign(requestId, supervisorId);
      loadAssignments();
    } catch (assignError) {
      setError(assignError.message || "Unable to assign supervisor.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Assignments</h2>
      <p className="mt-2 text-sm text-slate-500">
        Review student requests and assign a supervisor.
      </p>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Loading requests...</p>
      ) : null}
      {!loading && !requests.length ? (
        <p className="mt-5 rounded-xl border border-slate-200 p-5 text-sm text-slate-500">
          No supervisor requests yet.
        </p>
      ) : null}
      <div className="mt-5 space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {request.student?.name || "Unknown student"}
              </p>
              <p className="text-sm text-slate-500">
                {request.student?.email} • {request.student?.department}
              </p>
              {request.message ? (
                <p className="mt-2 text-sm text-slate-600">{request.message}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {request.status === "assigned" ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  Assigned to {request.supervisor?.name}
                </span>
              ) : (
                <>
                  <select
                    value={selectedSupervisors[request.id] || ""}
                    onChange={(event) =>
                      setSelectedSupervisors((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select supervisor</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name} ·{" "}
                        {supervisor.department || "No department"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => assignSupervisor(request.id)}
                    disabled={!selectedSupervisors[request.id]}
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Assign
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CoordinatorProposalsPage() {
  const { data, loading } = usePortalData();
  const proposals = (Array.isArray(data?.proposals) ? data.proposals : []).filter(
    (proposal) => proposal && proposal.id != null,
  );
  const students = (Array.isArray(data?.students) ? data.students : []).filter(
    (student) => student && student.id,
  );

  return (
    <div className="space-y-6">
      <TopicReviewPanel
        topics={data?.studentTopics}
        loading={loading}
        emptyMessage="No student topics have been submitted yet."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Proposals</h2>
        <p className="mt-2 text-sm text-slate-500">
          Proposals submitted by students whose topics have been accepted.
        </p>
        <div className="mt-4 space-y-3">
          {proposals.map((proposal) => {
            const student =
              proposal.student || students.find((entry) => entry.id === proposal.studentId);
            return (
              <div
                key={proposal.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{student?.name || "Student"}</p>
                  <p className="text-sm text-slate-500">{proposal.title}</p>
                </div>
                <StatusBadge status={proposal.status} fallback="Draft" />
              </div>
            );
          })}
          {!loading && !proposals.length ? (
            <p className="text-sm text-slate-500">No proposals submitted.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const EMPTY_DEFENCE_FORM = {
  title: "Project defence",
  scheduledDate: "",
  startTime: "",
  venue: "",
  instructions: "",
};

const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm";

// The coordinator's one screen for the shared defence day. Publishing records a new
// version rather than editing the existing one, so the day students were already
// notified about is never silently rewritten.
export function CoordinatorCalendarPage() {
  const [schedule, setSchedule] = useState(null);
  const [form, setForm] = useState(EMPTY_DEFENCE_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    defenceApi
      .getSchedule()
      .then((response) => {
        if (!active) return;
        const current = response.schedule ?? null;
        setSchedule(current);
        // Prefilled, so correcting the venue starts from what everyone can see.
        if (current) {
          setForm({
            title: current.title || EMPTY_DEFENCE_FORM.title,
            scheduledDate: current.scheduledDate || "",
            startTime: current.startTime || "",
            venue: current.venue || "",
            instructions: current.instructions || "",
          });
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "The defence day could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await defenceApi.saveSchedule({
        ...form,
        title: form.title.trim() || EMPTY_DEFENCE_FORM.title,
      });
      setSchedule(response.schedule);
      setNotice(
        schedule
          ? "Defence day updated. Students and supervisors have been notified of the change."
          : "Defence day published. Students and supervisors have been notified.",
      );
    } catch (saveError) {
      setError(saveError.message || "The defence day could not be published.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Defence day</h2>
        <p className="mt-2 text-sm text-slate-500">
          The defence day is shared by every student. Publishing notifies all students
          with a project and all supervisors with assigned students.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading the defence day…</p>
        ) : schedule ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="font-medium text-slate-900">{schedule.title}</p>
              <span className="text-xs text-slate-500">
                Published {formatTimestamp(schedule.publishedAt)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <CalendarDays size={15} /> {formatDefenceDate(schedule.scheduledDate)}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={15} /> {formatDefenceTime(schedule.startTime)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin size={15} /> {schedule.venue}
              </span>
            </div>
            {schedule.instructions ? (
              <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                {schedule.instructions}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No defence day has been published yet. Students and supervisors see the
            defence date as soon as you publish it.
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-slate-900">
          {schedule ? "Publish a corrected schedule" : "Schedule the defence day"}
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="defence-title">
              Title
            </label>
            <input
              id="defence-title"
              value={form.title}
              onChange={updateField("title")}
              maxLength={120}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="defence-date">
              Date
            </label>
            <input
              id="defence-date"
              type="date"
              value={form.scheduledDate}
              onChange={updateField("scheduledDate")}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="defence-time">
              Start time
            </label>
            <input
              id="defence-time"
              type="time"
              value={form.startTime}
              onChange={updateField("startTime")}
              required
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="defence-venue">
              Venue
            </label>
            <input
              id="defence-venue"
              value={form.venue}
              onChange={updateField("venue")}
              placeholder="e.g. Faculty of Science, Lecture Theatre 2"
              maxLength={200}
              required
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor="defence-instructions"
            >
              Instructions for students and supervisors
            </label>
            <textarea
              id="defence-instructions"
              value={form.instructions}
              onChange={updateField("instructions")}
              placeholder="What to bring, how long each defence lasts, panel arrangements…"
              className={`${inputClass} min-h-[110px]`}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Feedback tone="error">{error}</Feedback>
          <Feedback tone="success">{notice}</Feedback>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} />
            {saving ? "Publishing…" : schedule ? "Update defence day" : "Publish defence day"}
          </button>
        </div>
      </form>
    </div>
  );
}

// One row per student. The final score and grade shown here are computed by the
// same module the server publishes with, so what the coordinator reads is exactly
// what gets stored.
function ExaminationRow({ student, project, result, onResultChange }) {
  const [draft, setDraft] = useState(
    result.defenceScore === null || result.defenceScore === undefined
      ? ""
      : String(result.defenceScore),
  );
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [audit, setAudit] = useState(null);

  const published = result.status === "published";
  const defenceMax = Number(result.defenceMax) || SCORE_MAX;

  const preview = describeResult({
    supervisorScore: result.supervisorScore,
    supervisorMax: result.supervisorMax,
    defenceScore: draft === "" ? null : draft,
    defenceMax,
  });

  // Publishing is gated on what is stored, not on what is currently typed: an
  // unsaved defence score has not reached the server, so it cannot be published.
  const stored = describeResult(result);

  // A published row shows what was actually stored, not a re-computation of it.
  const finalScore = published ? result.finalScore : preview.finalScore;
  const grade = published ? result.grade : preview.grade;

  const draftUnchanged =
    draft !== "" && Number(draft) === Number(result.defenceScore ?? NaN);

  const saveDefence = async () => {
    if (busy) return;
    setBusy("defence");
    setError("");
    try {
      const response = await defenceApi.recordDefenceScore(student.id, Number(draft));
      onResultChange(response.result);
    } catch (saveError) {
      setError(saveError.message || "The defence score could not be saved.");
    } finally {
      setBusy("");
    }
  };

  const publish = async () => {
    if (busy) return;
    setBusy("publish");
    setError("");
    try {
      const response = await defenceApi.publishResult(student.id);
      onResultChange(response.result);
    } catch (publishError) {
      setError(publishError.message || "The result could not be published.");
    } finally {
      setBusy("");
    }
  };

  const toggleAudit = async () => {
    if (auditOpen) {
      setAuditOpen(false);
      return;
    }
    setAuditOpen(true);
    if (audit) return;

    try {
      const response = await defenceApi.audit(student.id);
      setAudit(Array.isArray(response.entries) ? response.entries : []);
    } catch (auditError) {
      setError(auditError.message || "The audit trail could not be loaded.");
      setAuditOpen(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{student.name || "Student"}</p>
          <p className="text-sm text-slate-500">
            {student.studentId ? `${student.studentId} • ` : ""}
            {project?.title || "Project"}
          </p>
        </div>
        <StatusBadge status={published ? "published" : result.status} fallback="Collecting" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Supervisor score (50%)
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {result.supervisorScore === null || result.supervisorScore === undefined
              ? "—"
              : `${result.supervisorScore} / ${Number(result.supervisorMax) || SCORE_MAX}`}
          </p>
          <div className="mt-2">
            <StatusBadge status={result.supervisorStatus} fallback="Not submitted" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <label
            className="text-xs uppercase tracking-wide text-slate-500"
            htmlFor={`defence-score-${student.id}`}
          >
            Defence score (50%)
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id={`defence-score-${student.id}`}
              type="number"
              min="0"
              max={defenceMax}
              step="0.01"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={published}
              placeholder="—"
              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
            />
            <span className="text-sm text-slate-500">/ {defenceMax}</span>
          </div>
          <button
            type="button"
            onClick={saveDefence}
            disabled={published || busy !== "" || draft === "" || draftUnchanged || !isWithinRange(draft, defenceMax)}
            className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={15} />
            {busy === "defence" ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Final score</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {finalScore === null || finalScore === undefined ? "—" : finalScore}
          </p>
          <p className="text-sm text-slate-500">{grade ? `Grade ${grade}` : "Not graded yet"}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Result</p>
          {published ? (
            <p className="mt-1 text-sm text-emerald-700">
              Published {formatTimestamp(result.publishedAt)}
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={publish}
                disabled={!stored.ready || busy !== ""}
                className="mt-1 flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={15} />
                {busy === "publish" ? "Publishing…" : "Publish"}
              </button>
              {stored.ready ? (
                <p className="mt-1 text-xs text-slate-500">
                  Both components are in. Publishing is final.
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Waiting for the {stored.missing.join(" and ")}.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <Feedback tone="error">{error}</Feedback>
        <button
          type="button"
          onClick={toggleAudit}
          className="text-sm font-medium text-indigo-600"
        >
          {auditOpen ? "Hide" : "View"} audit trail
        </button>

        {auditOpen ? (
          audit && audit.length ? (
            <ul className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              {audit.map((entry) => (
                <li key={entry.id}>
                  <span className="font-medium capitalize">{entry.action}</span>{" "}
                  {entry.field}
                  {entry.oldValue ? ` from ${entry.oldValue}` : ""} to {entry.newValue}
                  {entry.actorRole ? ` — ${entry.actorRole}` : ""},{" "}
                  {formatTimestamp(entry.createdAt)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nothing recorded for this student yet.</p>
          )
        ) : null}
      </div>
    </div>
  );
}

export function CoordinatorExaminationsPage() {
  const { data } = usePortalData();
  const [results, setResults] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    defenceApi
      .listResults()
      .then((response) => {
        if (!active) return;
        setResults(Array.isArray(response.results) ? response.results : []);
        setSchedule(response.schedule ?? null);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "The examination list could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const students = Array.isArray(data?.students) ? data.students : [];
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const studentById = new Map(students.filter((s) => s?.id).map((s) => [s.id, s]));
  const projectByStudent = new Map(
    projects.filter((p) => p?.studentId).map((p) => [p.studentId, p]),
  );

  const onResultChange = (updated) =>
    setResults((current) => current.map((row) => (row.studentId === updated.studentId ? updated : row)));

  const rows = results
    .map((result) => ({
      result,
      student: studentById.get(result.studentId) ?? { id: result.studentId, name: "Student" },
      project: projectByStudent.get(result.studentId) ?? null,
    }))
    .sort((a, b) => String(a.student.name || "").localeCompare(String(b.student.name || "")));

  const readyCount = rows.filter((row) => describeResult(row.result).ready && row.result.status !== "published").length;
  const publishedCount = rows.filter((row) => row.result.status === "published").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Examinations</h2>
        <p className="mt-2 text-sm text-slate-500">
          Final score = 50% supervisor project report + 50% defence. A result can only
          be published once both components are in.
        </p>

        {schedule ? (
          <p className="mt-3 text-sm text-slate-600">
            {schedule.title}: {formatDefenceDate(schedule.scheduledDate)} at{" "}
            {formatDefenceTime(schedule.startTime)}, {schedule.venue}
          </p>
        ) : (
          <p className="mt-3 text-sm text-amber-700">
            No defence day has been published yet. Publish one from the Calendar page to
            open score entry.
          </p>
        )}

        {rows.length ? (
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {rows.length} student{rows.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
              {readyCount} ready to publish
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              {publishedCount} published
            </span>
          </div>
        ) : null}
      </div>

      <Feedback tone="error">{error}</Feedback>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading results…
        </div>
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map(({ result, student, project }) => (
            <ExaminationRow
              key={result.id}
              student={student}
              project={project}
              result={result}
              onResultChange={onResultChange}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No students have a project to be examined yet.
        </div>
      )}
    </div>
  );
}

export function CoordinatorReportsPage() {
  const { data } = usePortalData();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Reports</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {Object.entries(data?.stats ?? {}).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm capitalize text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
