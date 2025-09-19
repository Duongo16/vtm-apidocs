"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  TextField,
  Typography,
  Chip,
  Paper,
  Fade,
  Tooltip,
  useTheme,
  alpha,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import ApiIcon from "@mui/icons-material/Api";
import CodeIcon from "@mui/icons-material/Code";
import InfoIcon from "@mui/icons-material/Info";
import StorageIcon from "@mui/icons-material/Storage";
import LabelIcon from "@mui/icons-material/Label";
import HttpIcon from "@mui/icons-material/Http";
import RichTextEditor from "./RichTextEditor";

// ---------- Types & helpers ----------
const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "trace",
] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

const METHOD_COLORS: Record<HttpMethod, string> = {
  get: "#4CAF50",
  post: "#2196F3",
  put: "#FF9800",
  patch: "#9C27B0",
  delete: "#F44336",
  options: "#607D8B",
  head: "#795548",
  trace: "#9E9E9E",
};

type Props = {
  /** JSON string of OpenAPI 3.x */
  value: string;
  /** called with new JSON string when user edits */
  onChange?: (s: string) => void;
  /** optional save callback (same contract as your old editor) */
  onSave?: () => void | Promise<void>;
  /** disable interactions (e.g., while saving) */
  disabled?: boolean;
  /** show loading state */
  loading?: boolean;
  /** optional error message */
  errorMessage?: string | null;
  /** dark header like your OpenJsonEditorCard */
  title?: string;
};

