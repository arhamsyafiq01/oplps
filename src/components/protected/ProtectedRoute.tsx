import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  allowedRoles?: string[]; // Array of allowed role CODES
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const location = useLocation();
  const isLoggedIn = !!sessionStorage.getItem("user_id");

  if (!isLoggedIn) {
    // Not logged in, redirect to login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check roles ONLY if allowedRoles are specified for this route
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleCode = sessionStorage.getItem("user_role_code");

    // Check if the user's role is NOT in the allowed list
    if (!userRoleCode || !allowedRoles.includes(userRoleCode)) {
      // Logged in, but wrong role - redirect away (e.g., to home or forbidden page)
      console.warn(
        `Role access denied to ${
          location.pathname
        }. Required: ${allowedRoles.join(",")}, User has: ${userRoleCode}`
      );
      return <Navigate to="/home" state={{ error: "Access Denied" }} replace />;
    }
  }

  // Logged in AND has the required role (or no specific role needed)
  return <Outlet />; // Render the intended child route component
};

export default ProtectedRoute;
