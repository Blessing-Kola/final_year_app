import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicFooter } from "./components/PublicFooter";
import { PublicHeader } from "./components/PublicHeader";
import { landingFeatures, roleSummary } from "./data/publicContent";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <PublicHeader />

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:gap-12 sm:px-6 sm:py-12 lg:py-16">
        <section className="grid min-w-0 items-center gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:gap-8 sm:rounded-3xl sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-3 inline-flex max-w-full rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 sm:text-sm">
              Final year project management
            </p>
            <h1 className="wrap-break-word text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl lg:text-5xl">
              Manage your final year project - from proposal to defense
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg sm:leading-8">
              Coordinate proposals, chapter submissions, feedback, scheduling,
              and evaluations across students, supervisors, course coordinators,
              in one streamlined workspace.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white"
              >
                Login <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Create account
              </Link>
            </div>
          </div>
          <div className="min-w-0 rounded-xl bg-slate-900 p-4 text-white sm:rounded-2xl sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {landingFeatures.map((item) => (
                <div
                  key={item}
                  className="flex min-w-0 items-start gap-3 rounded-xl bg-white/10 p-3"
                >
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <span className="min-w-0 wrap-break-word text-sm sm:text-base">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
              Built for every stakeholder
            </h2>
            <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Role-specific portals for every stage of the project cycle.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
            {roleSummary.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon size={18} />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 wrap-break-word text-sm leading-6 text-slate-600 dark:text-slate-300 sm:leading-7">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