function safeParse(jsonText: string): any | null {
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function pretty(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

function ensureSpecShape(obj: any): any {
  const spec = { ...obj };
  spec.openapi ||= spec.openapi ?? "3.0.3";
  spec.info ||= spec.info ?? { title: "Untitled API", version: "1.0.0" };
  spec.paths ||= spec.paths ?? {};
  spec.components ||= spec.components ?? {};
  spec.servers ||= spec.servers ?? [];
  spec.tags ||= spec.tags ?? [];
  return spec;
}

function listOperations(spec: any): Array<{
  path: string;
  method: HttpMethod;
  op: any;
}> {
  const out: Array<{ path: string; method: HttpMethod; op: any }> = [];
  const paths = spec?.paths ?? {};
  for (const p of Object.keys(paths)) {
    const node = paths[p] || {};
    for (const m of HTTP_METHODS) {
      if (node[m]) out.push({ path: p, method: m, op: node[m] });
    }
  }
  return out;
}

function setOperation(
  spec: any,
  path: string,
  method: HttpMethod,
  updater: (op: any) => any
): any {
  const next = { ...spec, paths: { ...spec.paths } };
  const node = { ...(next.paths[path] || {}) };
  const cur = node[method] || {};
  node[method] = updater({ ...cur });
  next.paths[path] = node;
  return next;
}

function deleteOperation(spec: any, path: string, method: HttpMethod): any {
  const next = { ...spec, paths: { ...spec.paths } };
  const node = { ...(next.paths[path] || {}) };
  delete node[method];
  if (Object.keys(node).length === 0) delete next.paths[path];
  else next.paths[path] = node;
  return next;
}

function addOperation(spec: any, path: string, method: HttpMethod): any {
  const next = { ...spec, paths: { ...spec.paths } };
  const node = { ...(next.paths[path] || {}) };
  if (!node[method])
    node[method] = { summary: "", responses: { "200": { description: "OK" } } };
  next.paths[path] = node;
  return next;
}

// ---------- Component ----------
export default function OpenApiDesigner({
  value,
  onChange,
  onSave,
  disabled,
  loading,
  errorMessage,
}: Props) {
  const theme = useTheme();
  const parsed = useMemo(
    () => ensureSpecShape(safeParse(value) || {}),
    [value]
  );
  const [tab, setTab] = useState(0);
  const [detailTab, setDetailTab] = useState<"body" | "responses">("body");

  // local selection for endpoints
  const operations = useMemo(() => listOperations(parsed), [parsed]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedKey && operations.length > 0) {
      const first = operations[0];
      setSelectedKey(`${first.method} ${first.path}`);
    }
  }, [operations, selectedKey]);

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    const [m, ...rest] = selectedKey.split(" ");
    const path = rest.join(" ");
    const method = m as HttpMethod;
    const op = parsed?.paths?.[path]?.[method];
    return op ? { path, method, op } : null;
  }, [selectedKey, parsed]);

  const push = (nextObj: any) => onChange?.(pretty(nextObj));

  // ---------- Basic Info forms ----------
  const handleInfoChange = (
    k: "title" | "version" | "description",
    v: string
  ) => {
    const next = {
      ...parsed,
      info: { ...parsed.info, [k]: v },
    };
    push(next);
  };

  const handleServersChange = (
    servers: Array<{ url: string; description?: string }>
  ) => {
    const next = { ...parsed, servers };
    push(next);
  };

  const handleTagsChange = (
    tags: Array<{ name: string; description?: string }>
  ) => {
    const next = { ...parsed, tags };
    push(next);
  };

  const upsertSelected = (patch: Partial<any>) => {
    if (!selected) return;
    const next = setOperation(parsed, selected.path, selected.method, (op) => ({
      ...op,
      ...patch,
    }));
    push(next);
  };

  const removeSelected = () => {
    if (!selected) return;
    const next = deleteOperation(parsed, selected.path, selected.method);
    push(next);
    setSelectedKey(null);
  };

  const addNewEndpoint = () => {
    const path = `/new-endpoint-${Date.now()}`;
    const method: HttpMethod = "get";
    const endpoint = {
      summary: "New Endpoint",
      description: "",
      parameters: [],
      responses: { "200": { description: "Success" } },
    };
    const next = addOperation(parsed, path, method);
    next.paths[path][method] = endpoint;
    push(next);
    setSelectedKey(`${method} ${path}`);
  };

  // ---------- UI pieces ----------
  const InfoTab = (
    <Fade in timeout={300}>
      <Box sx={{ p: { xs: 2, md: 3 }, width: "100%" }}>
        <Stack spacing={3} sx={{ width: "100%" }}>
          <TextField
            label="API Title"
            value={parsed.info?.title ?? ""}
            onChange={(e) => handleInfoChange("title", e.target.value)}
            fullWidth
            variant="outlined"
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            label="Version"
            value={parsed.info?.version ?? ""}
            onChange={(e) => handleInfoChange("version", e.target.value)}
            fullWidth
            variant="outlined"
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Description
            </Typography>
            <Box
              sx={{
                width: "100%",
                "& .sun-editor": {
                  borderRadius: 1,
                  borderColor: "divider",
                  boxShadow: "none",
                },
                "& .se-toolbar": {
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                },
                "& .se-toolbar, & .se-container": {
                  borderColor: "divider",
                },
                "& .se-container": {
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                },
                "& .se-resizing-inner, & .se-container .se-wrapper": {
                  fontFamily: "inherit",
                },
              }}
            >
              <RichTextEditor
                value={parsed.info?.description ?? ""}
                onChange={(next) => handleInfoChange("description", next)}
                placeholder="Mô tả ngắn gọn về API"
                minHeight={180}
              />
            </Box>
          </Box>
        </Stack>
      </Box>
    </Fade>
  );

  const ServersTab = (
    <Fade in timeout={300}>
      <Box sx={{ width: "100%" }}>
        <ServersEditor
          servers={
            (parsed.servers ?? []) as Array<{
              url: string;
              description?: string;
            }>
          }
          onChange={handleServersChange}
          disabled={!!disabled}
        />
      </Box>
    </Fade>
  );

  const TagsTab = (
    <Fade in timeout={300}>
      <Box sx={{ width: "100%" }}>
        <TagsEditor
          tags={
            (parsed.tags ?? []) as Array<{ name: string; description?: string }>
          }
          onChange={handleTagsChange}
          disabled={!!disabled}
        />
      </Box>
    </Fade>
  );

  const EndpointsTab = (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "350px 1fr" },
          minHeight: { xs: "auto", md: 500 },
          gap: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRight: {
              xs: "none",
              lg: `1px solid ${theme.palette.divider}`,
            },
            borderBottom: {
              xs: `1px solid ${theme.palette.divider}`,
              lg: "none",
            },
            display: "flex",
            flexDirection: "column",
            background: alpha(theme.palette.background.paper, 0.5),
            width: "100%",
            minHeight: { xs: 200, lg: "auto" },
          }}
        >
          <Box
            sx={{
              p: { xs: 1.5, md: 2 },
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Button
              startIcon={<AddIcon />}
              fullWidth
              variant="outlined"
              onClick={addNewEndpoint}
              disabled={!!disabled}
              sx={{
                mt: 1,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Add Endpoint
            </Button>
          </Box>

          <List
            dense
            sx={{
              overflow: "auto",
              flex: 1,
              maxHeight: "400px",
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: alpha(theme.palette.grey[300], 0.3),
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: alpha(theme.palette.primary.main, 0.5),
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.7),
                },
              },
            }}
          >
            {operations.length === 0 && (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <ApiIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No endpoints yet
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Click "Add Endpoint" to get started
                </Typography>
              </Box>
            )}
            {operations.map(({ path, method }) => (
              <ListItemButton
                key={`${method} ${path}`}
                selected={selectedKey === `${method} ${path}`}
                onClick={() => setSelectedKey(`${method} ${path}`)}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 1.5,
                  "&.Mui-selected": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    },
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        label={method.toUpperCase()}
                        sx={{
                          backgroundColor: METHOD_COLORS[method],
                          color: "white",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          minWidth: 60,
                        }}
                      />
                      <Typography
                        variant="body2"
                        component="code"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                        }}
                      >
                        {path}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {parsed.paths[path]?.[method]?.summary || "No summary"}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Box
          sx={{
            p: { xs: 2, md: 3 },
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          {!selected ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: { xs: 200, md: "100%" },
                textAlign: "center",
                width: "100%",
                p: 2,
              }}
            >
              <ApiIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Select an endpoint to edit
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Choose an endpoint from the left panel to view and edit its
                details
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3} sx={{ width: "100%" }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ width: "100%" }}
              >
                <TextField
                  select
                  label="HTTP Method"
                  value={selected.method}
                  onChange={(e) => {
                    const newMethod =
                      (e.target.value as HttpMethod) || selected.method;
                    // move operation under a new method key on same path
                    const cur =
                      parsed.paths[selected.path]?.[selected.method] || {};
                    let next = deleteOperation(
                      parsed,
                      selected.path,
                      selected.method
                    );
                    next = addOperation(next, selected.path, newMethod);
                    next = setOperation(
                      next,
                      selected.path,
                      newMethod,
                      () => cur
                    );
                    push(next);
                    setSelectedKey(`${newMethod} ${selected.path}`);
                  }}
                  fullWidth
                  SelectProps={{ native: true }}
                  sx={{
                    minWidth: { xs: "100%", sm: 150 },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m.toUpperCase()}
                    </option>
                  ))}
                </TextField>

                <TextField
                  label="Endpoint Path"
                  value={selected.path}
                  onChange={(e) => {
                    const newPath = e.target.value || selected.path;
                    // move to new path preserving method
                    const cur =
                      parsed.paths[selected.path]?.[selected.method] || {};
                    let next = deleteOperation(
                      parsed,
                      selected.path,
                      selected.method
                    );
                    next = addOperation(next, newPath, selected.method);
                    next = setOperation(
                      next,
                      newPath,
                      selected.method,
                      () => cur
                    );
                    push(next);
                    setSelectedKey(`${selected.method} ${newPath}`);
                  }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "monospace",
                    },
                  }}
                />
                <TextField
                  label="Operation ID"
                  value={selected.op?.operationId ?? ""}
                  onChange={(e) =>
                    upsertSelected({ operationId: e.target.value })
                  }
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
                <TextField
                  select
                  label="Tags"
                  value={selected.op?.tags?.[0] ?? ""}
                  onChange={(e) => {
                    const tag = e.target.value;
                    upsertSelected({ tags: tag ? [tag] : [] });
                  }}
                  fullWidth
                  SelectProps={{
                    native: true,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                >
                  <option value="">None</option>
                  {(parsed.tags ?? []).map((t: { name: string }) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </TextField>
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ width: "100%" }}
              >
                <TextField
                  label="Summary"
                  value={selected.op?.summary ?? ""}
                  onChange={(e) => upsertSelected({ summary: e.target.value })}
                  fullWidth
                  minRows={3}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
                <TextField
                  label="Description"
                  value={selected.op?.description ?? ""}
                  onChange={(e) =>
                    upsertSelected({ description: e.target.value })
                  }
                  fullWidth
                  minRows={3}
                  multiline
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
              </Stack>

              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  width: "100%",
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <CardContent
                  sx={{
                    pt: 0,
                    p: 0,
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: { xs: 220, md: 330 }, // đặt chiều cao tối đa của card
                    overflow: "hidden", // ẩn tràn, phần nội dung dưới sẽ tự cuộn
                  }}
                >
                  {/* Navbar (Tabs) để chuyển giữa Schema và Responses */}
                  <Tabs
                    value={detailTab}
                    onChange={(_, v) => setDetailTab(v)}
                    variant="fullWidth"
                    sx={{
                      minHeight: 36,
                      "& .MuiTab-root": {
                        textTransform: "none",
                        minHeight: 36,
                        fontWeight: 600,
                      },
                      "& .MuiTabs-indicator": { height: 2 },
                      mb: 2,
                      overflowY: "auto",
                    }}
                  >
                    <Tab value="body" label="Request Body (JSON Schema)" />
                    <Tab value="responses" label="Responses" />
                  </Tabs>

                  {/* Tab panels */}
                  <Box
                    role="tabpanel"
                    hidden={detailTab !== "body"}
                    sx={{
                      flex: 1,
                      overflowY: "auto",
                      px: 2,
                      pb: 2,
                      pr: 1, // chừa chỗ cho scrollbar
                      "&::-webkit-scrollbar": { width: 8 },
                      "&::-webkit-scrollbar-thumb": (theme) => ({
                        backgroundColor: alpha(
                          theme.palette.text.primary,
                          0.24
                        ),
                        borderRadius: 8,
                      }),
                    }}
                  >
                    {detailTab === "body" && (
                      <SchemaEditor
                        schema={
                          selected.op?.requestBody?.content?.[
                            "application/json"
                          ]?.schema || {
                            type: "object",
                            properties: {},
                          }
                        }
                        onChange={(schema) => {
                          upsertSelected({
                            requestBody: {
                              required: true,
                              content: {
                                "application/json": {
                                  schema,
                                },
                              },
                            },
                          });
                        }}
                        disabled={disabled}
                      />
                    )}
                  </Box>

                  <Box role="tabpanel" hidden={detailTab !== "responses"}>
                    {detailTab === "responses" && (
                      <ResponsesEditor
                        responses={selected.op?.responses ?? {}}
                        onChange={(responses) => upsertSelected({ responses })}
                        disabled={!!disabled}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="space-between"
                sx={{ width: "100%" }}
              >
                <Tooltip title="Remove this endpoint">
                  <Button
                    startIcon={<DeleteIcon />}
                    color="error"
                    onClick={removeSelected}
                    disabled={!!disabled}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    Remove Endpoint
                  </Button>
                </Tooltip>
                <Button
                  startIcon={<SaveIcon />}
                  variant="contained"
                  onClick={onSave}
                  disabled={!!disabled || !!loading}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 500,
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Box>
    </Fade>
  );

  const RawTab = (
    <Fade in timeout={300}>
      <Box sx={{ p: { xs: 2, md: 3 }, width: "100%" }}>
        <TextField
          label="OpenAPI JSON Specification"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          multiline
          minRows={16}
          maxRows={20}
          fullWidth
          variant="outlined"
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              fontFamily: "monospace",
              fontSize: "0.875rem",
              maxHeight: "500px",
              overflow: "auto",
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: alpha(theme.palette.grey[300], 0.3),
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: alpha(theme.palette.primary.main, 0.5),
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.7),
                },
              },
            },
          }}
        />
        {!!errorMessage && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mt: 2,
              width: "100%",
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
              borderRadius: 2,
            }}
          >
            <Typography color="error" variant="body2">
              <strong>Validation Error:</strong> {errorMessage}
            </Typography>
          </Paper>
        )}
        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{ mt: 2, width: "100%" }}
        >
          <Button
            startIcon={<SaveIcon />}
            onClick={onSave}
            variant="contained"
            disabled={!!disabled || !!loading}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500 }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>
      </Box>
    </Fade>
  );

  return (
    <Card
      elevation={2}
      sx={{
        width: "100%",
        maxWidth: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{
          width: "100%",
          borderBottom: `1px solid ${theme.palette.divider}`,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 500,
            minHeight: 64,
            minWidth: { xs: 120, sm: 160 },
          },
        }}
      >
        <Tab icon={<InfoIcon />} iconPosition="start" label="API Info" />
        <Tab icon={<StorageIcon />} iconPosition="start" label="Servers" />
        <Tab icon={<LabelIcon />} iconPosition="start" label="Tags" />
        <Tab icon={<HttpIcon />} iconPosition="start" label="Endpoints" />
        <Tab icon={<CodeIcon />} iconPosition="start" label="Raw JSON" />
      </Tabs>

      <CardContent
        sx={{
          p: 0,
          minHeight: 500,
          maxHeight: "70vh", // Added max height to enable scrolling
          display: "flex",
          flex: 1,
          overflow: "auto", // Changed from hidden to auto for scrolling
          width: "100%",
        }}
      >
        {tab === 0 && InfoTab}
        {tab === 1 && ServersTab}
        {tab === 2 && TagsTab}
        {tab === 3 && EndpointsTab}
        {tab === 4 && RawTab}
      </CardContent>

      <CardActions
        sx={{
          justifyContent: "space-between",
          p: 2,
          width: "100%",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1, sm: 0 },
          borderTop: `1px solid ${theme.palette.divider}`,
          background: alpha(theme.palette.background.paper, 0.5),
        }}
      >
        <Typography variant="caption" color="text.secondary">
          OpenAPI 3.0.3 Specification
        </Typography>
        <Button
          startIcon={<SaveIcon />}
          variant="contained"
          onClick={onSave}
          disabled={!!disabled || !!loading}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 500,
            px: 3,
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {loading ? "Saving..." : "Save All Changes"}
        </Button>
      </CardActions>
    </Card>
  );
}

