import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BookOpen,
  Briefcase,
  GraduationCap,
  LayoutGrid,
  Menu,
  MessageSquare,
  Bell,
  ShieldCheck,
  UserCircle2,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/useTheme";

const navigationByRole = {
  student: [
    { name: "Dashboard", href: "/app/student/dashboard", icon: LayoutGrid },
    { name: "Project setup", href: "/app/student/project", icon: Briefcase },
    { name: "Documents", href: "/app/student/documents", icon: BookOpen },
    {
      name: "Communication",
      href: "/app/student/communication",
      icon: MessageSquare,
    },
    { name: "Defense", href: "/app/student/defense", icon: ShieldCheck },
    { name: "Account", href: "/app/student/account", icon: UserCircle2 },
  ],
  supervisor: [
    { name: "Dashboard", href: "/app/supervisor/dashboard", icon: LayoutGrid },
    { name: "Students", href: "/app/supervisor/students", icon: Briefcase },
    { name: "Reviews", href: "/app/supervisor/reviews", icon: BookOpen },
    { name: "Feedback", href: "/app/supervisor/feedback", icon: MessageSquare },
    {
      name: "Scheduling",
      href: "/app/supervisor/scheduling",
      icon: ShieldCheck,
    },
    {
      name: "Evaluation",
      href: "/app/supervisor/evaluation",
      icon: UserCircle2,
    },
  ],
  coordinator: [
    { name: "Dashboard", href: "/app/coordinator/dashboard", icon: LayoutGrid },
    { name: "Users", href: "/app/coordinator/users", icon: UserCircle2 },
    {
      name: "Assignments",
      href: "/app/coordinator/assignments",
      icon: Briefcase,
    },
    { name: "Proposals", href: "/app/coordinator/proposals", icon: BookOpen },
    { name: "Calendar", href: "/app/coordinator/calendar", icon: ShieldCheck },
    {
      name: "Examinations",
      href: "/app/coordinator/examinations",
      icon: MessageSquare,
    },
    { name: "Reports", href: "/app/coordinator/reports", icon: BookOpen },
  ],
};

export default function AppShell({ role }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navigation = navigationByRole[role] ?? [];
  const profileName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Demo user";
  const roleLabel =
    role === "coordinator"
      ? "Course coordinator"
      : role === "supervisor"
        ? "Supervisor"
        : "Student";
  const title =
    navigation.find((item) => location.pathname.startsWith(item.href))?.name ??
    "Overview";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="rounded-xl bg-indigo-600 p-2 text-white">
            <GraduationCap size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              ThesisHub
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Project workspace
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${isActive || active ? "border-l-4 border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"}`
                }
              >
                <span className="flex items-center gap-2">
                  <Icon size={16} />
                  {item.name}
                </span>
                {item.name === "Reviews" ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    3
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
              {user?.name
                ?.split(" ")
                .map((value) => value[0])
                .join(".")
                .slice(0, 2) ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {profileName}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.role ? roleLabel : roleLabel}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:ml-60">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu size={18} />
              </button>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {roleLabel} portal
                </p>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => setShowNotifications(true)}
                className="rounded-full border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200"
                aria-label="Open notifications"
              >
                <Bell size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-t border-slate-200 px-4 py-3 lg:hidden dark:border-slate-800">
            {navigation.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.href);
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                >
                  <Icon size={14} />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="h-full w-72 bg-white p-4 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-600 p-2 text-white">
                  <GraduationCap size={16} />
                </div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  ThesisHub
                </p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = location.pathname.startsWith(item.href);
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "text-slate-600 dark:text-slate-300"}`}
                  >
                    <Icon size={15} />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {showNotifications ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="ml-auto flex h-full w-full max-w-sm flex-col bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm text-slate-500">Inbox</p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Notifications
                </h2>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {[
                {
                  title: "Chapter 4 feedback received",
                  body: "Your methodology chapter is ready for review.",
                  time: "10m ago",
                },
                {
                  title: "Defense slot confirmed",
                  body: "A panel has been assigned for your viva.",
                  time: "1h ago",
                },
                {
                  title: "Proposal approved",
                  body: "Your topic proposal is now endorsed by the coordinator.",
                  time: "2h ago",
                },
              ].map((entry) => (
                <div
                  key={entry.title}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {entry.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {entry.body}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{entry.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
              Mark all as read <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
