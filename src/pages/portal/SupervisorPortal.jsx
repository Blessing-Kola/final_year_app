import { Link } from "react-router-dom";
import {} from "lucide-react";

export default function SupervisorDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assigned students", value: "14" },
          { label: "Pending reviews", value: "5" },
          { label: "Meetings this week", value: "3" },
          { label: "Cohort avg. progress", value: "78%" },
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
            {[
              { student: "Ada Bello", chapter: "Chapter 4", days: "2 days" },
              { student: "Kofi Mensah", chapter: "Proposal", days: "1 day" },
            ].map((item) => (
              <div
                key={item.student}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.student}</p>
                  <p className="text-sm text-slate-500">
                    {item.chapter} • {item.days} waiting
                  </p>
                </div>
                <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Upcoming meetings
          </h2>
          <div className="mt-4 space-y-3">
            {[
              {
                student: "Ada Bello",
                datetime: "Jun 18 • 10:00",
                topic: "Chapter 4 feedback",
              },
              {
                student: "Kofi Mensah",
                datetime: "Jun 20 • 14:00",
                topic: "Proposal revision",
              },
            ].map((meeting) => (
              <div
                key={meeting.student}
                className="rounded-xl border border-slate-200 p-3"
              >
                <p className="font-medium text-slate-900">{meeting.student}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {meeting.datetime} • {meeting.topic}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupervisorStudentsPage() {
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
        {[
          {
            name: "Ada Bello",
            id: "20261170",
            project: "Smart campus energy dashboard",
            stage: "Chapter review",
            progress: "78%",
          },
          {
            name: "Kofi Mensah",
            id: "20261171",
            project: "AI-assisted field survey",
            stage: "Proposal",
            progress: "42%",
          },
        ].map((student) => (
          <div
            key={student.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <p className="font-semibold text-slate-900">{student.name}</p>
              <p className="text-sm text-slate-500">
                {student.id} • {student.project}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {student.stage}
              </span>
              <span className="text-sm text-slate-500">{student.progress}</span>
              <Link
                to="/app/supervisor/students/1"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupervisorReviewsPage() {
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
        {[
          {
            student: "Ada Bello",
            type: "Chapter",
            date: "Jun 12",
            days: "2 days",
          },
          {
            student: "Kofi Mensah",
            type: "Proposal",
            date: "Jun 10",
            days: "4 days",
          },
        ].map((item) => (
          <div
            key={item.student}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
          >
            <div>
              <p className="font-medium text-slate-900">{item.student}</p>
              <p className="text-sm text-slate-500">
                {item.type} submitted {item.date}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {item.days}
              </span>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
                Open review
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupervisorFeedbackPage() {
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
            <option>Ada Bello</option>
            <option>Kofi Mensah</option>
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
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Scheduling</h2>
      <p className="mt-2 text-sm text-slate-500">
        Calendar view and upcoming meetings for your assigned students.
      </p>
      <div className="mt-5 rounded-2xl border border-slate-200 p-5">
        Calendar preview placeholder
      </div>
    </div>
  );
}

export function SupervisorEvaluationPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Evaluation</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Student
          </label>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
            <option>Ada Bello</option>
            <option>Kofi Mensah</option>
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
