import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { AuthPageLayout } from "./components/AuthPageLayout";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setLoading(false);
      setError("Please enter your institutional email and password.");
      return;
    }

    try {
      const response = await login({ email, password });
      const role = response.user.role;
      setLoading(false);
      navigate(location.state?.from?.pathname || `/app/${role}/dashboard`, {
        replace: true,
      });
    } catch (err) {
      setLoading(false);
      setError(err.message || "Unable to sign in. Please try again.");
    }
  };

  return (
    <AuthPageLayout>
      <div className="mb-6">
        <p className="text-sm font-medium text-indigo-600">Welcome back</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Sign in to ThesisHub
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Use your institutional credentials to continue.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="student@university.edu"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-20 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-indigo-600 dark:text-indigo-400"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-medium text-indigo-600">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        New here?{" "}
        <Link
          to="/register"
          className="font-medium text-indigo-600 dark:text-indigo-400"
        >
          Create account
        </Link>
      </p>
    </AuthPageLayout>
  );
}
