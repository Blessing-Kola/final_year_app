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
} from "./pages/public/PublicPages";
import { useAuth } from "./context/useAuth";

const StudentDashboardPage = lazy(() =>
  import("./pages/portal/StudentPortal").then((module) => ({
    default: module.StudentDashboard,
  })),
);
const StudentProjectPage = lazy(() =>
  import("./pages/portal/StudentPortal").then((module) => ({
    default: module.StudentProjectPage,
  })),
);
const StudentDocumentsPage = lazy(() =>
  import("./pages/portal/StudentPortal").then((module) => ({
    default: module.StudentDocumentsPage,
  })),
);
const StudentCommunicationPage = lazy(() =>
  import("./pages/portal/StudentPortal").then((module) => ({
    default: module.StudentCommunicationPage,
  })),
);
const StudentDefensePage = lazy(() =>
  import("./pages/portal/StudentPortal").then((module) => ({
    default: module.StudentDefensePage,
  })),
);
const StudentAccountPage = lazy(() =>
  import("./pages/portal/StudentPortal").then((module) => ({
    default: module.StudentAccountPage,
  })),
);

const SupervisorDashboardPage = lazy(() =>
  import("./pages/portal/SupervisorPortal").then((module) => ({
    default: module.SupervisorDashboard,
  })),
);
const SupervisorStudentsPage = lazy(() =>
  import("./pages/portal/SupervisorPortal").then((module) => ({
    default: module.SupervisorStudentsPage,
  })),
);
const SupervisorReviewsPage = lazy(() =>
  import("./pages/portal/SupervisorPortal").then((module) => ({
    default: module.SupervisorReviewsPage,
  })),
);
const SupervisorFeedbackPage = lazy(() =>
  import("./pages/portal/SupervisorPortal").then((module) => ({
    default: module.SupervisorFeedbackPage,
  })),
);
const SupervisorSchedulingPage = lazy(() =>
  import("./pages/portal/SupervisorPortal").then((module) => ({
    default: module.SupervisorSchedulingPage,
  })),
);
const SupervisorEvaluationPage = lazy(() =>
  import("./pages/portal/SupervisorPortal").then((module) => ({
    default: module.SupervisorEvaluationPage,
  })),
);

const CoordinatorDashboardPage = lazy(() =>
  import("./pages/portal/CoordinatorPortal").then((module) => ({
    default: module.CoordinatorDashboard,
  })),
);
const CoordinatorUsersPage = lazy(() =>
  import("./pages/portal/CoordinatorPortal").then((module) => ({
    default: module.CoordinatorUsersPage,
  })),
);
const CoordinatorAssignmentsPage = lazy(() =>
  import("./pages/portal/CoordinatorPortal").then((module) => ({
    default: module.CoordinatorAssignmentsPage,
  })),
);
const CoordinatorProposalsPage = lazy(() =>
  import("./pages/portal/CoordinatorPortal").then((module) => ({
    default: module.CoordinatorProposalsPage,
  })),
);
const CoordinatorCalendarPage = lazy(() =>
  import("./pages/portal/CoordinatorPortal").then((module) => ({
    default: module.CoordinatorCalendarPage,
  })),
);
const CoordinatorExaminationsPage = lazy(() =>
  import("./pages/portal/CoordinatorPortal").then((module) => ({
    default: module.CoordinatorExaminationsPage,
  })),
);
const CoordinatorReportsPage = lazy(() =>
  import("./pages/portal/CoordinatorPortal").then((module) => ({
    default: module.CoordinatorReportsPage,
  })),
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
            path="/app/supervisor/reviews"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupervisorReviewsPage />
              </Suspense>
            }
          />
          <Route
            path="/app/supervisor/feedback"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupervisorFeedbackPage />
              </Suspense>
            }
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
