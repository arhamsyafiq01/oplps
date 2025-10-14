// App.tsx (CORRECTED)

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext"; // <-- IMPORT THEME PROVIDER
import { NotificationRefreshProvider } from "./context/NotificationRefreshContext";

// --- Your Page and Component Imports ---
import SignIn from "./pages/AuthPages/SignIn";
import UserProfiles from "./pages/UserProfile/UserProfiles";
import ProtectedRoute from "./components/protected/ProtectedRoute";
import AddUser from "./pages/AddUser/AddUser";
import UserManage from "./pages/User Management/User Management";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Home/Home";
import Dashboard from "./pages/Dashboard/Dashboard";
import Notification from "./pages/Notification/Notification";
import ListPartItem from "./pages/ListPartitem/ListPartItem";
import HistoryPartItem from "./pages/History/HistoryPartItem";

export default function App() {
  const ADMIN_ROLE_CODE = "ADMIN";

  return (
    // It's perfectly fine to nest providers. Start with the ThemeProvider at the top.
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <NotificationRefreshProvider>
          <Routes>
            <Route index path="/" element={<SignIn />} />

            <Route element={<AppLayout />}>
              <Route element={<ProtectedRoute />}>
                <Route path="/home" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/notification" element={<Notification />} />
                <Route path="/list-part-item" element={<ListPartItem />} />
                <Route path="/profile" element={<UserProfiles />} />
                <Route
                  path="/history-part-item"
                  element={<HistoryPartItem />}
                />
              </Route>
              <Route
                element={<ProtectedRoute allowedRoles={[ADMIN_ROLE_CODE]} />}
              >
                <Route path="/add-user" element={<AddUser />} />
                <Route path="/user-management" element={<UserManage />} />
              </Route>
            </Route>
          </Routes>
        </NotificationRefreshProvider>
      </Router>
    </ThemeProvider>
  );
}
