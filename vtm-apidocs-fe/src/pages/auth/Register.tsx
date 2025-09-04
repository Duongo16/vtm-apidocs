"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  MenuItem,
  Paper,
  Container,
  useTheme,
  useMediaQuery,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import {
  PersonAdd,
  CheckCircle,
  Rocket,
  Group,
  Shield,
  Analytics,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { colors, sizes } from "../../theme/colors";

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

const Register: React.FC = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>();
  const { register: registerUser, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const password = watch("password");

  React.useEffect(() => {
    if (user) {
      navigate("/docs", { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError("");

    try {
      await registerUser(data.name, data.email, data.password, data.role);
      setSuccess(true);
      showSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = ["Account", "Role", "Start"];
  const benefits = [
    {
      icon: <Rocket sx={{ fontSize: sizes.icons.feature }} />,
      title: "Quick Setup",
      desc: "Start in minutes",
    },
    {
      icon: <Group sx={{ fontSize: sizes.icons.feature }} />,
      title: "Team Work",
      desc: "Collaborate easily",
    },
    {
      icon: <Shield sx={{ fontSize: sizes.icons.feature }} />,
      title: "Secure",
      desc: "Bank-level security",
    },
    {
      icon: <Analytics sx={{ fontSize: sizes.icons.feature }} />,
      title: "Analytics",
      desc: "Detailed insights",
    },
  ];

  if (success) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={8}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
              animation: "fadeInScale 0.8s ease-out",
              "@keyframes fadeInScale": {
                from: { opacity: 0, transform: "scale(0.9)" },
                to: { opacity: 1, transform: "scale(1)" },
              },
            }}
          >
            <CheckCircle
              sx={{
                fontSize: sizes.icons.success,
                color: "success.main",
                mb: 2,
                animation: "bounce 1s ease-out",
                "@keyframes bounce": {
                  "0%, 20%, 50%, 80%, 100%": { transform: "translateY(0)" },
                  "40%": { transform: "translateY(-8px)" },
                  "60%": { transform: "translateY(-4px)" },
                },
              }}
            />
            <Typography
              variant="h4"
              fontWeight="bold"
              gutterBottom
              color="success.main"
            >
              Welcome Aboard!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Account created successfully
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirecting to login...
            </Typography>
            <CircularProgress sx={{ mt: 2 }} size={24} />
          </Paper>
        </Container>
      </Box>
    );
  }

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
              <PersonAdd
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
                Join Us Today
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your account
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="name"
                control={control}
                defaultValue=""
                rules={{
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Full Name"
                    margin="normal"
                    size="small"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    sx={{ mb: 1.5 }}
                  />
                )}
              />

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
                name="role"
                control={control}
                defaultValue=""
                rules={{ required: "Role is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Role"
                    margin="normal"
                    size="small"
                    error={!!errors.role}
                    helperText={errors.role?.message}
                    sx={{ mb: 1.5 }}
                  >
                    <MenuItem value="ADMIN">Admin</MenuItem>
                    <MenuItem value="MERCHANT">Merchant</MenuItem>
                    <MenuItem value="DEV">Developer</MenuItem>
                  </TextField>
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
                    sx={{ mb: 1.5 }}
                  />
                )}
              />

              <Controller
                name="confirmPassword"
                control={control}
                defaultValue=""
                rules={{
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    margin="normal"
                    size="small"
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
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
                  isLoading ? <CircularProgress size={16} /> : <PersonAdd />
                }
                sx={{ py: 1.2, mb: 2, borderRadius: 1.5 }}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>

              <Box textAlign="center">
                <Typography variant="body2">
                  Already have an account?{" "}
                  <Link to="/login" style={{ textDecoration: "none" }}>
                    <Typography
                      component="span"
                      color="primary"
                      fontWeight="medium"
                    >
                      Sign In
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
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <PersonAdd
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
              Join Us Today
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create your account
            </Typography>
          </Box>

          <Stepper activeStep={0} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>
                  <Typography variant="caption">{label}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
              <Controller
                name="name"
                control={control}
                defaultValue=""
                rules={{
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Full Name"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />

              <Controller
                name="role"
                control={control}
                defaultValue=""
                rules={{ required: "Role is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Role"
                    error={!!errors.role}
                    helperText={errors.role?.message}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="developer">Developer</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                  </TextField>
                )}
              />
            </Box>

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
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{ mb: 1.5 }}
                />
              )}
            />

            <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
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
                    error={!!errors.password}
                    helperText={errors.password?.message}
                  />
                )}
              />

              <Controller
                name="confirmPassword"
                control={control}
                defaultValue=""
                rules={{
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                  />
                )}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={
                isLoading ? <CircularProgress size={18} /> : <PersonAdd />
              }
              sx={{
                py: 1.2,
                mb: 2.5,
                borderRadius: 1.5,
                textTransform: "none",
                fontSize: "1rem",
                boxShadow: 2,
                "&:hover": {
                  boxShadow: 4,
                  transform: "translateY(-1px)",
                },
                transition: "all 0.3s ease",
              }}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>

            <Box textAlign="center">
              <Typography variant="body2">
                Already have an account?{" "}
                <Link to="/login" style={{ textDecoration: "none" }}>
                  <Typography
                    component="span"
                    color="primary"
                    fontWeight="bold"
                    sx={{
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Sign In
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Right Side - Visual */}
      <Box
        sx={{
          flex: 1,
          background: colors.registerGradient,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          position: "relative",
          overflow: "hidden",
          animation: "slideInRight 0.8s ease-out",
          "@keyframes slideInRight": {
            from: { opacity: 0, transform: "translateX(30px)" },
            to: { opacity: 1, transform: "translateX(0)" },
          },
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: colors.radialOverlay.register,
          },
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            color: "white",
            zIndex: 1,
            mb: 4,
            maxWidth: sizes.visual.maxWidth,
            animation: "fadeInUp 1s ease-out",
            "@keyframes fadeInUp": {
              from: { opacity: 0, transform: "translateY(20px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Typography
            variant="h3"
            fontWeight="bold"
            gutterBottom
            sx={{
              background: colors.textGradient,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            Start Your Journey
          </Typography>
          <Typography
            variant="h6"
            sx={{ opacity: 0.9, mb: 2, fontWeight: 300 }}
          >
            Join thousands of developers
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.5 }}>
            Experience the future of API documentation management.
          </Typography>
        </Box>

        {/* Compact Benefits Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            maxWidth: sizes.visual.gridMaxWidth,
            zIndex: 1,
          }}
        >
          {benefits.map((benefit, index) => (
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
                  "0%, 100%": { transform: "translateY(0px)" },
                  "50%": { transform: "translateY(-15px)" },
                },
              }}
            >
              <Paper
                elevation={6}
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: colors.glass.background,
                  backdropFilter: colors.glass.backdrop,
                  border: `1px solid ${colors.glass.border}`,
                  color: "white",
                  borderRadius: 2,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    bgcolor: colors.glass.backgroundHover,
                  },
                }}
              >
                <Box sx={{ color: "rgba(255,255,255,0.9)", mb: 1 }}>
                  {benefit.icon}
                </Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  {benefit.title}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {benefit.desc}
                </Typography>
              </Paper>
            </Box>
          ))}
        </Box>

        {/* Compact Background Elements */}
        <Box
          sx={{
            position: "absolute",
            top: "20%",
            left: "15%",
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: colors.floatingElements.primary,
            animation: "float 10s ease-in-out infinite",
            "@keyframes float": {
              "0%, 100%": { transform: "translateY(0px)" },
              "50%": { transform: "translateY(-15px)" },
            },
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "30%",
            right: "20%",
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: colors.floatingElements.secondary,
            animation: "float 8s ease-in-out infinite reverse",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "55%",
            left: "25%",
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: colors.floatingElements.tertiary,
            animation: "float 12s ease-in-out infinite 3s",
          }}
        />
      </Box>
    </Box>
  );
};

export default Register;
