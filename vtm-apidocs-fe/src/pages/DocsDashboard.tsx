import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Plus, Upload } from "lucide-react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import "../theme/scalar-theme.css";
import "@scalar/api-reference-editor/style.css";
import { useAuth } from "../context/AuthContext";
import {
  type ApiDocumentSummary,
  listDocuments,
  getSpec,
  updateSpec,
  updateMeta,
  publish,
  reindex,
  removeDoc,
  type DocStatus,
} from "../services/adminDocsService";
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  CardActions,
} from "@mui/material";
import { Save } from "lucide-react";
import OpenJsonEditorCard from "../components/OpenJsonEditorCard";
import { useToast } from "../context/ToastContext";
import OpenApiDesigner from "../components/OpenApiDesigner";
import { colors } from "../theme/colors";

// --- helpers ---
const isJson = (s: string) => {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
};

function normalizeSpecForEditor(raw: string): string {
  // 1) Thử parse trực tiếp (trường hợp dữ liệu đã chuẩn)
  try {
    const obj = JSON.parse(raw);
    return JSON.stringify(obj, null, 2);
  } catch {
    // bỏ qua, sẽ thử vá
  }

  // 2) Vá các chuỗi unicode thiếu backslash: u002f, u003c, u003e, u0026, ...
  const repaired = raw.replace(
    /u([0-9a-fA-F]{4})/g,
    (match: string, hex: string, offset: number, str: string) => {
      // Nếu đã là "\uXXXX" (đã có backslash ngay trước) thì giữ nguyên
      if (offset > 0 && str[offset - 1] === "\\") return match;
      return "\\u" + hex; // chèn backslash để JSON parser hiểu đúng
    }
  );

  // 3) Parse lại sau khi vá; nếu OK thì pretty-print, sẽ tự giải \u002f => "/"
  try {
    const obj = JSON.parse(repaired);
    return JSON.stringify(obj, null, 2);
  } catch {
    // 4) Bất đắc dĩ: trả nguyên bản (để bạn còn thấy lỗi)
    return raw;
  }
}

