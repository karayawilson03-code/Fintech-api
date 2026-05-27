import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/savings"   element={<Layout><Savings /></Layout>} />
          <Route path="/loans"     element={<Layout><Loans /></Layout>} />
          <Route path="/shares"    element={<Layout><Shares /></Layout>} />
          <Route path="/statement" element={<Layout><Statement /></Layout>} />
          <Route path="/profile"   element={<Layout><Profile /></Layout>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}