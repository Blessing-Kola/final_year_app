import { usePortalData } from "../../hooks/usePortalData";

export default function ExaminerDashboard() {
  const { data } = usePortalData();
  const defenses = data?.defenses ?? [];
  const evaluations = data?.evaluations ?? [];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Assigned defenses", value: defenses.length },
          {
            label: "Evaluations pending",
            value: evaluations.filter((item) => item.status === "pending")
              .length,
          },
          {
            label: "Next defense date",
            value: defenses[0]?.scheduledAt
              ? new Date(defenses[0].scheduledAt).toLocaleDateString()
              : "Not scheduled",
          },
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
          {defenses.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">Defense</p>
                <p className="text-sm text-slate-500">
                  {project.scheduledAt
                    ? new Date(project.scheduledAt).toLocaleString()
                    : "Not scheduled"}
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {project.status}
              </span>
            </div>
          ))}
          {!defenses.length ? (
            <p className="text-sm text-slate-500">No defenses assigned.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ExaminerProjectsPage() {
  const { data } = usePortalData();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(data?.defenses ?? []).map((project) => (
          <div
            key={project.id}
            className="rounded-2xl border border-slate-200 p-4"
          >
            <h3 className="font-semibold text-slate-900">Defense project</h3>
            <p className="mt-2 text-sm text-slate-500">
              {project.status} • {project.venue || "Venue not set"}
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
        {!data?.defenses?.length ? (
          <p className="text-sm text-slate-500">No assigned projects.</p>
        ) : null}
      </div>
    </div>
  );
}

export function ExaminerEvaluationsPage() {
  const { data } = usePortalData();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Evaluations</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Project
          </label>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
            {(data?.defenses ?? []).map((defense) => (
              <option key={defense.id} value={defense.id}>
                Defense on{" "}
                {defense.scheduledAt
                  ? new Date(defense.scheduledAt).toLocaleDateString()
                  : "unscheduled"}
              </option>
            ))}
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
  const { data } = usePortalData();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Schedule</h2>
      <div className="mt-5 space-y-3">
        {(data?.defenses ?? []).map((defense) => (
          <div
            key={defense.id}
            className="rounded-xl border border-slate-200 p-4"
          >
            <p className="font-medium text-slate-900">
              {defense.venue || "Defense"}
            </p>
            <p className="text-sm text-slate-500">
              {defense.scheduledAt
                ? new Date(defense.scheduledAt).toLocaleString()
                : "Not scheduled"}
            </p>
          </div>
        ))}
        {!data?.defenses?.length ? (
          <p className="text-sm text-slate-500">No schedule items.</p>
        ) : null}
      </div>
    </div>
  );
}
