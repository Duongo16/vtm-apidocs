import { CircularProgress, Box } from "@mui/material";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import Docs from "./pages/Docs";
import DocsDashboard from "./pages/DocsDashboard";
import AdminAccounts from "./pages/AdminAccounts";

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/docs/:categoryId?" element={<Docs />} />
      <Route path="/dashboard" element={<DocsDashboard />} />
      <Route path="/admin/accounts" element={<AdminAccounts />} />
      <Route path="/" element={<Navigate to="/docs" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div
      style={{ height: "100vh", display: "grid", gridTemplateRows: "auto 1fr" }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  );
}
