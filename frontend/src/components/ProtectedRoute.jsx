import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./ui";

// Guards routes by authentication and (optionally) role.
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
