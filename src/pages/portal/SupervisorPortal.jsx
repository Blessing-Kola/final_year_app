import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import TopicReviewPanel from "../../components/TopicReviewPanel";
import SupervisorChapterReview from "../../components/SupervisorChapterReview";
import { Feedback, StatusBadge } from "../../components/StatusBadge";
import { SupervisorMeetingRequests } from "../../components/MeetingRequests";
import { usePortalData } from "../../hooks/usePortalData";

// Mirrors the stage list on the student dashboard so both portals agree on progress.
const TIMELINE = [
  "Proposal",
  "Supervisor assigned",
  "Chapter writing",
  "Chapter review",
  "Defense",
  "Final submission",
];

export function SupervisorDashboard() {
  const { data } = usePortalData();
  const students = data?.students ?? [];
  const reviews = data?.reviews ?? [];
  const meetings = data?.meetings ?? [];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assigned students", value: students.length },
          { label: "Pending reviews", value: reviews.filter((review) => review.status === "pending").length },
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
            {reviews.filter((review) => review.status === "pending").map((item) => {
              const student = students.find((entry) => entry.id === item.studentId);
              return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{student?.name || "Student"}</p>
                  <p className="text-sm text-slate-500">
                    {item.type} • awaiting review
                  </p>
                </div>
                <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
                  Review
                </button>
              </div>
            );
            })}
            {!reviews.filter((review) => review.status === "pending").length ? (
              <p className="text-sm text-slate-500">No pending reviews.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Upcoming meetings
          </h2>
          <div className="mt-4 space-y-3">
            {meetings.map((meeting) => {
              const student = students.find((entry) => entry.id === meeting.studentId);
              return (
              <div
                key={meeting.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <p className="font-medium text-slate-900">{student?.name || "Student"}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(meeting.scheduledAt).toLocaleString()} • {meeting.topic}
                </p>
              </div>
            );
            })}
            {!meetings.length ? <p className="text-sm text-slate-500">No meetings scheduled.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupervisorStudentsPage() {
  const { data } = usePortalData();
  const students = data?.students ?? [];
  const projects = data?.projects ?? [];
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
        {students.map((student) => {
          const project = projects.find((item) => item.studentId === student.id);
          return (
          <div
            key={student.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <p className="font-semibold text-slate-900">{student.name}</p>
              <p className="text-sm text-slate-500">
                {student.studentId || student.email} • {project?.title || "No project"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {project?.stage || "Not started"}
              </span>
              <span className="text-sm text-slate-500">{project?.progress ?? 0}%</span>
              <Link
                to={`/app/supervisor/students/${student.id}`}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
              >
                View
              </Link>
            </div>
          </div>
          );
        })}
        {!students.length ? <p className="text-sm text-slate-500">No students have been assigned.</p> : null}
      </div>
    </div>
  );
}

export function SupervisorReviewsPage() {
  const { data, loading } = usePortalData();
  const reviews = data?.reviews ?? [];
  const students = data?.students ?? [];
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

export function SupervisorFeedbackPage() {
  const { data } = usePortalData();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Feedback composer
      </h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Student
          </label>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
            {(data?.students ?? []).map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Overall assessment
          </label>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
            <option>Approved</option>
            <option>Needs revision</option>
            <option>Rejected</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Strengths
          </label>
          <textarea className="min-h-[90px] w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Areas for improvement
          </label>
          <textarea className="min-h-[90px] w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        </div>
        <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Send feedback
        </button>
      </div>
    </div>
  );
}

export function SupervisorSchedulingPage() {
  const { data } = usePortalData();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Scheduling</h2>
      <p className="mt-2 text-sm text-slate-500">
        Calendar view and upcoming meetings for your assigned students.
      </p>
      <div className="mt-5 space-y-3">
        {(data?.meetings ?? []).map((meeting) => (
          <div key={meeting.id} className="rounded-xl border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{meeting.topic}</p>
            <p className="text-sm text-slate-500">{new Date(meeting.scheduledAt).toLocaleString()}</p>
          </div>
        ))}
        {!data?.meetings?.length ? <p className="text-sm text-slate-500">No meetings scheduled.</p> : null}
      </div>
    </div>
  );
}

export function SupervisorEvaluationPage() {
  const { data } = usePortalData();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Evaluation</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Student
          </label>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
            {(data?.students ?? []).map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          {[
            { label: "Research quality", weight: "25%" },
            { label: "Methodology", weight: "20%" },
            { label: "Writing", weight: "20%" },
            { label: "Defense presentation", weight: "20%" },
            { label: "Originality", weight: "15%" },
          ].map((criterion) => (
            <div
              key={criterion.label}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{criterion.label}</p>
                <p className="text-sm text-slate-500">
                  Weight {criterion.weight}
                </p>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-sm text-slate-700"
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Submit evaluation
        </button>
      </div>
    </div>
  );
}

export function SupervisorCommunicationPage() {
  const { data } = usePortalData();
  const [activeTab, setActiveTab] = useState("messages");
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const students = data?.students ?? [];
  const messages = data?.messages ?? [];
  const activeStudentId = selectedStudentId ?? students[0]?.id ?? null;
  const activeStudent =
    students.find((student) => student.id === activeStudentId) ?? null;
  const conversation = messages.filter(
    (message) =>
      message.senderId === activeStudentId ||
      message.recipientId === activeStudentId,
  );

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
                const lastMessage = messages.find(
                  (message) =>
                    message.senderId === student.id ||
                    message.recipientId === student.id,
                );
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
                    <p className="font-medium text-slate-900">{student.name}</p>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="font-semibold text-slate-900">
                {activeStudent?.name || "Student"}
              </h2>
              <p className="text-sm text-slate-500">
                {activeStudent
                  ? activeStudent.studentId || activeStudent.email
                  : "No conversation selected"}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {conversation.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                    message.senderId === activeStudentId
                      ? "bg-slate-100 text-slate-700"
                      : "ml-auto bg-indigo-600 text-white"
                  }`}
                >
                  {message.body}
                </div>
              ))}
              {!conversation.length ? (
                <p className="text-sm text-slate-500">
                  No messages in this conversation yet.
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex items-end gap-2 rounded-2xl border border-slate-200 p-3">
              <textarea
                className="min-h-[80px] flex-1 resize-none border-0 outline-none"
                placeholder="Write a message"
                disabled={!activeStudent}
              />
              <button
                disabled={!activeStudent}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
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
