import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicFooter } from "./components/PublicFooter";
import { PublicHeader } from "./components/PublicHeader";
import { landingFeatures, roleSummary } from "./data/publicContent";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <PublicHeader />

      <main className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16">
        <section className="grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Final year project management
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
              Manage your final year project - from proposal to defense
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Coordinate proposals, chapter submissions, feedback, scheduling,
              and evaluations across students, supervisors, course coordinators,
              in one streamlined workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white"
              >
                Login <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="rounded-xl border border-slate-200 px-5 py-3 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Create account
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <div className="space-y-4">
              {landingFeatures.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl bg-white/10 p-3"
                >
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Built for every stakeholder
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Role-specific portals for every stage of the project cycle.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {roleSummary.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon size={18} />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
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
