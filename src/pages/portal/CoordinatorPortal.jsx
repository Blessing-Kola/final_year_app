import { useEffect, useState } from "react";
import { supervisorApi } from "../../services/api";
import { usePortalData } from "../../hooks/usePortalData";

export default function CoordinatorDashboard() {
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
  const users = [...(data?.students ?? []), ...(data?.supervisors ?? [])];
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
              <tr key={user.name} className="border-t border-slate-200">
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
    Promise.all([supervisorApi.listRequests(), supervisorApi.listSupervisors()])
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
    Promise.all([supervisorApi.listRequests(), supervisorApi.listSupervisors()])
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
  const { data } = usePortalData();
  const projects = data?.projects ?? [];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Proposals</h2>
      <div className="mt-4 space-y-3">
        {projects.map((proposal) => {
          const student = (data?.students ?? []).find(
            (entry) => entry.id === proposal.studentId,
          );
          return (
            <div
              key={proposal.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {student?.name || "Student"}
                </p>
                <p className="text-sm text-slate-500">{proposal.title}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {proposal.status}
              </span>
            </div>
          );
        })}
        {!projects.length ? (
          <p className="text-sm text-slate-500">No projects submitted.</p>
        ) : null}
      </div>
    </div>
  );
}

export function CoordinatorCalendarPage() {
  const { data } = usePortalData();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Calendar</h2>
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
                : "Unscheduled"}
            </p>
          </div>
        ))}
        {!data?.defenses?.length ? (
          <p className="text-sm text-slate-500">No defenses scheduled.</p>
        ) : null}
      </div>
    </div>
  );
}

export function CoordinatorExaminationsPage() {
  const { data } = usePortalData();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Examinations</h2>
      <div className="mt-5 space-y-3">
        {(data?.defenses ?? []).map((defense) => (
          <div
            key={defense.id}
            className="rounded-xl border border-slate-200 p-4"
          >
            <p className="font-medium text-slate-900">{defense.status}</p>
            <p className="text-sm text-slate-500">
              {defense.venue || "Venue not set"}
            </p>
          </div>
        ))}
        {!data?.defenses?.length ? (
          <p className="text-sm text-slate-500">No examination panels yet.</p>
        ) : null}
      </div>
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
