export default function ExaminerDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Assigned projects", value: "6" },
          { label: "Evaluations pending", value: "3" },
          { label: "Next defense date", value: "Jun 28" },
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
          Assigned projects
        </h2>
        <div className="mt-4 space-y-3">
          {[
            {
              student: "Ada Bello",
              title: "Smart campus energy dashboard",
              status: "Pending review",
            },
          ].map((project) => (
            <div
              key={project.student}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">{project.student}</p>
                <p className="text-sm text-slate-500">{project.title}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {project.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExaminerProjectsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          {
            title: "Smart campus energy dashboard",
            student: "Ada Bello",
            department: "Computer Science",
            status: "Pending",
          },
        ].map((project) => (
          <div
            key={project.title}
            className="rounded-2xl border border-slate-200 p-4"
          >
            <h3 className="font-semibold text-slate-900">{project.title}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {project.student} • {project.department}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {project.status}
              </span>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExaminerEvaluationsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Evaluations</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Project
          </label>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
            <option>Smart campus energy dashboard</option>
          </select>
        </div>
        <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Submit evaluation
        </button>
      </div>
    </div>
  );
}

export function ExaminerSchedulePage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Schedule</h2>
      <div className="mt-5 rounded-2xl border border-slate-200 p-5">
        Examiner schedule placeholder
      </div>
    </div>
  );
}
