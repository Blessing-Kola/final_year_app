import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const portalHome = (role) => {
  switch (role) {
    case "student":
      return "/app/student/dashboard";
    case "supervisor":
      return "/app/supervisor/dashboard";
    case "coordinator":
      return "/app/coordinator/dashboard";
    case "examiner":
      return "/app/examiner/dashboard";
    default:
      return "/login";
  }
};

export default function ProtectedRoute({ role }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={portalHome(user.role)} replace />;
  }

  return <Outlet />;
}
