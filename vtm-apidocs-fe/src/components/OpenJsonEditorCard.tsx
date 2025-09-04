import { useMemo, useState } from "react";
import {
  Card, CardHeader, CardContent, Stack, Button, Alert, LinearProgress, Box,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Save } from "lucide-react";

type OpenJsonEditorCardProps = {
  title?: string;
  value: string;
  onChange: (val: string) => void;
  onSave?: () => void;
  loading?: boolean;
  disabled?: boolean;
  errorMessage?: string | null;
  /** Bật dark chỉ cho code block */
  editorDark?: boolean;
};

export default function OpenJsonEditorCard({
  title = "OpenAPI (JSON)",
  value,
  onChange,
  onSave,
  loading,
  disabled,
  errorMessage,
  editorDark,
}: OpenJsonEditorCardProps) {
  const muiTheme = useTheme();
  const [localError, setLocalError] = useState<string | null>(null);

  // ===== Helpers (giữ nguyên) ===============================================
  const normalizeEscapes = (s: string) =>
    s.replace(/\\u003c/gi, "<").replace(/\\u003e/gi, ">")
     .replace(/\\u0026/gi, "&").replace(/\\u002f/gi, "/");

  const sortKeysDeep = (input: any): any => {
    if (Array.isArray(input)) return input.map(sortKeysDeep);
    if (input && typeof input === "object") {
      return Object.keys(input).sort().reduce((acc: any, k) => {
        acc[k] = sortKeysDeep(input[k]); return acc;
      }, {});
    }
    return input;
  };

  const basicOpenApiChecks = (obj: any): string[] => {
    const errs: string[] = [];
    if (!obj || typeof obj !== "object") { errs.push("Root không phải object."); return errs; }
    if (!obj.openapi || typeof obj.openapi !== "string") {
      errs.push('Thiếu field "openapi" (ví dụ "3.0.3").');
    } else if (!/^3\./.test(obj.openapi)) {
      errs.push(`OpenAPI version không phải 3.x (found: ${obj.openapi}).`);
    }
    if (!obj.info || typeof obj.info !== "object") {
      errs.push("Thiếu object info.");
    } else {
      if (!obj.info.title) errs.push('Thiếu "info.title".');
      if (!obj.info.version) errs.push('Thiếu "info.version".');
    }
    if (!obj.paths || typeof obj.paths !== "object") {
      errs.push("Thiếu object paths.");
    }
    return errs;
  };

  // ===== Actions =============================================================
  const doValidate = () => {
    try {
      const parsed = JSON.parse(value);
      const errs = basicOpenApiChecks(parsed);
      if (errs.length) setLocalError(`OpenAPI chưa hợp lệ:\n- ${errs.join("\n- ")}`);
      else setLocalError(null);
    } catch (e: any) { setLocalError(e?.message || "JSON không hợp lệ."); }
  };

  const doFormat = () => {
    try {
      const parsed = JSON.parse(value);
      const sorted = sortKeysDeep(parsed);
      const pretty = JSON.stringify(sorted, null, 2);
      onChange(normalizeEscapes(pretty)); setLocalError(null);
    } catch (e: any) { setLocalError(e?.message || "Không thể format: JSON lỗi."); }
  };

  const doMinify = () => {
    try {
      const parsed = JSON.parse(value);
      const min = JSON.stringify(parsed);
      onChange(normalizeEscapes(min)); setLocalError(null);
    } catch (e: any) { setLocalError(e?.message || "Không thể minify: JSON lỗi."); }
  };

  // ===== Monaco (chỉ dark cho editor) =======================================
  const beforeMount: Parameters<typeof Editor>[0]["beforeMount"] = (monaco) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true, allowComments: true, trailingCommas: "ignore", enableSchemaRequest: false,
    });

    // Theme chỉ áp cho editor
    monaco.editor.defineTheme("vtm-code-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "e6edf3" },
        { token: "comment", foreground: "7d8590" },
        { token: "string", foreground: "98c379" },
        { token: "number", foreground: "d19a66" },
        { token: "keyword", foreground: "c678dd" },
        { token: "delimiter", foreground: "a6accd" },
        { token: "type.identifier", foreground: "56b6c2" },
        { token: "identifier", foreground: "e6edf3" },
        { token: "invalid", foreground: "ff6b6b" },
      ],
      colors: {
        "editor.background": "#0b0e14",
        "editor.foreground": "#e6edf3",
        "editor.lineHighlightBackground": "#11161e",
        "editor.inactiveSelectionBackground": "#17304d77",
        "editor.selectionBackground": "#17304d",
        "editorCursor.foreground": "#a6accd",
        "editorLineNumber.foreground": "#3b4455",
        "editorLineNumber.activeForeground": "#a6accd",
        "editorBracketMatch.background": "#1b2330",
        "editorBracketMatch.border": "#3b4455",
        "editorGutter.background": "#0b0e14",
        "scrollbarSlider.background": "#5b6a8077",
        "scrollbarSlider.hoverBackground": "#5b6a80aa",
        "scrollbarSlider.activeBackground": "#5b6a80cc",
      },
    });
  };

  const onMount: OnMount = (editor) => {
    const observer = new ResizeObserver(() => editor.layout());
    const domNode = editor.getDomNode(); if (domNode) observer.observe(domNode);
  };

  const codeTheme = editorDark
    ? "vtm-code-dark"
    : (muiTheme.palette.mode === "dark" ? "vs-dark" : "vs");

  const combinedError = useMemo(
    () => errorMessage || localError, [errorMessage, localError]
  );

  // ===== Render ==============================================================
  return (
    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardHeader
        title={title}
        action={
          <Stack direction="row" spacing={1}>
            <Button onClick={doValidate} disabled={disabled || !!loading}>Validate</Button>
            <Button onClick={doFormat} disabled={disabled || !!loading}>Format</Button>
            <Button onClick={doMinify} disabled={disabled || !!loading}>Minify</Button>
            {onSave && (
              <Button startIcon={<Save size={16} />} variant="contained"
                onClick={onSave} disabled={disabled || !!loading}>
                Save Spec
              </Button>
            )}
          </Stack>
        }
        sx={{
          position: "sticky", top: 0, zIndex: 1,
          bgcolor: "background.paper",
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
        }}
      />

      {loading && <LinearProgress />}

      {combinedError && (
        <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setLocalError(null)}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{combinedError}</pre>
        </Alert>
      )}

      <CardContent sx={{ pt: combinedError ? 0 : 2, flex: 1, minHeight: 0, display: "flex" }}>
        {/* Code block wrapper: chỉ vùng này tối khi editorDark=true */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            overflow: "hidden",
            ...(editorDark
              ? {
                  bgcolor: "#0b0e14",
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "rgba(0,0,0,0.4)",
                }
              : {}),
          }}
        >
          <Editor
            beforeMount={beforeMount}
            onMount={onMount}
            language="json"
            theme={codeTheme}
            value={value}
            onChange={(v) => onChange(v ?? "")}
            options={{
              readOnly: !!disabled,
              minimap: { enabled: false },
              wordWrap: "on",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              automaticLayout: true,
              folding: true,
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: "selection",
              bracketPairColorization: { enabled: true },
              guides: { indentation: true, bracketPairs: true },
            }}
            height="100%"
          />
        </Box>
      </CardContent>
    </Card>
  );
}
