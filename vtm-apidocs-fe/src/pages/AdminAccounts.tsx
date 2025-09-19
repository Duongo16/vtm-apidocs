import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Navbar from "../components/Navbar";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  type AdminUser,
  type AdminUserStatus,
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "../services/adminUsersService";

const DEFAULT_ROLE_OPTIONS = [
  "ADMIN",
  "MERCHANT",
  "DEV",
  "DEVELOPER",
  "VIEWER",
];
const DEFAULT_STATUS_OPTIONS: AdminUserStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
  "SUSPENDED",
];

type FormState = {
  name: string;
  email: string;
  role: string;
  password: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "DEV",
  password: "",
  status: "",
};

type InputEvent =
  | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  | SelectChangeEvent<string>;

function toLabel(value: string) {
  if (!value) return "";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("vi-VN", { hour12: false });
}

function statusColor(
  status?: string
): "default" | "success" | "warning" | "error" | "info" {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return "success";
    case "INACTIVE":
      return "default";
    case "PENDING":
      return "warning";
    case "SUSPENDED":
      return "error";
    default:
      return "info";
  }
}

export default function AdminAccounts() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminUser | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const isAdmin = (user?.role || "").toLowerCase().includes("admin");

  const roleOptions = useMemo(() => {
    const seen = new Map<string, string>();
    DEFAULT_ROLE_OPTIONS.forEach((role) => {
      if (role) {
        seen.set(role.toLowerCase(), role);
      }
    });
    accounts.forEach((account) => {
      const value = account.role?.trim();
      if (value) {
        seen.set(value.toLowerCase(), value);
      }
    });
    return Array.from(seen.values());
  }, [accounts]);

  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    DEFAULT_STATUS_OPTIONS.forEach((status) =>
      seen.set(status.toLowerCase(), status)
    );
    accounts.forEach((account) => {
      const value = account.status?.trim();
      if (value) {
        seen.set(value.toLowerCase(), value);
      }
    });
    return Array.from(seen.values());
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter((account) => {
      const role = (account.role || "").toLowerCase();
      const status = (account.status || "").toLowerCase();
      const matchesQuery =
        !q ||
        [account.name, account.email, account.role, account.status]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(q));
      const matchesRole =
        roleFilter === "all" || role === roleFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" || status === statusFilter.toLowerCase();
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [accounts, searchQuery, roleFilter, statusFilter]);

  const resetForm = () => {
    setFormErrors({});
    setForm({
      ...EMPTY_FORM,
      role: roleOptions[0] || "DEV",
    });
  };

  const fetchAccounts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listAdminUsers();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load accounts.";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateDialog = () => {
    setEditingAccount(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (account: AdminUser) => {
    setEditingAccount(account);
    setFormErrors({});
    setForm({
      name: account.name ?? "",
      email: account.email ?? "",
      role: account.role ?? (roleOptions[0] || "DEV"),
      password: "",
      status: account.status ?? "",
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) {
      errors.name = "Name is required.";
    }
    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Email format is invalid.";
    }
    if (!form.role.trim()) {
      errors.role = "Select a role.";
    }
    if (!editingAccount && form.password.trim().length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }
    if (
      editingAccount &&
      form.password.trim().length > 0 &&
      form.password.trim().length < 6
    ) {
      errors.password = "Password must be at least 6 characters.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingAccount) {
        const payload: Parameters<typeof updateAdminUser>[1] = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role.trim(),
        };
        if (form.password.trim()) {
          payload.password = form.password.trim();
        }
        if (form.status.trim()) {
          payload.status = form.status.trim();
        }
        await updateAdminUser(editingAccount.id, payload);
        showSuccess("Account updated.");
      } else {
        await createAdminUser({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role.trim(),
          password: form.password.trim(),
        });
        showSuccess("New account created.");
      }
      setDialogOpen(false);
      await fetchAccounts();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to save account.";
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deleteTarget.id);
      showSuccess("Account deleted.");
      setDeleteTarget(null);
      await fetchAccounts();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to delete account.";
      showError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleFormChange = (field: keyof FormState) => (event: InputEvent) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (!isAdmin) {
    return (
      <Box className="h-[100svh] grid grid-rows-[auto_minmax(0,1fr)]">
        <Navbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <Box
          p={4}
          display="flex"
          justifyContent="center"
          alignItems="flex-start"
        >
          <Alert
            icon={<AdminPanelSettingsIcon />}
            severity="warning"
            sx={{ maxWidth: 540 }}
          >
            You do not have permission to view the account admin area.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="h-[100svh] grid grid-rows-[auto_minmax(0,1fr)]">
      <Navbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <Box
        component="main"
        sx={{ p: { xs: 2, md: 4 }, bgcolor: "background.default" }}
      >
        <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Account management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create, update, or deactivate internal user accounts.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Reload">
                <span>
                  <IconButton
                    onClick={() => void fetchAccounts()}
                    disabled={loading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
                color="primary"
              >
                Add account
              </Button>
            </Stack>
          </Stack>

          <Toolbar disableGutters sx={{ mt: 2, flexWrap: "wrap", gap: 2 }}>
            <TextField
              size="small"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, email, or role"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: "100%", md: 320 } }}
            />
            <TextField
              select
              size="small"
              label="Role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All</MenuItem>
              {roleOptions.map((role) => (
                <MenuItem key={role} value={role.toLowerCase()}>
                  {toLabel(role)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All</MenuItem>
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status.toLowerCase()}>
                  {toLabel(status)}
                </MenuItem>
              ))}
            </TextField>
          </Toolbar>
        </Paper>

        <Paper elevation={2} sx={{ overflow: "hidden" }}>
          {loadError ? (
            <Box p={3}>
              <Alert severity="error">{loadError}</Alert>
            </Box>
          ) : null}

          {loading ? (
            <Box
              p={4}
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Box py={6} textAlign="center" color="text.secondary">
                          No accounts match your filters.
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map((account) => (
                      <TableRow hover key={account.id}>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                          >
                            <Avatar>
                              {(account.name || account.email || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {account.name || "(no name)"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                ID: {account.id}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {account.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={toLabel(account.role || "") || "N/A"}
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {account.status ? (
                            <Chip
                              label={toLabel(account.status)}
                              color={statusColor(account.status)}
                              size="small"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label="Unknown"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(account.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(account.updatedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(account)}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteTarget(account)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!submitting) setDialogOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAccount ? "Edit account" : "Add new account"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Full name"
              value={form.name}
              onChange={handleFormChange("name")}
              error={Boolean(formErrors.name)}
              helperText={formErrors.name}
              fullWidth
            />
            <TextField
              label="Email"
              value={form.email}
              onChange={handleFormChange("email")}
              error={Boolean(formErrors.email)}
              helperText={formErrors.email}
              fullWidth
            />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={handleFormChange("role")}
              error={Boolean(formErrors.role)}
              helperText={formErrors.role}
              fullWidth
            >
              {roleOptions.map((role) => (
                <MenuItem key={role} value={role}>
                  {toLabel(role)}
                </MenuItem>
              ))}
              {roleOptions.length === 0 ? (
                <MenuItem value="DEV">Developer</MenuItem>
              ) : null}
            </TextField>
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={handleFormChange("password")}
              error={Boolean(formErrors.password)}
              helperText={
                formErrors.password ||
                (editingAccount ? "Leave blank to keep existing password." : "")
              }
              fullWidth
            />
            {statusOptions.length > 0 ? (
              <TextField
                select
                label="Status"
                value={form.status}
                onChange={handleFormChange("status")}
                helperText="Optional"
                fullWidth
              >
                <MenuItem value="">Keep current status</MenuItem>
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {toLabel(status)}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={() => void handleFormSubmit()}
          >
            {editingAccount ? "Save changes" : "Create account"}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete account</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Permanently delete "{deleteTarget?.name || deleteTarget?.email}"?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <LoadingButton
            color="error"
            variant="contained"
            loading={deleting}
            onClick={() => void handleDelete()}
            startIcon={<DeleteOutlineIcon />}
          >
            Delete
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
