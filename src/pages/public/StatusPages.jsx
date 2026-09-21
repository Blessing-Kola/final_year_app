import { Link } from "react-router-dom";

function StatusPageLayout({ code, tone, title, description, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className={`text-sm font-medium ${tone}`}>{code}</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {description}
        </p>
        {children}
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <StatusPageLayout
      code="404"
      tone="text-indigo-600"
      title="Page not found"
      description="The page you are looking for is unavailable or has moved."
    >
      <Link
        to="/"
        className="mt-6 inline-flex rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white"
      >
        Go home
      </Link>
    </StatusPageLayout>
  );
}

export function ForbiddenPage() {
  return (
    <StatusPageLayout
      code="403"
      tone="text-amber-600"
      title="You do not have access"
      description="Your current role cannot open this section."
    >
      <Link
        to="/"
        className="mt-6 inline-flex rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white"
      >
        Go home
      </Link>
    </StatusPageLayout>
  );
}

export function ServerErrorPage() {
  const handleLogout = () => {
    window.localStorage.removeItem("thesishub-token");
    window.localStorage.removeItem("thesishub-user");
    window.location.assign("/login");
  };

  return (
    <StatusPageLayout
      code="500"
      tone="text-red-600"
      title="Something went wrong"
      description="The service is unavailable right now. Please try again shortly."
    >
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          Log out
        </button>
        <Link
          to="/"
          className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          Go home
        </Link>
      </div>
    </StatusPageLayout>
  );
}
