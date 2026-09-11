import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../../context/useTheme";

export function PublicHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <div className="rounded-lg bg-indigo-600 p-2 text-white">
            <BookOpen size={16} />
          </div>
          ThesisHub
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            aria-label="Toggle theme"
          >
            {theme === "light" ? "Light" : "Dark"}
          </button>
          <Link
            to="/login"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}
