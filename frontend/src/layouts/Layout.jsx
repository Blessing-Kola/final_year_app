import { NavLink, Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <nav className="flex w-56 flex-col gap-2 bg-slate-900 p-6 text-slate-200">
        <h2 className="mb-4 text-xl font-semibold text-white">PM App</h2>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 transition ${isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white"}`
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 transition ${isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white"}`
          }
        >
          Projects
        </NavLink>
      </nav>

      <main className="flex-1 bg-white p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
