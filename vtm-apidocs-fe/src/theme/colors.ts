import { createTheme } from "@mui/material/styles";

export const colors = {
  // Brand colors
  primary: "#d32f2f", // Đỏ chủ đạo đã giảm rực
  primaryDark: "#a31515", // Đỏ đậm hơn, trầm hơn
  primaryLight: "#e57373", // Đỏ nhạt hơn, dịu hơn
  white: "#FFFFFF",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },

  // Primary gradients với màu đỏ mới
  loginGradient:
    "linear-gradient(135deg, #d32f2f 0%, #a31515 50%, #7a1010 100%)",
  registerGradient:
    "linear-gradient(135deg, #e57373 0%, #d32f2f 50%, #a31515 100%)",

  // Glass morphism với tint đỏ
  glass: {
    background: "rgba(211, 47, 47, 0.1)",
    backgroundHover: "rgba(211, 47, 47, 0.15)",
    border: "rgba(211, 47, 47, 0.2)",
    backdrop: "blur(10px)",
  },

  // Text gradients
  textGradient: "linear-gradient(45deg, #FFFFFF 30%, #F3F4F6 90%)",
  redTextGradient: "linear-gradient(45deg, #d32f2f 30%, #a31515 90%)",

  // Background overlays
  radialOverlay: {
    login:
      "radial-gradient(circle at 30% 70%, rgba(211, 47, 47, 0.1) 0%, transparent 50%)",
    register:
      "radial-gradient(circle at 70% 30%, rgba(211, 47, 47, 0.1) 0%, transparent 50%)",
  },

  // Floating elements
  floatingElements: {
    primary: "rgba(211, 47, 47, 0.1)",
    secondary: "rgba(211, 47, 47, 0.08)",
    tertiary: "rgba(211, 47, 47, 0.06)",
  },

  // Status colors giữ nguyên
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",

  methods: {
  GET: "#4CAF50",     
  POST: "#2196F3",    
  PUT: "#FF9800",     
  DELETE: "#F44336",  
  PATCH: "#FFC107",   
}

};
export const sizes = {
  // Form dimensions
  form: {
    maxWidth: 360,
    mobileMaxWidth: 400,
  },

  // Visual section
  visual: {
    maxWidth: 450,
    gridMaxWidth: 400,
  },

  // Icons
  icons: {
    main: 48,
    feature: 32,
    success: 80,
  },

  // Spacing
  spacing: {
    section: 3,
    form: 2,
    element: 1.5,
  },
};

export const getTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      background: {
        default: mode === "light" ? "#f9fafb" : "#121212",
        paper: mode === "light" ? "#ffffff" : "#1e1e1e",
      },
      text: {
        primary: mode === "light" ? "#111827" : "#f3f4f6",
        secondary: mode === "light" ? "#6b7280" : "#9ca3af",
      },
      methods: {
        GET: mode === "light" ? "#22c55e" : "#4ade80",
        POST: mode === "light" ? "#3b82f6" : "#60a5fa",
        PUT: mode === "light" ? "#f59e0b" : "#fbbf24",
        DELETE: mode === "light" ? "#ef4444" : "#f87171",
        PATCH: mode === "light" ? "#8b5cf6" : "#a78bfa",
      },
    } as any,
  });

