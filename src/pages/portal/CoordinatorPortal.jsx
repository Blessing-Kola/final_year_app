export default function CoordinatorDashboard() {
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
          { label: "Total students", value: "142" },
          { label: "Active courses", value: "18" },
          { label: "Pending proposals", value: "11" },
          { label: "Defenses scheduled", value: "24" },
          { label: "Submissions done", value: "86%" },
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
          {[
            {
              title: "Assign supervisors for 6 new proposals",
              urgency: "High",
            },
            { title: "Confirm 4 defense panels", urgency: "Medium" },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-500">
                  System generated action
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {item.urgency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CoordinatorUsersPage() {
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
            {[
              {
                name: "Ada Bello",
                role: "Student",
                department: "Computer Science",
                status: "Active",
              },
              {
                name: "Prof. Mercy Osei",
                role: "Supervisor",
                department: "Computer Science",
                status: "Active",
              },
            ].map((user) => (
              <tr key={user.name} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{user.role}</td>
                <td className="px-4 py-3 text-slate-600">{user.department}</td>
                <td className="px-4 py-3 text-slate-600">{user.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CoordinatorAssignmentsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Assignments</h2>
      <p className="mt-2 text-sm text-slate-500">
        Match students to available supervisors.
      </p>
      <div className="mt-5 rounded-2xl border border-slate-200 p-5">
        Assignment matrix placeholder
      </div>
    </div>
  );
}

export function CoordinatorProposalsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Proposals</h2>
      <div className="mt-4 space-y-3">
        {[
          {
            student: "Ada Bello",
            title: "Smart campus energy dashboard",
            status: "Pending",
          },
          {
            student: "Kofi Mensah",
            title: "AI-assisted field survey",
            status: "Revision requested",
          },
        ].map((proposal) => (
          <div
            key={proposal.student}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
          >
            <div>
              <p className="font-medium text-slate-900">{proposal.student}</p>
              <p className="text-sm text-slate-500">{proposal.title}</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {proposal.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CoordinatorCalendarPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Calendar</h2>
      <div className="mt-5 rounded-2xl border border-slate-200 p-5">
        Coordinators’ calendar preview placeholder
      </div>
    </div>
  );
}

export function CoordinatorExaminationsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Examinations</h2>
      <div className="mt-5 rounded-2xl border border-slate-200 p-5">
        Defense panel management placeholder
      </div>
    </div>
  );
}

export function CoordinatorReportsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Reports</h2>
      <div className="mt-5 rounded-2xl border border-slate-200 p-5">
        Reports dashboard placeholder
      </div>
    </div>
  );
}
