export function AuthPageLayout({ children, className = "max-w-md" }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div
        className={`mx-auto w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