export default function DocsDashboard() {
  // ---- Type ------
  type Category = {
    id: number;
    name: string;
    slug: string;
    sortOrder?: number;
  };

  type ImportForm = {
    name: string;
    slug: string;
    version: string;
    description: string;
    spec: string;
    file: File | null;
    categoryId: number | null;
  };

  const { showSuccess, showError } = useToast();

  const [refreshTick, setRefreshTick] = useState(0);

  // --- Auth / Derived ---
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase().includes("admin");
  const searchParams = new URLSearchParams(window.location.search);
  const selectParam = searchParams.get("select");

  // =====================
  // Sidebar state
  // =====================
  const [docs, setDocs] = useState<ApiDocumentSummary[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocStatus | "all">("all");
  const [loadingList, setLoadingList] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // =====================
  // Selection
  // =====================
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeId) || null,
    [docs, activeId]
  );

  // =====================
  // Work area state
  // =====================
  const [tab, setTab] = useState(0); // 0=Preview, 1=Editor
  const [specStr, setSpecStr] = useState("");
  const [initialSpec, setInitialSpec] = useState("");
  const [loadingSpec, setLoadingSpec] = useState(false);
  const dirty = specStr !== initialSpec;

  // =====================
  // Spec editor (Metadata tab - Raw JSON)
  // =====================
  const [specText, setSpecText] = useState<string>("");
  const [specLoading, setSpecLoading] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const [savingSpec, setSavingSpec] = useState(false);

  // =====================
  // Metadata local fields
  // =====================
  const [meta, setMeta] = useState<Partial<ApiDocumentSummary>>({});
  const [savingMeta, setSavingMeta] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  // =====================
  // Snackbar
  // =====================
  const [snack, setSnack] = useState<{
    open: boolean;
    msg: string;
    sev: "success" | "info" | "error";
  }>({ open: false, msg: "", sev: "success" });

  // =====================
  // Import dialog
  // =====================
  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState<ImportForm>({
    name: "",
    slug: "",
    version: "1.0.0",
    description: "",
    spec: "",
    file: null,
    categoryId: null,
  });
  const [importing, setImporting] = useState(false);

  const empty = !loadingList && docs.length === 0;

  // =====================
  // Guards
  // =====================
  if (!isAdmin) {
    return (
      <Box p={3}>
        <Navbar
          sidebarOpen={false}
          setSidebarOpen={() => {}}
          searchQuery=""
          setSearchQuery={() => {}}
        />
        <Alert severity="error" sx={{ mt: 2 }}>
          Bạn không có quyền truy cập Dashboard. Liên hệ quản trị viên.
        </Alert>
      </Box>
    );
  }

  // =====================
  // Effects
  // =====================
  // 0) Load list categories
  useEffect(() => {
    if (!importOpen) return;
    (async () => {
      try {
        const res = await fetch("/admin/categories");
        const data: Category[] = await res.json();
        setCategories(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [importOpen]);

  // 1) Load list (mỗi lần query/statusFilter/selectParam đổi)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const list = await listDocuments(
          query || undefined,
          statusFilter === "all" ? undefined : statusFilter
        );
        if (cancelled) return;

        const sorted = [...list].sort((a, b) =>
          (b.updatedAt || "").localeCompare(a.updatedAt || "")
        );
        setDocs(sorted);

        // Tính nextActiveId theo quy tắc đã mô tả:
        const selectId = selectParam ? Number(selectParam) : null;
        const hasSelect =
          Number.isFinite(selectId) && sorted.some((d) => d.id === selectId);

        setActiveId((prev) => {
          if (hasSelect) return selectId as number;
          if (prev && sorted.some((d) => d.id === prev)) return prev; // giữ nguyên
          return sorted.length ? sorted[0].id : null;
        });
      } catch (e: any) {
        if (!cancelled)
          setSnack({
            open: true,
            msg: `Load documents lỗi: ${e?.message ?? e}`,
            sev: "error",
          });
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, statusFilter, selectParam, refreshTick]); // thêm selectParam để bắt thay đổi URL/param

  // 2) Load spec khi activeId thay đổi (chỉ phụ thuộc activeId)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      if (!activeId) {
        setSpecStr("");
        setInitialSpec("");
        return;
      }
      try {
        setLoadingSpec(true);
        const s = await getSpec(activeId);
        const pretty = isJson(s) ? JSON.stringify(JSON.parse(s), null, 2) : s;
        setSpecStr(pretty ?? "");
        setInitialSpec(pretty ?? "");
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setSnack({
            open: true,
            msg: `Load spec lỗi: ${e?.message ?? e}`,
            sev: "error",
          });
          setSpecStr("");
          setInitialSpec("");
        }
      } finally {
        setLoadingSpec(false);
      }
    })();
    return () => ac.abort();
  }, [activeId]);

  // 3) Đồng bộ meta khi docs hoặc activeId đổi (KHÔNG fetch spec lại)
  useEffect(() => {
    if (!activeId) {
      setMeta({});
      return;
    }
    const md = docs.find((d) => d.id === activeId);
    if (md) {
      setMeta({
        name: md.name,
        slug: md.slug,
        version: md.version,
        status: md.status,
        description: md.description,
      });
    } else {
      setMeta({});
    }
  }, [activeId, docs]);

  // 4) Load spec JSON vào tab Metadata (specText) khi bật tab 2
  useEffect(() => {
    let cancelled = false;
    if (tab !== 1) return; // chỉ load khi đang ở tab Metadata/Spec
    if (!activeId) {
      setSpecText("");
      setSpecError(null);
      return;
    }
    (async () => {
      setSpecLoading(true);
      setSpecError(null);
      try {
        // getSpec nên trả về string spec (JSON hoặc YAML); ở đây ưu tiên JSON
        const raw = await getSpec(activeId); // nếu bạn cần ?frontend=1 thì sửa service cho nhận flag
        if (cancelled) return;

        setSpecText(normalizeSpecForEditor(raw));
      } catch (e: any) {
        if (cancelled) return;
        setSpecError(e?.message || "Failed to load spec");
      } finally {
        if (!cancelled) setSpecLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, activeId]);

  // =====================
  // Preview configuration (live update)
  // =====================
  const theme = useTheme();
  const mode = theme.palette.mode;

  const apiRefConfig = useMemo(
    () => ({
      content: specStr,
      theme: "kepler",
      layout: "modern",
      darkMode: mode === "dark",
      hideDarkModeToggle: false,
      showSidebar: true,
      hideSearch: false,
      hideModels: false,
      documentDownloadType: "both",
      defaultHttpClient: { targetKey: "node", clientKey: "undici" },
      hiddenClients: ["wget"],
      metaData: { title: "VTM API Docs", description: "Internal API docs" },
      favicon: "/favicon.svg",
      customCss: `
      /* ===== Light mode ===== */
      .light-mode {
        /* text */
        --scalar-color-1: ${colors.gray[900]};     /* primary text */
        --scalar-color-2: ${colors.gray[600]};     /* secondary text */
        --scalar-color-3: ${colors.gray[500]};     /* muted text */

        /* accent / links / highlights */
        --scalar-color-accent: ${colors.primary};
        
        /* backgrounds & borders */
        --scalar-background-1: ${colors.gray[50]}; /* page bg */
        --scalar-background-2: ${colors.white};    /* surfaces/cards */
        --scalar-border-color: ${colors.gray[200]};

        /* code blocks & chips */
        --scalar-code-background-1: ${colors.gray[100]};
        --scalar-code-color-1: ${colors.gray[900]};

        /* buttons / interactive */
        --scalar-button-primary: ${colors.primary};
        --scalar-button-primary-hover: ${colors.primaryDark};
        --scalar-button-primary-color: ${colors.white};
        --scalar-badge-accent: ${colors.primaryLight};
      }

      /* ===== Dark mode ===== */
      .dark-mode {
        /* text */
        --scalar-color-1: ${colors.gray[100]};
        --scalar-color-2: ${colors.gray[400]};
        --scalar-color-3: ${colors.gray[500]};

        /* accent / links */
        --scalar-color-accent: ${colors.primaryLight};

        /* backgrounds & borders */
        --scalar-background-1: #121212;
        --scalar-background-2: #1e1e1e;
        --scalar-border-color: ${colors.gray[700]};

        /* code blocks */
        --scalar-code-background-1: ${colors.gray[800]};
        --scalar-code-color-1: ${colors.gray[50]};

        /* buttons / interactive */
        --scalar-button-primary: ${colors.primaryLight};
        --scalar-button-primary-hover: ${colors.primary};
        --scalar-button-primary-color: ${colors.white};
        --scalar-badge-accent: ${colors.primaryLight};
      }

      /* (tuỳ chọn) nhấn mạnh link */
      .light-mode a, .dark-mode a {
        color: var(--scalar-color-accent);
      }

      /* (tuỳ chọn) sidebar tinh chỉnh nhẹ */
      .light-mode .sidebar { --scalar-sidebar-color-2: ${colors.gray[600]}; }
      .dark-mode .sidebar  { --scalar-sidebar-color-2: ${colors.gray[400]}; }

      /* (tuỳ chọn) method labels – nếu Scalar của bạn dùng badge mặc định */
      .light-mode .http-verb, .dark-mode .http-verb { color: #fff; }
    `,
    }),
    [specStr]
  );

  // =====================
  // Actions
  // =====================

  const doDiscard = () => {
    if (!dirty) return;
    if (!confirm("Hoàn tác về bản đã tải?")) return;
    setSpecStr(initialSpec);
    setSnack({ open: true, msg: "Đã hoàn tác.", sev: "info" });
  };

  const doPublish = async (next: DocStatus) => {
    if (!activeId) return;
    setChangingStatus(true);
    try {
      await publish(activeId, next);
      setMeta((m) => ({ ...m, status: next }));
      setDocs((list) =>
        list.map((d) => (d.id === activeId ? { ...d, status: next } : d))
      );
      setSnack({
        open: true,
        msg: `Đã cập nhật trạng thái: ${next}`,
        sev: "success",
      });
    } catch (e: any) {
      setSnack({
        open: true,
        msg: `Publish lỗi: ${e?.message ?? e}`,
        sev: "error",
      });
    } finally {
      setChangingStatus(false);
    }
  };

  const doDelete = async () => {
    if (!activeId) return;
    const doc = docs.find((d) => d.id === activeId);
    if (!confirm(`Xoá "${doc?.name}"?`)) return;
    try {
      await removeDoc(activeId);
      const nextList = docs.filter((d) => d.id !== activeId);
      setDocs(nextList);
      setActiveId(nextList.length ? nextList[0].id : null);
      setSnack({ open: true, msg: "Đã xoá document.", sev: "success" });
    } catch (e: any) {
      setSnack({
        open: true,
        msg: `Xoá lỗi: ${e?.message ?? e}`,
        sev: "error",
      });
    }
  };

  const doSaveMeta = async () => {
    if (!activeId) return;
    setSavingMeta(true);
    try {
      const saved = await updateMeta(activeId, {
        name: meta.name || "",
        slug: meta.slug || "",
        version: meta.version || "",
        description: meta.description || "",
      });
      setDocs((list) =>
        list.map((d) => (d.id === activeId ? { ...d, ...saved } : d))
      );
      setSnack({ open: true, msg: "Đã lưu metadata.", sev: "success" });
    } catch (e: any) {
      setSnack({
        open: true,
        msg: `Lưu metadata lỗi: ${e?.message ?? e}`,
        sev: "error",
      });
    } finally {
      setSavingMeta(false);
    }
  };

  async function doSaveSpec() {
    if (!activeId) return;
    try {
      setSavingSpec(true);
      const obj = JSON.parse(specText);
      const payload = JSON.stringify(obj);
      await updateSpec(activeId, payload);
      await reindex(activeId);
      setSpecError(null);
      showSuccess("Saved spec & reindexed");
    } catch (e: any) {
      setSpecError(String(e.message || e));
    } finally {
      setSavingSpec(false);
    }
  }

  const handleSaveSpecFromMeta = () => {
    try {
      JSON.parse(specText || "{}");
      setSpecStr(specText);
      doSaveSpec();
    } catch (e: any) {
      setSpecError(e?.message || String(e));
    }
  };

  const doImport = async () => {
    if (importing) return;

    const name = (importForm.name || "").trim();
    const slug = (importForm.slug || "").trim();
    const version = (importForm.version || "").trim() || "1.0.0";
    const description = (importForm.description || "").trim();
    const spec = importForm.spec || "";
    const file = importForm.file || null;
    const categoryId = importForm.categoryId ?? null;

    // --- basic validation ---
    if (!name || !slug || (!file && !spec.trim())) {
      showError("Vui lòng điền Name, Slug và chọn PDF hoặc dán Spec");
      return;
    }

    // --- timeout (ví dụ 120s) ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    try {
      setImporting(true);

      // ===== PDF (multipart) =====
      if (file) {
        const form = new FormData();
        form.append("name", name);
        form.append("slug", slug);
        form.append("version", version);
        if (description) form.append("description", description);
        if (categoryId != null) form.append("categoryId", String(categoryId));
        form.append("file", file);

        const res = await fetch(`/admin/docs/import-pdf`, {
          method: "POST",
          body: form,
          signal: controller.signal,
        });

        const raw = await res.text();
        if (!res.ok) {
          throw new Error(
            `Import PDF failed: ${res.status} ${res.statusText} — ${raw.slice(
              0,
              500
            )}`
          );
        }

        setImportOpen(false);
        setImportForm({
          name: "",
          slug: "",
          version: "1.0.0",
          description: "",
          spec: "",
          file: null,
          categoryId: null,
        });
        showSuccess("Import PDF thành công");
        setRefreshTick((t) => t + 1);
        return;
      }

      // ===== SPEC (JSON/YAML) =====
      const params = new URLSearchParams({ name, slug, version });
      if (description) params.append("description", description);
      if (categoryId != null) params.append("categoryId", String(categoryId));

      const res = await fetch(`/admin/docs/import?` + params.toString(), {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=UTF-8" },
        body: spec,
        signal: controller.signal,
      });

      const raw = await res.text();
      if (!res.ok) {
        throw new Error(
          `Import spec failed: ${res.status} ${res.statusText} — ${raw.slice(
            0,
            500
          )}`
        );
      }

      setImportOpen(false);
      setImportForm({
        name: "",
        slug: "",
        version: "1.0.0",
        description: "",
        spec: "",
        file: null,
        categoryId: null,
      });
      showSuccess("Import spec thành công");
      setRefreshTick((t) => t + 1);
    } catch (err: any) {
      const msg =
        err?.name === "AbortError"
          ? "Import bị hủy do quá thời gian (timeout). Hãy thử lại."
          : err?.message || "Import thất bại";
      showError(msg);
    } finally {
      clearTimeout(timeoutId);
      setImporting(false);
    }
  };

  return (
    <Box
      className="docs-root"
      sx={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100vh" }}
    >
      <Navbar
        sidebarOpen={false}
        setSidebarOpen={() => {}}
        searchQuery=""
        setSearchQuery={() => {}}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Sidebar */}
        <Box
          sx={{
            borderRight: "1px solid var(--vtm-toolbar-border)",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Toolbar>
          <Box sx={{ px: 2, pb: 1 }}>
            <Autocomplete
              size="small"
              options={["all", "draft", "published", "archived"]}
              value={statusFilter}
              onChange={(_, v) => setStatusFilter((v as any) ?? "all")}
              renderInput={(p) => <TextField {...p} label="Status" />}
            />
          </Box>

          <Box sx={{ px: 2, pb: 1, display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus />}
              onClick={() => {
                setImportOpen(true);
                setImportForm((f) => ({
                  ...f,
                  spec: `{"openapi":"3.0.3","info":{"title":"New API","version":"1.0.0"},"paths":{}}`,
                }));
              }}
              fullWidth
            >
              New / Import
            </Button>
          </Box>

          <Divider />

          <Box sx={{ overflow: "auto" }}>
            {loadingList && (
              <Box p={2}>
                <Typography variant="body2">Loading…</Typography>
              </Box>
            )}

            {empty && (
              <Box p={2}>
                <Alert severity="info">
                  Chưa có document nào. Bấm <strong>New / Import</strong> để tạo
                  mới.
                </Alert>
              </Box>
            )}

            {!loadingList && !empty && (
              <List dense disablePadding>
                {docs.map((d) => (
                  <ListItemButton
                    key={d.id}
                    selected={d.id === activeId}
                    onClick={() => setActiveId(d.id)}
                    sx={{ alignItems: "flex-start", py: 1.2 }}
                  >
                    <Box sx={{ mr: 1, mt: 0.2 }}>
                      <Avatar sx={{ width: 28, height: 28 }}>
                        {(d.name || "D")[0].toUpperCase()}
                      </Avatar>
                    </Box>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" gap={1}>
                          <span style={{ fontWeight: 600 }}>{d.name}</span>
                          <Chip
                            size="small"
                            label={d.status}
                            variant="outlined"
                          />
                        </Stack>
                      }
                      secondary={
                        <span style={{ fontSize: 12, opacity: 0.8 }}>
                          {d.slug} · v{d.version}
                        </span>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Box>

        {/* Work Area */}
        <Box
          sx={{
            minWidth: 0,
            minHeight: 0,
            display: "grid",
            gridTemplateRows: "auto auto 1fr", // toolbar, tabs, main
          }}
        >
          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            sx={{ borderBottom: "1px solid var(--vtm-toolbar-border)" }}
          >
            <Tab label="Preview" />
            <Tab label="Editor" />
          </Tabs>

          {/* Panels */}
          <Box
            sx={{ overflow: "hidden" /* quan trọng để tránh double-scroll */ }}
          >
            {/* Preview */}
            {tab === 0 && (
              <Box sx={{ height: "100%", overflow: "auto", p: 1 }}>
                {activeId ? (
                  <ApiReferenceReact configuration={apiRefConfig as any} />
                ) : (
                  <Box p={2}>
                    <Alert severity="info">Hãy chọn document bên trái.</Alert>
                  </Box>
                )}
              </Box>
            )}

            {/* Editor */}
            {tab === 1 && (
              <Box sx={{ p: 2, height: "100%", overflow: "hidden" }}>
                <Grid
                  container
                  spacing={2}
                  alignItems="stretch"
                  sx={{ height: "100%" }}
                >
                  <Grid size={{ xs: 12 }}>
                    <OpenApiDesigner
                      title="OpenAPI Designer"
                      value={specText}
                      onChange={setSpecText}
                      onSave={handleSaveSpecFromMeta}
                      loading={specLoading}
                      disabled={!activeId || specLoading}
                      errorMessage={specError}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Import / New Dialog */}
      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>New / Import Document</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Name"
              fullWidth
              value={importForm.name}
              onChange={(e) =>
                setImportForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <TextField
              label="Slug"
              fullWidth
              value={importForm.slug}
              onChange={(e) =>
                setImportForm((f) => ({ ...f, slug: e.target.value }))
              }
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Version"
              fullWidth
              value={importForm.version}
              onChange={(e) =>
                setImportForm((f) => ({ ...f, version: e.target.value }))
              }
            />
            <TextField
              label="Description"
              fullWidth
              value={importForm.description}
              onChange={(e) =>
                setImportForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </Stack>
          <Autocomplete
            size="small"
            options={categories}
            getOptionLabel={(o) => o.name}
            value={
              categories.find((c) => c.id === importForm.categoryId) ?? null
            }
            onChange={(_, opt) =>
              setImportForm((f) => ({ ...f, categoryId: opt?.id ?? null }))
            }
            renderInput={(p) => <TextField {...p} label="Category" />}
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <Button component="label" startIcon={<Upload />}>
              Import PDF (AI)
              <input
                hidden
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImportForm((fr) => {
                    const base = f.name.replace(/\.pdf$/i, "");
                    return {
                      ...fr,
                      file: f,
                      // auto-fill nếu trống
                      name: fr.name || base,
                      slug: fr.slug || base.toLowerCase().replace(/\s+/g, "-"),
                    };
                  });
                  // Cho phép chọn lại cùng 1 file sau này
                  e.currentTarget.value = "";
                }}
              />
            </Button>
            {importForm.file ? (
              <Chip
                size="small"
                sx={{ ml: 1 }}
                label={`${importForm.file.name} (${(
                  importForm.file.size /
                  1024 /
                  1024
                ).toFixed(2)} MB)`}
                onDelete={() => setImportForm((fr) => ({ ...fr, file: null }))}
              />
            ) : null}
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Hoặc dán spec vào ô phía dưới (JSON/YAML).
            </Typography>
          </Stack>
          <TextField
            label="OpenAPI Spec"
            multiline
            minRows={12}
            value={importForm.spec}
            onChange={(e) =>
              setImportForm((f) => ({ ...f, spec: e.target.value }))
            }
            disabled={!!importForm.file}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing}>
            Hủy
          </Button>

          <LoadingButton
            variant="contained"
            onClick={doImport}
            loading={importing}
            loadingPosition="start"
            startIcon={<CloudUploadIcon />}
            disabled={
              !importForm.name ||
              !importForm.slug ||
              (!importForm.file && !importForm.spec)
            }
          >
            Tạo / Import
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2600}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.sev}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
