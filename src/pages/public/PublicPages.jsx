import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  BookOpen,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useTheme } from "../../context/useTheme";

const roleSummary = [
  {
    title: "Students",
    text: "Track chapters, proposals, submissions, and defense readiness in one place.",
    icon: BookOpen,
  },
  {
    title: "Supervisors",
    text: "Review drafts, manage meetings, and evaluate student progress with clarity.",
    icon: ShieldCheck,
  },
  {
    title: "Course coordinators",
    text: "Oversee courses, assign supervisors, review proposals, and manage the academic calendar.",
    icon: Users,
  },
];

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
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
            >
              {theme === "dark" ? "☀️ " : "🌙 "}
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

      <main className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16">
        <section className="grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Final year project management
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
              Manage your final year project — from proposal to defense
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
              {[
                "Proposal tracking and approval workflow",
                "Chapter review pipeline",
                "Calendar for meetings and defenses",
                "Role-based evaluation dashboards",
              ].map((item) => (
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

      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        © {new Date().getFullYear()} University of Technology • ThesisHub
      </footer>
    </div>
  );
}

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-indigo-600">Welcome back</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Sign in to ThesisHub
          </h1>
          <p className="mt-2 text-sm text-slate-600">
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
              className="mb-1 block text-sm font-medium text-slate-700"
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
              className="mb-1 block text-sm font-medium text-slate-700"
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
                placeholder="••••••••"
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
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "student",
    department: "Computer Science",
    studentId: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.endsWith("@university.edu")) {
      setError(
        "Please use your institutional email ending in @university.edu.",
      );
      setSuccess("");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setSuccess("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
        department: form.department,
        studentId: form.role === "student" ? form.studentId : undefined,
      });
      setSuccess("Account created. Please sign in to continue.");
      window.setTimeout(() => navigate("/login"), 550);
    } catch (err) {
      setError(err.message || "Unable to create your account right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <p className="text-sm font-medium text-indigo-600">Create account</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Register for ThesisHub
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Set up your role-based portal and begin managing your thesis flow.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
            {success}
          </div>
        ) : null}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="firstName"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Institutional email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              placeholder="name@university.edu"
            />
          </div>
          <div>
            <label
              htmlFor="role"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            >
              <option value="student">Student</option>
              <option value="supervisor">Supervisor</option>
              <option value="coordinator">Course coordinator</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="department"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Department
            </label>
            <input
              id="department"
              name="department"
              value={form.department}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>
          {form.role === "student" ? (
            <div className="md:col-span-2">
              <label
                htmlFor="studentId"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Student ID
              </label>
              <input
                id="studentId"
                name="studentId"
                value={form.studentId}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </div>
          ) : null}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-medium text-indigo-600">Reset password</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Recover your account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
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
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
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
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-indigo-600">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          The page you are looking for is unavailable or has moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-amber-600">403</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          You do not have access
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Your current role cannot open this section.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export function ServerErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-red-600">500</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          The service is unavailable right now. Please try again shortly.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-700">
            Try again
          </button>
          <Link
            to="/"
            className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
