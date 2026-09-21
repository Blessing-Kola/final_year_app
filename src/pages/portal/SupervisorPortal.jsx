import { Link } from "react-router-dom";
import {} from "lucide-react";
import { usePortalData } from "../../hooks/usePortalData";

export default function SupervisorDashboard() {
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
  const { data } = usePortalData();
  const reviews = data?.reviews ?? [];
  const students = data?.students ?? [];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Reviews</h2>
          <p className="text-sm text-slate-500">
            Review proposals and chapters waiting for your decision.
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
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {item.status}
              </span>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
                Open review
              </button>
            </div>
          </div>
          );
        })}
        {!reviews.length ? <p className="text-sm text-slate-500">No reviews assigned.</p> : null}
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
