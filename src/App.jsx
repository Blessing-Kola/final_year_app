import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  NotFoundPage,
  ForbiddenPage,
  ServerErrorPage,
} from "./pages/public";
import { useAuth } from "./context/useAuth";

// A bare `module.X` silently resolves to `undefined` when the export is renamed
// or removed, and React then throws the opaque "Element type is invalid" error.
// Failing here instead names the export that is missing.
const lazyNamed = (loader, exportName) =>
  lazy(() =>
    loader().then((module) => {
      if (typeof module[exportName] !== "function") {
        throw new Error(
          `Lazy route "${exportName}" is not exported by the portal module.`,
        );
      }
      return { default: module[exportName] };
    }),
  );

const StudentDashboardPage = lazyNamed(
  () => import("./pages/portal/StudentPortal"),
  "StudentDashboard",
);
const StudentProjectPage = lazyNamed(
  () => import("./pages/portal/StudentPortal"),
  "StudentProjectPage",
);
const StudentDocumentsPage = lazyNamed(
  () => import("./pages/portal/StudentPortal"),
  "StudentDocumentsPage",
);
const StudentCommunicationPage = lazyNamed(
  () => import("./pages/portal/StudentPortal"),
  "StudentCommunicationPage",
);
const StudentDefensePage = lazyNamed(
  () => import("./pages/portal/StudentPortal"),
  "StudentDefensePage",
);
const StudentAccountPage = lazyNamed(
  () => import("./pages/portal/StudentPortal"),
  "StudentAccountPage",
);

const SupervisorDashboardPage = lazyNamed(
  () => import("./pages/portal/SupervisorPortal"),
  "SupervisorDashboard",
);
const SupervisorStudentsPage = lazyNamed(
  () => import("./pages/portal/SupervisorPortal"),
  "SupervisorStudentsPage",
);
const SupervisorStudentDetailPage = lazyNamed(
  () => import("./pages/portal/SupervisorPortal"),
  "SupervisorStudentDetailPage",
);
const SupervisorReviewsPage = lazy(() =>
  import("./pages/portal/SupervisorPortal").then((module) => ({
    default: module.SupervisorReviewsPage,
  })),
);
const SupervisorSchedulingPage = lazyNamed(
  () => import("./pages/portal/SupervisorPortal"),
  "SupervisorSchedulingPage",
);
const SupervisorEvaluationPage = lazyNamed(
  () => import("./pages/portal/SupervisorPortal"),
  "SupervisorEvaluationPage",
);
const SupervisorCommunicationPage = lazy(() =>
  import("./pages/portal/SupervisorPortal").then((module) => ({
    default: module.SupervisorCommunicationPage,
  })),
);

const CoordinatorDashboardPage = lazyNamed(
  () => import("./pages/portal/CoordinatorPortal"),
  "CoordinatorDashboard",
);
const CoordinatorUsersPage = lazyNamed(
  () => import("./pages/portal/CoordinatorPortal"),
  "CoordinatorUsersPage",
);
const CoordinatorAssignmentsPage = lazyNamed(
  () => import("./pages/portal/CoordinatorPortal"),
  "CoordinatorAssignmentsPage",
);
const CoordinatorProposalsPage = lazyNamed(
  () => import("./pages/portal/CoordinatorPortal"),
  "CoordinatorProposalsPage",
);
const CoordinatorCalendarPage = lazyNamed(
  () => import("./pages/portal/CoordinatorPortal"),
  "CoordinatorCalendarPage",
);
const CoordinatorExaminationsPage = lazyNamed(
  () => import("./pages/portal/CoordinatorPortal"),
  "CoordinatorExaminationsPage",
);
const CoordinatorReportsPage = lazyNamed(
  () => import("./pages/portal/CoordinatorPortal"),
  "CoordinatorReportsPage",
);

function LoadingState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 space-y-3">
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function PublicRouteGate() {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={`/app/${user.role}/dashboard`} replace />;
  }
  return null;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <>
            <PublicRouteGate />
            <LoginPage />
          </>
        }
      />
      <Route
        path="/register"
        element={
          <>
            <PublicRouteGate />
            <RegisterPage />
          </>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute role="student" />}>
        <Route element={<AppShell role="student" />}>
          <Route
            path="/app/student/dashboard"
            element={
              <Suspense fallback={<LoadingState />}>
                <StudentDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/app/student/project"
            element={
              <Suspense fallback={<LoadingState />}>
                <StudentProjectPage />
              </Suspense>
            }
          />
          <Route
            path="/app/student/documents"
            element={
              <Suspense fallback={<LoadingState />}>
                <StudentDocumentsPage />
              </Suspense>
            }
          />
          <Route
            path="/app/student/documents/upload"
            element={
              <Suspense fallback={<LoadingState />}>
                <StudentDocumentsPage />
              </Suspense>
            }
          />
          <Route
            path="/app/student/communication"
            element={
              <Suspense fallback={<LoadingState />}>
                <StudentCommunicationPage />
              </Suspense>
            }
          />
          <Route
            path="/app/student/defense"
            element={
              <Suspense fallback={<LoadingState />}>
                <StudentDefensePage />
              </Suspense>
            }
          />
          <Route
            path="/app/student/account"
            element={
              <Suspense fallback={<LoadingState />}>
                <StudentAccountPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="supervisor" />}>
        <Route element={<AppShell role="supervisor" />}>
          <Route
            path="/app/supervisor/dashboard"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupervisorDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/app/supervisor/students"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupervisorStudentsPage />
              </Suspense>
            }
          />
          <Route
            path="/app/supervisor/students/:studentId"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupervisorStudentDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/app/supervisor/reviews"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupervisorReviewsPage />
              </Suspense>
            }
          />
          {/* Feedback was removed for supervisors. The redirect catches a direct URL
              or a stale bookmark instead of falling through to the 404 page. */}
          <Route
            path="/app/supervisor/feedback"
            element={<Navigate to="/app/supervisor/dashboard" replace />}
          />
          <Route
            path="/app/supervisor/scheduling"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupervisorSchedulingPage />
              </Suspense>
            }
          />
          <Route
            path="/app/supervisor/evaluation"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupervisorEvaluationPage />
              </Suspense>
            }
          />
          <Route
            path="/app/supervisor/communication"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupervisorCommunicationPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="coordinator" />}>
        <Route element={<AppShell role="coordinator" />}>
          <Route
            path="/app/coordinator/dashboard"
            element={
              <Suspense fallback={<LoadingState />}>
                <CoordinatorDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/app/coordinator/users"
            element={
              <Suspense fallback={<LoadingState />}>
                <CoordinatorUsersPage />
              </Suspense>
            }
          />
          <Route
            path="/app/coordinator/assignments"
            element={
              <Suspense fallback={<LoadingState />}>
                <CoordinatorAssignmentsPage />
              </Suspense>
            }
          />
          <Route
            path="/app/coordinator/proposals"
            element={
              <Suspense fallback={<LoadingState />}>
                <CoordinatorProposalsPage />
              </Suspense>
            }
          />
          <Route
            path="/app/coordinator/calendar"
            element={
              <Suspense fallback={<LoadingState />}>
                <CoordinatorCalendarPage />
              </Suspense>
            }
          />
          <Route
            path="/app/coordinator/examinations"
            element={
              <Suspense fallback={<LoadingState />}>
                <CoordinatorExaminationsPage />
              </Suspense>
            }
          />
          <Route
            path="/app/coordinator/reports"
            element={
              <Suspense fallback={<LoadingState />}>
                <CoordinatorReportsPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="/server-error" element={<ServerErrorPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
