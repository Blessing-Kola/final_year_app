export function SessionTimeoutPrompt({ onStaySignedIn, onSignOut }) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-description"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h2
          id="session-timeout-title"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Are you still there?
        </h2>
        <p
          id="session-timeout-description"
          className="mt-2 text-sm text-slate-600 dark:text-slate-300"
        >
          You have been inactive for a while. For your security you will be
          signed out in a moment, and anything you have not saved will be lost.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign out now
          </button>
          <button
            type="button"
            autoFocus
            onClick={onStaySignedIn}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
