import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  // Check if the user is authenticated by verifying the presence of the auth_token
  const token = sessionStorage.getItem("auth_token");

  if (!token) {
    // If there is no token, redirect to the login page immediately
    return <Navigate to="/" replace />;
  }

  // If authenticated, render the child routes natively
  return <Outlet />;
}
