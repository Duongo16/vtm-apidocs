import type React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { AccountCircle, Description } from "@mui/icons-material";
import { Menu as LucideMenu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { listDocuments } from "../services/adminDocsService";

interface ApiDocumentSummary {
  id: number;
  name: string;
  slug?: string;
  updatedAt?: string;
}

interface NavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [docsAnchorEl, setDocsAnchorEl] = useState<null | HTMLElement>(null);

  const [docs, setDocs] = useState<ApiDocumentSummary[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const isLoggedIn = !!user;

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setAnchorEl(null);
    }
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  // ===== Menu Documents: mở & load danh sách =====
  const openDocsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setDocsAnchorEl(event.currentTarget);
  };
  const closeDocsMenu = () => setDocsAnchorEl(null);

  const fetchDocs = async () => {
    try {
      setDocsLoading(true);
      setDocsError(null);
      const data = await listDocuments();
      setDocs(data || []);
    } catch (e: any) {
      setDocsError(e?.message || "Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  };

  // Lấy list mỗi khi mở menu (đảm bảo luôn mới)
  useEffect(() => {
    if (docsAnchorEl) {
      fetchDocs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docsAnchorEl]);

  return (
    <nav
      style={{
        background: colors.loginGradient,
        color: colors.white,
      }}
      className="border-b border-gray-200 px-4 py-3 sticky top-0 z-50"
    >
      <div className="flex items-center justify-between">
        {/* Left part: sidebar toggle + logo + title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5 text-white" />
            ) : (
              <LucideMenu className="h-5 w-5 text-white" />
            )}
          </button>

          <Link to="/docs" className="flex items-center space-x-3 no-underline">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm select-none">
                V
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">
              Viettel API Documentation
            </h1>
          </Link>
        </div>

        {/* Right part: User menu or Login/Register buttons */}
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* ===== Nút Documents (mở menu xổ xuống) ===== */}
              <Button
                color="inherit"
                onClick={openDocsMenu}
                startIcon={<Description />}
                sx={{
                  textTransform: "none",
                  color: colors.white,
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
                aria-haspopup="true"
                aria-controls="docs-menu"
                aria-expanded={Boolean(docsAnchorEl) ? "true" : undefined}
              >
                Documents
              </Button>

              <Menu
                id="docs-menu"
                anchorEl={docsAnchorEl}
                open={Boolean(docsAnchorEl)}
                onClose={closeDocsMenu}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                  sx: {
                    minWidth: 300,
                    maxHeight: 420,
                    p: 1,
                    bgcolor: "background.paper",
                    boxShadow: 3,
                    borderRadius: 2,
                  },
                }}
              >
                {docsLoading && (
                  <MenuItem disabled>Loading documents...</MenuItem>
                )}

                {docsError && (
                  <>
                    <MenuItem disabled sx={{ color: "error.main" }}>
                      {docsError}
                    </MenuItem>
                    <MenuItem onClick={fetchDocs} sx={{ fontWeight: 600 }}>
                      Retry
                    </MenuItem>
                  </>
                )}

                {!docsLoading && !docsError && docs.length === 0 && (
                  <MenuItem disabled>No documents found</MenuItem>
                )}

                {!docsLoading &&
                  !docsError &&
                  docs.map((d) => (
                    <MenuItem
                      key={d.id}
                      component={Link}
                      to={`/docs/${d.id}`}
                      onClick={closeDocsMenu}
                      sx={{
                        borderRadius: 1,
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <ListItemIcon>
                        <Description fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={d.name || `Document #${d.id}`}
                        secondary={
                          d.updatedAt
                            ? `Updated: ${new Date(
                                d.updatedAt
                              ).toLocaleString()}`
                            : undefined
                        }
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </MenuItem>
                  ))}
              </Menu>

              {/* ===== User menu ===== */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton
                  size="large"
                  onClick={handleMenu}
                  sx={{ color: colors.white }}
                >
                  <AccountCircle />
                </IconButton>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  PaperProps={{
                    sx: {
                      minWidth: 200,
                      p: 1,
                      bgcolor: "background.paper",
                      boxShadow: 3,
                      borderRadius: 2,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 1,
                    }}
                  >
                    <Avatar
                      sx={{ width: 32, height: 32, bgcolor: colors.primary }}
                    >
                      {user?.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {user?.name}
                      </Typography>
                      <Chip
                        label={user?.role}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", height: 20 }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <MenuItem
                    onClick={handleLogout}
                    sx={{
                      color: "error.main",
                      fontWeight: 500,
                      "&:hover": {
                        bgcolor: "error.light",
                        color: "error.contrastText",
                      },
                    }}
                  >
                    Logout
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                color="inherit"
                component={Link}
                to="/login"
                sx={{
                  textTransform: "none",
                  color: colors.white,
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              >
                Login
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                component={Link}
                to="/register"
                sx={{
                  textTransform: "none",
                  color: colors.white,
                  borderColor: "rgba(255,255,255,0.5)",
                  "&:hover": {
                    borderColor: colors.white,
                    backgroundColor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                Register
              </Button>
            </Box>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
