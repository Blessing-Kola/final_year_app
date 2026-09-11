import { useState } from "react";
import { AuthPageLayout } from "./components/AuthPageLayout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <AuthPageLayout>
      <p className="text-sm font-medium text-indigo-600">Reset password</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Recover your account
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Enter your university email to receive a reset link.
      </p>
      {submitted ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          If that email exists, a reset link has been sent.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="name@university.edu"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 font-medium text-white"
          >
            Send reset link
          </button>
        </form>
      )}
    </AuthPageLayout>
  );
}