// ---------- Sub-editors ----------
function ServersEditor({
  servers,
  onChange,
  disabled,
}: {
  servers: Array<{ url: string; description?: string }>;
  onChange: (s: Array<{ url: string; description?: string }>) => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  const [rows, setRows] = useState(servers);
  useEffect(() => setRows(servers), [servers]);

  const commit = (next: typeof rows) => {
    setRows(next);
    onChange(next);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: "100%" }}>
      <Stack direction="row" spacing={1} sx={{ mb: 3, width: "100%" }}>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() =>
            commit([...(rows || []), { url: "https://api.example.com" }])
          }
          disabled={disabled}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500 }}
        >
          Add Server
        </Button>
      </Stack>

      <Stack spacing={2} sx={{ width: "100%" }}>
        {(rows || []).map((s, idx) => (
          <Card
            key={idx}
            variant="outlined"
            sx={{ borderRadius: 2, width: "100%" }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2} sx={{ width: "100%" }}>
                <TextField
                  label="Server URL"
                  value={s.url}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], url: e.target.value };
                    commit(next);
                  }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "monospace",
                    },
                  }}
                />
                <TextField
                  label="Description"
                  value={s.description ?? ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], description: e.target.value };
                    commit(next);
                  }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  sx={{ width: "100%" }}
                >
                  <Tooltip title="Remove server">
                    <IconButton
                      onClick={() => commit(rows.filter((_, i) => i !== idx))}
                      disabled={disabled}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              width: "100%",
              background: alpha(theme.palette.background.paper, 0.5),
              border: `1px dashed ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <StorageIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No servers configured
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Add a server to specify where your API is hosted
            </Typography>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

function TagsEditor({
  tags,
  onChange,
  disabled,
}: {
  tags: Array<{ name: string; description?: string }>;
  onChange: (t: Array<{ name: string; description?: string }>) => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  const [rows, setRows] = useState(tags);
  useEffect(() => setRows(tags), [tags]);

  const commit = (next: typeof rows) => {
    setRows(next);
    onChange(next);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: "100%" }}>
      <Stack direction="row" spacing={1} sx={{ mb: 3, width: "100%" }}>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => commit([...(rows || []), { name: "default" }])}
          disabled={disabled}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500 }}
        >
          Add Tag
        </Button>
      </Stack>

      <Stack spacing={2} sx={{ width: "100%" }}>
        {(rows || []).map((t, idx) => (
          <Card
            key={idx}
            variant="outlined"
            sx={{ borderRadius: 2, width: "100%" }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2} sx={{ width: "100%" }}>
                <TextField
                  label="Tag Name"
                  value={t.name}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], name: e.target.value };
                    commit(next);
                  }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
                <TextField
                  label="Description"
                  value={t.description ?? ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], description: e.target.value };
                    commit(next);
                  }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  sx={{ width: "100%" }}
                >
                  <Tooltip title="Remove tag">
                    <IconButton
                      onClick={() => commit(rows.filter((_, i) => i !== idx))}
                      disabled={disabled}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              width: "100%",
              background: alpha(theme.palette.background.paper, 0.5),
              border: `1px dashed ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <LabelIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No tags defined
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Add tags to organize and categorize your API endpoints
            </Typography>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

