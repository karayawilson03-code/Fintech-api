import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import Savings from "./pages/savings";
import Loans from "./pages/loans";
import Shares from "./pages/shares";
import Statement from "./pages/statement";
import Profile from "./pages/profile";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/savings"   element={<Layout><Savings /></Layout>} />
          <Route path="/loans"     element={<Layout><Loans /></Layout>} />
          <Route path="/shares"    element={<Layout><Shares /></Layout>} />
          <Route path="/statement" element={<Layout><Statement /></Layout>} />
          <Route path="/profile"   element={<Layout><Profile /></Layout>} />
        </Route>

        {/* 404 — catch all unknown routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}