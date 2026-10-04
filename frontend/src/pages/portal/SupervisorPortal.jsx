import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import TopicReviewPanel from "../../components/TopicReviewPanel";
import SupervisorChapterReview from "../../components/SupervisorChapterReview";
import { Feedback, StatusBadge } from "../../components/StatusBadge";
import MessageThread from "../../components/MessageThread";
import DefenceDayCard from "../../components/DefenceDayCard";
import { SupervisorMeetingRequests } from "../../components/MeetingRequests";
import { defenceApi } from "../../services/api";
import { usePortalData } from "../../hooks/usePortalData";
import { useDefenceSchedule } from "../../hooks/useDefenceSchedule";
import { useAuth } from "../../context/useAuth";
import { hasUnreadFrom, lastMessageWith } from "../../utils/messages.js";
import {
  SCORE_MAX,
  SUPERVISOR_CRITERIA,
  calculateReportScore,
} from "../../utils/scores.js";
import { formatTimestamp } from "../../utils/defenceDay";
// The stage list mirrors the backend derivation so both portals draw the same six steps.
import { PROJECT_TIMELINE as TIMELINE } from "../../utils/projectStage.js";

export function SupervisorDashboard() {
  const { data } = usePortalData();
  const { schedule: defenceDay, loading: defenceLoading, error: defenceError } = useDefenceSchedule();
  const students = Array.isArray(data?.students) ? data.students : [];
  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
  const meetings = Array.isArray(data?.meetings) ? data.meetings : [];
  const pendingReviews = reviews.filter(
    (review) => review && review.status === "pending",
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assigned students", value: students.length },
          { label: "Pending reviews", value: pendingReviews.length },
          { label: "Meetings", value: meetings.length },
          { label: "Assigned projects", value: data?.projects?.length ?? 0 },
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

      <DefenceDayCard schedule={defenceDay} loading={defenceLoading} error={defenceError} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Pending reviews
            </h2>
            <Link
              to="/app/supervisor/reviews"
              className="text-sm font-medium text-indigo-600"
            >
              View queue
            </Link>
          </div>
          <div className="space-y-3">
            {pendingReviews.length ? (
              pendingReviews.map((item) => {
                const student = students.find(
                  (entry) => entry.id === item.studentId,
                );
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {student?.name || "Student"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.type} • awaiting review
                      </p>
                    </div>
                    <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
                      Review
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No pending reviews right now.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Upcoming meetings
          </h2>
          <div className="mt-4 space-y-3">
            {meetings.length ? (
              meetings.map((meeting) => {
                const student = students.find(
                  (entry) => entry.id === meeting.studentId,
                );
                return (
                  <div
                    key={meeting.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <p className="font-medium text-slate-900">
                      {student?.name || "Student"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(meeting.scheduledAt).toLocaleString()} •{" "}
                      {meeting.topic}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No meetings scheduled yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupervisorStudentsPage() {
  const { data } = usePortalData();
  const students = (data?.students ?? []).filter(
    (student) => student && student.id,
  );
  const projects = (data?.projects ?? []).filter(
    (project) => project && project.studentId != null,
  );
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Students</h2>
          <p className="text-sm text-slate-500">
            Browse assigned students and their current progress.
          </p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Stage filter
        </div>
      </div>
      <div className="space-y-3">
        {students.length ? (
          students.map((student) => {
            const project = projects.find(
              (item) => item.studentId === student.id,
            );
            return (
              <div
                key={student.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  <p className="text-sm text-slate-500">
                    {student.studentId || student.email} •{" "}
                    {project?.title || "No project"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {project?.stage || "Not started"}
                  </span>
                  <span className="text-sm text-slate-500">
                    {project?.progress ?? 0}%
                  </span>
                  <Link
                    to={`/app/supervisor/students/${student.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No students have been assigned yet.
          </div>
        )}
      </div>
    </div>
  );
}

export function SupervisorReviewsPage() {
  const { data, loading } = usePortalData();
  const reviews = (data?.reviews ?? []).filter(
    (review) => review && review.studentId != null,
  );
  const students = (data?.students ?? []).filter(
    (student) => student && student.id,
  );
  return (
    <div className="space-y-6">
      <SupervisorChapterReview students={students} />

      <TopicReviewPanel
        topics={data?.studentTopics}
        loading={loading}
        emptyMessage="None of your assigned students have submitted a topic yet."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Reviews</h2>
            <p className="text-sm text-slate-500">
              Everything waiting for your decision, including chapters you have already reviewed.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">
            All
          </div>
        </div>
        <div className="space-y-3">
          {reviews.map((item) => {
            const student = students.find((entry) => entry.id === item.studentId);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{student?.name || "Student"}</p>
                  <p className="text-sm text-slate-500">
                    {item.type} submitted {new Date(item.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            );
          })}
          {!reviews.length ? <p className="text-sm text-slate-500">No reviews assigned.</p> : null}
        </div>
      </div>
    </div>
  );
}

export function SupervisorSchedulingPage() {
  const { data } = usePortalData();
  const meetings = (data?.meetings ?? []).filter(
    (meeting) => meeting && meeting.studentId != null,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Scheduling</h2>
      <p className="mt-2 text-sm text-slate-500">
        Calendar view and upcoming meetings for your assigned students.
      </p>
      <div className="mt-5 space-y-3">
        {meetings.length ? (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="font-medium text-slate-900">{meeting.topic}</p>
              <p className="text-sm text-slate-500">
                {new Date(meeting.scheduledAt).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No meetings are scheduled yet.
          </div>
        )}
      </div>
    </div>
  );
}

// One student's project report score. The weighted total is computed by the shared
// module, so the number shown while marking is the number the server will store.
function ReportScoreForm({ student, result, onResultChange }) {
  const [marks, setMarks] = useState(() => {
    const saved = result?.supervisorBreakdown ?? {};
    return Object.fromEntries(
      SUPERVISOR_CRITERIA.map((criterion) => {
        const value = saved[criterion.key];
        return [criterion.key, value === null || value === undefined ? "" : String(value)];
      }),
    );
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const published = result.status === "published";
  const total = calculateReportScore(marks);
  const submitted = result.supervisorStatus === "submitted";

  const send = async (submit) => {
    if (busy) return;
    setBusy(submit ? "submit" : "draft");
    setError("");
    try {
      const response = await defenceApi.submitSupervisorScore(student.id, {
        breakdown: marks,
        submit,
      });
      onResultChange(response.result);
    } catch (saveError) {
      setError(saveError.message || "The score could not be saved.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{student.name || "Student"}</p>
          {student.studentId ? (
            <p className="text-sm text-slate-500">{student.studentId}</p>
          ) : null}
        </div>
        <StatusBadge
          status={published ? "published" : result.supervisorStatus}
          fallback="Not submitted"
        />
      </div>

      {published ? (
        // Read-only: the coordinator has published, so the score is history.
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Your score (50%)</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {result.supervisorScore} / {Number(result.supervisorMax) || SCORE_MAX}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Defence score (50%)</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {result.defenceScore} / {Number(result.defenceMax) || SCORE_MAX}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Final score</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {result.finalScore}
              <span className="ml-2 text-sm font-normal text-slate-500">
                Grade {result.grade}
              </span>
            </p>
          </div>
          <p className="text-sm text-slate-500 sm:col-span-3">
            Published {formatTimestamp(result.publishedAt)}. Scores can no longer be changed.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {SUPERVISOR_CRITERIA.map((criterion) => (
              <div
                key={criterion.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{criterion.label}</p>
                  <p className="text-sm text-slate-500">Weight {criterion.weight}%</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`${criterion.key}-${student.id}`}>
                    {criterion.label} score out of {SCORE_MAX}
                  </label>
                  <input
                    id={`${criterion.key}-${student.id}`}
                    type="number"
                    min="0"
                    max={SCORE_MAX}
                    step="1"
                    value={marks[criterion.key]}
                    onChange={(event) =>
                      setMarks((current) => ({ ...current, [criterion.key]: event.target.value }))
                    }
                    placeholder="—"
                    className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-slate-500">/ {SCORE_MAX}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <p className="text-sm text-slate-600">
              Project report score:{" "}
              <span className="text-base font-semibold text-slate-900">
                {total === null ? "—" : total}
              </span>{" "}
              / {SCORE_MAX}
            </p>
            {result.supervisorSubmittedAt ? (
              <p className="text-xs text-slate-500">
                {submitted ? "Submitted" : "Saved"} {formatTimestamp(result.supervisorSubmittedAt)}
              </p>
            ) : null}
          </div>

          <div className="mt-3 space-y-3">
            <Feedback tone="error">{error}</Feedback>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => send(false)}
                disabled={total === null || busy !== ""}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "draft" ? "Saving…" : "Save as draft"}
              </button>
              <button
                type="button"
                onClick={() => send(true)}
                disabled={total === null || busy !== ""}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "submit" ? "Submitting…" : "Submit for collation"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {total === null
                ? `Mark every criterion out of ${SCORE_MAX} to save.`
                : "You can revise this score until the coordinator publishes the result."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function SupervisorEvaluationPage() {
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
        if (active) setError(loadError.message || "Your students' results could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const students = (data?.students ?? []).filter((student) => student && student.id);
  const studentById = new Map(students.map((student) => [student.id, student]));

  const onResultChange = (updated) =>
    setResults((current) =>
      current.map((row) => (row.studentId === updated.studentId ? updated : row)),
    );

  const rows = results
    .map((result) => ({
      result,
      student: studentById.get(result.studentId) ?? { id: result.studentId, name: "Student" },
    }))
    .sort((a, b) => String(a.student.name || "").localeCompare(String(b.student.name || "")));

  const outstanding = rows.filter(
    (row) => row.result.status !== "published" && row.result.supervisorStatus !== "submitted",
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Evaluation</h2>
        <p className="mt-2 text-sm text-slate-500">
          Project report scores. The report counts for 50% of the final score; the
          defence counts for the other 50%.
        </p>

        {schedule ? (
          <div className="mt-4">
            <DefenceDayCard schedule={schedule} />
          </div>
        ) : null}

        {rows.length ? (
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {rows.length} student{rows.length === 1 ? "" : "s"}
            </span>
            {outstanding ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                {outstanding} still to submit
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <Feedback tone="error">{error}</Feedback>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading your students…
        </div>
      ) : !schedule ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          The coordinator has not scheduled the defence day yet. Project report scoring
          opens once it is published.
        </div>
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map(({ result, student }) => (
            <ReportScoreForm
              key={result.id}
              student={student}
              result={result}
              onResultChange={onResultChange}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No assigned students are available for evaluation yet.
        </div>
      )}
    </div>
  );
}

export function SupervisorCommunicationPage() {
  const { data } = usePortalData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("messages");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  // The portal payload is fetched once per page, so the thread reports its own
  // fresher rows back here. Without this the "New" badge below could never
  // clear: MessageThread marks a thread read through the API, but this list
  // would keep reading the snapshot taken when the page mounted.
  const [threadMessages, setThreadMessages] = useState({});

  const handleConversationChange = useCallback((partnerId, rows) => {
    setThreadMessages((current) => ({ ...current, [partnerId]: rows }));
  }, []);

  const students = data?.students ?? [];
  const messages = Array.isArray(data?.messages) ? data.messages : [];
  const activeStudentId = selectedStudentId ?? students[0]?.id ?? null;
  const activeStudent =
    students.find((student) => student.id === activeStudentId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1 text-sm">
        {[
          { id: "messages", label: "Messages" },
          { id: "meetings", label: "Meeting requests" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={`rounded-full px-3 py-1 font-medium ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "messages" ? (
        <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Conversations
            </h2>
            <div className="mt-4 space-y-2">
              {students.map((student) => {
                // Per-student, not just "the first message mentioning them" —
                // otherwise a thread can preview a message from another student.
                const thread = threadMessages[student.id] ?? messages;
                const lastMessage = lastMessageWith(thread, student.id);
                const unread = hasUnreadFrom(thread, user?.id, student.id);

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full rounded-xl border p-3 text-left ${
                      student.id === activeStudentId
                        ? "border-indigo-300 bg-indigo-50/60"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{student.name}</p>
                      {unread ? (
                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {lastMessage?.body || "No messages yet."}
                    </p>
                  </button>
                );
              })}
              {!students.length ? (
                <p className="text-sm text-slate-500">
                  No students have been assigned to you.
                </p>
              ) : null}
            </div>
          </div>

          <MessageThread
            key={activeStudentId}
            partnerId={activeStudentId}
            partnerName={activeStudent?.name}
            partnerSubtitle={
              activeStudent ? activeStudent.studentId || activeStudent.email : ""
            }
            currentUserId={user?.id}
            onConversationChange={handleConversationChange}
            emptyHint="No students have been assigned to you yet, so there is nobody to message."
          />
        </div>
      ) : (
        <SupervisorMeetingRequests />
      )}
    </div>
  );
}

export function SupervisorStudentDetailPage() {
  const { studentId } = useParams();
  const { data, loading, error } = usePortalData();

  const students = data?.students ?? [];
  const projects = data?.projects ?? [];
  const studentTopics = data?.studentTopics ?? [];
  const reviews = data?.reviews ?? [];
  const meetings = data?.meetings ?? [];

  const student = students.find((entry) => entry.id === studentId);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading student...</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Unable to load this student
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          The portal data request did not come back, so this student's details
          could not be loaded.
        </p>
        <div className="mt-3">
          <Feedback>{error}</Feedback>
        </div>
        <Link
          to="/app/supervisor/students"
          className="mt-4 inline-block rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Back to students
        </Link>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Student not found</h2>
        <p className="mt-2 text-sm text-slate-500">
          This student is not assigned to you, or the account no longer exists.
        </p>
        <Link
          to="/app/supervisor/students"
          className="mt-4 inline-block rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Back to students
        </Link>
      </div>
    );
  }

  const project = projects.find((entry) => entry.studentId === student.id);
  const topic = studentTopics.find((entry) => entry.studentId === student.id);
  const studentReviews = reviews.filter((entry) => entry.studentId === student.id);
  const studentMeetings = meetings.filter((entry) => entry.studentId === student.id);

  const progress = project?.progress ?? 0;
  const completedSteps = project
    ? Math.min(Math.floor((progress / 100) * TIMELINE.length), TIMELINE.length)
    : 0;
  const nextStageIndex = project && completedSteps < TIMELINE.length ? completedSteps : -1;
  const nextStage = nextStageIndex === -1 ? null : TIMELINE[nextStageIndex];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          to="/app/supervisor/students"
          className="text-sm font-medium text-indigo-600"
        >
          ← Back to students
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {student.name}
            </h2>
            <p className="text-sm text-slate-500">
              {student.studentId || student.email}
              {student.department ? ` • ${student.department}` : ""}
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {project?.stage || "Not started"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Project</h3>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-500">Title</span>
              <span className="text-sm font-medium text-slate-900">
                {project?.title || "No project yet"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-500">Stage</span>
              <span className="text-sm font-medium text-slate-900">
                {project?.stage || "Not started"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-500">Progress</span>
              <span className="text-sm font-medium text-slate-900">
                {project?.progress ?? 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Topic</h3>
          {topic ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="text-sm font-medium text-slate-900">
                  {topic.title || "Untitled topic"}
                </span>
                <StatusBadge status={topic.status} />
              </div>
              {topic.submittedAt ? (
                <p className="text-sm text-slate-500">
                  Submitted {new Date(topic.submittedAt).toLocaleDateString()}
                </p>
              ) : null}
              {topic.status === "declined" && topic.declineReason ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  Reason: {topic.declineReason}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              This student has not submitted a topic yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">
            Project progress
          </h3>
          <p className="text-sm text-slate-500">
            {project ? `${progress}% complete` : "No project yet"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {TIMELINE.map((step, index) => {
            const completed = project ? index < completedSteps : false;
            const active = index === nextStageIndex;
            return (
              <div
                key={step}
                className="flex min-w-[120px] flex-1 flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 text-center"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    completed
                      ? "bg-indigo-600 text-white"
                      : active
                        ? "border-2 border-indigo-600 bg-white text-indigo-600"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {completed ? <CheckCircle2 size={18} /> : index + 1}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-slate-500">
          {nextStage ? (
            <>
              Next stage:{" "}
              <span className="font-medium text-slate-900">{nextStage}</span>
            </>
          ) : project ? (
            "All stages complete."
          ) : (
            "No project has been created for this student yet."
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Reviews</h3>
          <div className="mt-4 space-y-3">
            {studentReviews.map((review) => (
              <div
                key={review.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
              >
                <span className="text-sm text-slate-700">{review.type}</span>
                <StatusBadge status={review.status} />
              </div>
            ))}
            {!studentReviews.length ? (
              <p className="text-sm text-slate-500">No reviews for this student.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Meetings</h3>
          <div className="mt-4 space-y-3">
            {studentMeetings.map((meeting) => (
              <div key={meeting.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{meeting.topic}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(meeting.scheduledAt).toLocaleString()}
                </p>
              </div>
            ))}
            {!studentMeetings.length ? (
              <p className="text-sm text-slate-500">No meetings scheduled.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
