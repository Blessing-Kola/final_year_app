import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { AuthPageLayout } from "./components/AuthPageLayout";

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
    if (!form.email.endsWith(".edu.ng")) {
      setError("Please use your institutional email ending in .edu.ng");
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
    <AuthPageLayout className="max-w-2xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-indigo-600">Create account</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Register for ThesisHub
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
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
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          First name
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Last name
          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
          Institutional email
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="name@university.edu.ng"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Role
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="student">Student</option>
            <option value="supervisor">Supervisor</option>
            <option value="coordinator">Course coordinator</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Department
          <input
            name="department"
            value={form.department}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        {form.role === "student" ? (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Student ID
            <input
              name="studentId"
              value={form.studentId}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
        ) : null}
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Confirm password
          <input
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
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
    </AuthPageLayout>
  );
}
