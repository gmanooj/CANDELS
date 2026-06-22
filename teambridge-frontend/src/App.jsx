import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import Profile from "./pages/Profile/Profile";
import WorkEnv from "./pages/WorkEnv/WorkEnv"; // Imported the workspace target environment
import { useEffect } from "react";
import WorkspaceDashboard from './workspace/WorkspaceDashboard';
import ActiveWorkspace from './workspace/ActiveWorkspace';
import Settings from "./pages/Settings/Settings";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* --- SECURE PRIVATE ROUTES --- */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          
          {/* Real-time declaration automatic milestone router redirect target */}
          <Route path="/work-env" element={<WorkEnv />} />

          <Route path="/workspace" element={<WorkspaceDashboard />} />
          <Route path="/workspace/editor/:teamCode" element={<ActiveWorkspace />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;