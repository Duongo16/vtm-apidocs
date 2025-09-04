"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Container,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Login as LoginIcon,
  Api,
  Security,
  Speed,
  CloudSync,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { colors, sizes } from "../../theme/colors";

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();
  const { login, user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/docs";

  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, authLoading, navigate, from]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");
    try {
      await login(data.email, data.password);
      showSuccess("Welcome back! Login successful.");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Login failed. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Api sx={{ fontSize: sizes.icons.feature }} />,
      title: "API Management",
      desc: "Centralized docs",
    },
    {
      icon: <Security sx={{ fontSize: sizes.icons.feature }} />,
      title: "Secure Access",
      desc: "Role-based auth",
    },
    {
      icon: <Speed sx={{ fontSize: sizes.icons.feature }} />,
      title: "Fast Performance",
      desc: "Lightning speed",
    },
    {
      icon: <CloudSync sx={{ fontSize: sizes.icons.feature }} />,
      title: "Cloud Sync",
      desc: "Real-time sync",
    },
  ];

  // === Responsive Mobile Form ===
  if (isMobile) {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            py: 2,
            animation: "fadeIn 0.8s ease-out",
            "@keyframes fadeIn": {
              from: { opacity: 0, transform: "translateY(20px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Paper elevation={8} sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <LoginIcon
                sx={{
                  fontSize: sizes.icons.main,
                  color: "primary.main",
                  mb: 1.5,
                  animation: "pulse 2s infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.1)" },
                  },
                }}
              />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to manage your API docs
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="email"
                control={control}
                defaultValue=""
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: "Invalid email address",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email Address"
                    type="email"
                    margin="normal"
                    size="small"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    sx={{ mb: 1.5 }}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                defaultValue=""
                rules={{
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Password"
                    type="password"
                    margin="normal"
                    size="small"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    sx={{ mb: 2 }}
                  />
                )}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                startIcon={
                  isLoading ? <CircularProgress size={16} /> : <LoginIcon />
                }
                sx={{ py: 1.2, mb: 2, borderRadius: 1.5 }}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>

              <Box textAlign="center">
                <Typography variant="body2">
                  {"Don't have an account? "}
                  <Link to="/register" style={{ textDecoration: "none" }}>
                    <Typography
                      component="span"
                      color="primary"
                      fontWeight="medium"
                    >
                      Sign Up
                    </Typography>
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

  // === Desktop Layout ===
  return (
    <Box sx={{ minHeight: "100vh", display: "flex" }}>
      {/* Left Side - Form */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          bgcolor: "background.paper",
          animation: "slideInLeft 0.8s ease-out",
          "@keyframes slideInLeft": {
            from: { opacity: 0, transform: "translateX(-30px)" },
            to: { opacity: 1, transform: "translateX(0)" },
          },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: sizes.form.maxWidth }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <LoginIcon
              sx={{
                fontSize: sizes.icons.main,
                color: "primary.main",
                mb: 1.5,
                animation: "pulse 2s infinite",
                "@keyframes pulse": {
                  "0%, 100%": { transform: "scale(1)" },
                  "50%": { transform: "scale(1.1)" },
                },
              }}
            />
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Welcome Back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to your account
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="email"
              control={control}
              defaultValue=""
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "Invalid email address",
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email Address"
                  margin="normal"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{ mb: 1.5 }}
                />
              )}
            />
            <Controller
              name="password"
              control={control}
              defaultValue=""
              rules={{
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Password"
                  type="password"
                  margin="normal"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  sx={{ mb: 2 }}
                />
              )}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={
                isLoading ? <CircularProgress size={18} /> : <LoginIcon />
              }
              sx={{
                py: 1.2,
                mb: 2.5,
                borderRadius: 1.5,
                textTransform: "none",
                fontSize: "1rem",
                boxShadow: 2,
                "&:hover": { boxShadow: 4, transform: "translateY(-1px)" },
                transition: "all 0.3s ease",
              }}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
            <Box textAlign="center">
              <Typography variant="body2">
                {"Don't have an account? "}
                <Link to="/register" style={{ textDecoration: "none" }}>
                  <Typography
                    component="span"
                    color="primary"
                    fontWeight="bold"
                    sx={{ "&:hover": { textDecoration: "underline" } }}
                  >
                    Sign Up
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Right Side - Visual with Features */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
          position: "relative",
          overflow: "hidden",
          background: colors.loginGradient,
          animation: "slideInRight 0.8s ease-out",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: colors.radialOverlay.login,
            zIndex: 1,
          },
          "@keyframes slideInRight": {
            from: { opacity: 0, transform: "translateX(30px)" },
            to: { opacity: 1, transform: "translateX(0)" },
          },
        }}
      >
        {/* Heading */}
        <Typography
          variant="h3"
          fontWeight="bold"
          gutterBottom
          sx={{
            color: "#fff",
            zIndex: 2,
            mb: 1.5,
            textAlign: "center",
          }}
        >
          Welcome Back!
        </Typography>
        <Typography
          variant="h6"
          sx={{
            opacity: 0.9,
            mb: 1,
            fontWeight: 300,
            color: "#fff",
            textAlign: "center",
          }}
        >
          Sign in to continue
        </Typography>
        <Typography
          variant="body2"
          sx={{
            opacity: 0.8,
            lineHeight: 1.6,
            color: "#fff",
            textAlign: "center",
            mb: 4,
          }}
        >
          Securely access your account and manage your settings.
        </Typography>

        {/* Feature Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 3,
            width: "100%",
            maxWidth: 500,
            zIndex: 2,
          }}
        >
          {features.map((feature, index) => (
            <Box
              key={index}
              sx={{
                animation: `fadeInUp 1.2s ease-out ${
                  0.15 * index
                }s both, float 6s ease-in-out infinite ${0.4 * index}s`,
                "@keyframes fadeInUp": {
                  from: { opacity: 0, transform: "translateY(20px)" },
                  to: { opacity: 1, transform: "translateY(0)" },
                },
                "@keyframes float": {
                  "0%, 100%": { transform: "translateY(0)" },
                  "50%": { transform: "translateY(-12px)" },
                },
              }}
            >
              <Paper
                elevation={6}
                sx={{
                  p: 2,
                  textAlign: "center",
                  color: "white",
                  bgcolor: colors.glass.background,
                  backdropFilter: colors.glass.backdrop,
                  border: `1px solid ${colors.glass.border}`,
                  borderRadius: 2,
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    bgcolor: colors.glass.backgroundHover,
                  },
                }}
              >
                <Box sx={{ color: "rgba(255,255,255,0.9)", mb: 1 }}>
                  {feature.icon}
                </Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {feature.desc}
                </Typography>
              </Paper>
            </Box>
          ))}
        </Box>

        {/* Floating Background Elements */}
        {[
          {
            top: "20%",
            left: "15%",
            size: 70,
            color: colors.floatingElements.primary,
            duration: 10,
          },
          {
            bottom: "30%",
            right: "20%",
            size: 50,
            color: colors.floatingElements.secondary,
            duration: 8,
            reverse: true,
          },
          {
            top: "55%",
            left: "25%",
            size: 40,
            color: colors.floatingElements.tertiary,
            duration: 12,
            delay: 3,
          },
        ].map((el, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              top: el.top,
              bottom: el.bottom,
              left: el.left,
              right: el.right,
              width: el.size,
              height: el.size,
              borderRadius: "50%",
              background: el.color,
              animation: `float ${el.duration}s ease-in-out ${
                el.reverse ? "infinite reverse" : "infinite"
              } ${el.delay || 0}s`,
              zIndex: 0,
              "@keyframes float": {
                "0%, 100%": { transform: "translateY(0)" },
                "50%": { transform: "translateY(-15px)" },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default Login;