function ResponsesEditor({
  responses,
  onChange,
  disabled,
}: {
  responses: Record<string, any>;
  onChange: (r: Record<string, any>) => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  const [rows, setRows] = useState(Object.entries(responses || {}));
  useEffect(() => setRows(Object.entries(responses || {})), [responses]);

  const commit = (entries: Array<[string, any]>) => {
    setRows(entries);
    const obj: Record<string, any> = {};
    for (const [code, payload] of entries) obj[code] = payload;
    onChange(obj);
  };

  const addRow = () =>
    commit([...(rows || []), ["200", { description: "OK" }]]);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        width: "100%",
        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
      }}
    >
      <CardContent
        sx={{
          width: "100%",
          maxHeight: "220px",
          overflow: "auto",
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: alpha(theme.palette.grey[300], 0.3),
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(theme.palette.success.main, 0.5),
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: alpha(theme.palette.success.main, 0.7),
            },
          },
        }}
      >
        <Stack spacing={2} sx={{ width: "100%" }}>
          {(rows || []).map(([code, payload], idx) => (
            <Paper
              key={idx}
              elevation={0}
              sx={{
                p: 2,
                width: "100%",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1.5,
                background: alpha(theme.palette.background.paper, 0.5),
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems="flex-start"
                sx={{ width: "100%" }}
              >
                <TextField
                  label="Status Code"
                  value={code}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next = [...rows];
                    next[idx] = [v, payload];
                    commit(next);
                  }}
                  sx={{
                    width: { xs: "100%", sm: 140 },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1.5,
                    },
                  }}
                />
                <TextField
                  label="Response Description"
                  value={payload?.description ?? ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = [
                      code,
                      { ...(payload || {}), description: e.target.value },
                    ];
                    commit(next);
                  }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1.5,
                    },
                  }}
                />
                <Tooltip title="Remove response">
                  <IconButton
                    onClick={() => commit(rows.filter((_, i) => i !== idx))}
                    disabled={disabled}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          ))}
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={addRow}
            disabled={disabled}
            fullWidth
            sx={{
              borderRadius: 1.5,
              textTransform: "none",
              borderStyle: "dashed",
            }}
          >
            Add Response
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SchemaEditor({
  schema,
  onChange,
  disabled,
  title,
}: {
  schema: any;
  onChange: (schema: any) => void;
  disabled?: boolean;
  title?: string;
}) {
  const theme = useTheme();

  const safeSchema = schema ?? {};
  const safePropsObj: Record<string, any> = safeSchema.properties ?? {};
  const safeRequired: string[] = Array.isArray(safeSchema.required)
    ? safeSchema.required
    : [];

  const [properties, setProperties] = useState<Array<[string, any]>>(
    Object.entries(safePropsObj)
  );

  useEffect(() => {
    // khi parent cập nhật schema -> sync lại local state
    setProperties(Object.entries(schema?.properties ?? {}));
  }, [schema]);

  const toPropsObj = (pairs: Array<[string, any]>): Record<string, any> =>
    pairs.reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {} as Record<string, any>);

  const uniqueName = (
    base: string,
    pairs: Array<[string, any]>,
    ignoreIndex: number | null = null
  ): string => {
    const exist = new Set(
      pairs
        .map(([n], i) => (ignoreIndex !== null && i === ignoreIndex ? null : n))
        .filter(Boolean) as string[]
    );
    if (!exist.has(base)) return base;
    let i = 2;
    while (exist.has(`${base}${i}`)) i++;
    return `${base}${i}`;
  };

  const emit = (
    nextPairs: Array<[string, any]>,
    nextRequired: string[] | undefined = safeRequired
  ) => {
    setProperties(nextPairs);
    const propsObj = toPropsObj(nextPairs);

    const normalizedRequired =
      nextRequired && nextRequired.length ? nextRequired : undefined;

    onChange({
      ...safeSchema,
      type: "object",
      properties: propsObj,
      required: normalizedRequired,
    });
  };

  const addProperty = () => {
    const name = uniqueName(`property`, properties);
    const next = [...properties, [name, { type: "string", description: "" }]];
    emit(
      next.filter((item) => Array.isArray(item) && item.length === 2) as [
        string,
        any
      ][],
      safeRequired
    );
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, width: "100%" }}>
      <CardContent>
        <Stack spacing={2}>
          {title && (
            <Typography variant="subtitle1" fontWeight={500}>
              {title}
            </Typography>
          )}

          {properties.map(([name, prop], idx) => {
            const onRename = (newRaw: string) => {
              const newName =
                newRaw.trim() === name
                  ? name
                  : uniqueName(newRaw.trim() || "property", properties, idx);

              if (newName === name) return;

              const nextPairs = [...properties];
              nextPairs[idx] = [newName, prop];

              // cập nhật required nếu có tên cũ
              const reqSet = new Set<string>(safeRequired);
              if (reqSet.has(name)) {
                reqSet.delete(name);
                reqSet.add(newName);
              }
              emit(nextPairs, Array.from(reqSet));
            };

            const onTypeChange = (newType: string) => {
              const nextPairs = [...properties];

              let nextProp = { ...prop, type: newType };
              if (newType === "array" && !nextProp.items) {
                nextProp.items = { type: "string" };
              }
              if (newType !== "array" && nextProp.items) {
                const { items, ...rest } = nextProp;
                nextProp = rest;
              }

              nextPairs[idx] = [name, nextProp];
              emit(nextPairs, safeRequired);
            };

            const onDescChange = (desc: string) => {
              const nextPairs = [...properties];
              nextPairs[idx] = [name, { ...prop, description: desc }];
              emit(nextPairs, safeRequired);
            };

            const onToggleRequired = (checked: boolean) => {
              const reqSet = new Set<string>(safeRequired);
              if (checked) reqSet.add(name);
              else reqSet.delete(name);
              emit(properties, Array.from(reqSet));
            };

            const onDelete = () => {
              const nextPairs = properties.filter((_, i) => i !== idx);
              const reqSet = new Set<string>(safeRequired);
              reqSet.delete(name);
              emit(nextPairs, Array.from(reqSet));
            };

            return (
              <Paper
                key={`${name}-${idx}`}
                elevation={0}
                sx={{
                  p: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.5,
                }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Property Name"
                      value={name}
                      onChange={(e) => onRename(e.target.value)}
                      disabled={disabled}
                      sx={{ flex: 2 }}
                    />

                    <TextField
                      select
                      label="Type"
                      value={prop.type || "string"}
                      onChange={(e) => onTypeChange(e.target.value)}
                      disabled={disabled}
                      sx={{ flex: 1 }}
                    >
                      {[
                        "string",
                        "number",
                        "integer",
                        "boolean",
                        "array",
                        "object",
                      ].map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                    {/* Gợi ý: nếu type=array, có thể mở thêm editor cho items */}
                    {prop.type === "array" && (
                      <TextField
                        label="Array Item Type"
                        select
                        value={prop.items?.type ?? "string"}
                        onChange={(e) => {
                          const nextPairs = [...properties];
                          nextPairs[idx] = [
                            name,
                            { ...prop, items: { type: e.target.value } },
                          ];
                          emit(nextPairs, safeRequired);
                        }}
                        disabled={disabled}
                      >
                        {[
                          "string",
                          "number",
                          "integer",
                          "boolean",
                          "object",
                          "array",
                        ].map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}

                    <TextField
                      label="Description"
                      value={prop.description || ""}
                      onChange={(e) => onDescChange(e.target.value)}
                      disabled={disabled}
                      multiline
                      sx={{ width: "50%" }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={safeRequired.includes(name)}
                          onChange={(e) => onToggleRequired(e.target.checked)}
                          disabled={disabled}
                        />
                      }
                      label="Required"
                    />

                    <IconButton
                      color="error"
                      onClick={onDelete}
                      disabled={disabled}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}

          <Button
            startIcon={<AddIcon />}
            onClick={addProperty}
            disabled={disabled}
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          >
            Add Property
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
