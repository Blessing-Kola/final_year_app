import { BookOpen, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../../context/useTheme";

export function PublicHeader() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 px-4 py-3 sm:flex-nowrap sm:px-6 sm:py-5">
        <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
          <div className="rounded-lg bg-indigo-600 p-2 text-white">
            <BookOpen size={16} />
          </div>
          ThesisHub
        </div>
        <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <nav
            className="hidden items-center gap-3 sm:flex"
            aria-label="Main navigation"
          >
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white"
            >
              Register
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 sm:hidden"
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <nav
            id="mobile-navigation"
            className="flex w-full flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:hidden"
            aria-label="Mobile navigation"
          >
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white"
            >
              Register
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
