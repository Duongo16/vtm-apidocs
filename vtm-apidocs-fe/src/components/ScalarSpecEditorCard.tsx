import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Card, CardHeader, CardContent, Stack, Button, Alert, CircularProgress } from "@mui/material";
import { mountApiReferenceEditable } from "@scalar/api-reference-editor";
import "@scalar/api-reference-editor/style.css";
import { updateSpec } from "../services/adminDocsService";

type Props = {
  docId: number | null;
  /** Spec từ BE (JSON string hoặc YAML string) */
  initialSpecText: string;
  loading?: boolean;
  disabled?: boolean;
  errorMessage?: string | null;
  onSaved?: () => void;
};

export default function ScalarSpecEditorCard({
  docId,
  initialSpecText,
  loading,
  disabled,
  errorMessage,
  onSaved,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null); // vỏ MUI do React quản
  const hostRef = useRef<HTMLDivElement | null>(null);       // node con độc lập để mount editor
  const apiRef = useRef<{ updateSpecValue?: (v: string) => void; destroy?: () => void } | null>(null);

  const [saving, setSaving] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [currentSpecText, setCurrentSpecText] = useState<string>(""); // text đang hiển thị trong editor
  const [currentMime, setCurrentMime] = useState<"application/json" | "application/yaml">("application/json");

  // --- Chuẩn hoá spec dựa theo vấn đề u002f ---
  function tryParseJson(s: string): any | null {
    try { return JSON.parse(s); } catch { return null; }
  }
  function normalizeFromObject(obj: any): string {
    const cloned = structuredClone(obj || {});
    // paths: "u002fapiu002ffiles" -> "/api/files"
    if (cloned.paths && typeof cloned.paths === "object") {
      renameKeysInMap(cloned.paths, (k) => k.replaceAll("u002f", "/"));
      for (const p of Object.keys(cloned.paths)) {
        const item = cloned.paths[p];
        for (const m of ["get","post","put","patch","delete","options","head","trace"]) {
          const op = item?.[m];
          if (!op) continue;
          if (op.requestBody?.content) renameKeysInMap(op.requestBody.content, fixMediaType);
          if (op.responses && typeof op.responses === "object") {
            for (const code of Object.keys(op.responses)) {
              const resp = op.responses[code];
              if (resp?.content) renameKeysInMap(resp.content, fixMediaType);
            }
          }
        }
      }
    }
    if (cloned.components?.requestBodies) {
      for (const k of Object.keys(cloned.components.requestBodies)) {
        const rb = cloned.components.requestBodies[k];
        if (rb?.content) renameKeysInMap(rb.content, fixMediaType);
      }
    }
    return JSON.stringify(cloned);
  }
  function normalizeTextInPlace(text: string): string {
    // Khi không parse được JSON (có thể là YAML), sửa chuỗi thô để hiển thị đúng hơn
    return text
      .replaceAll("u002f", "/")
      .replaceAll("applicationu002fjson", "application/json")
      .replaceAll("multipartu002fform-data", "multipart/form-data")
      .replaceAll("applicationu002foctet-stream", "application/octet-stream");
  }
  function renameKeysInMap(obj: Record<string, any>, mapKey: (k: string) => string) {
    if (!obj || typeof obj !== "object") return;
    for (const k of Object.keys(obj)) {
      const nk = mapKey(k);
      if (nk !== k) { obj[nk] = obj[k]; delete obj[k]; }
    }
  }
  function fixMediaType(s: string) { return s.replaceAll("u002f", "/"); }

  /** Chuẩn hoá spec đầu vào thành string + xác định mime hợp lý */
  function normalizeForEditor(rawText: string): { text: string; mime: "application/json" | "application/yaml" } {
    const obj = tryParseJson(rawText);
    if (obj) return { text: normalizeFromObject(obj), mime: "application/json" };
    // YAML hoặc JSON không hợp lệ -> giữ dạng text, sửa "u002f"
    return { text: normalizeTextInPlace(rawText), mime: "application/yaml" };
  }

  // 1) Mount/unmount theo docId (không remount khi chỉ đổi nội dung)
  useEffect(() => {
    if (!docId || !containerRef.current) return;

    setMountError(null);

    // host riêng để Vue quản lý hoàn toàn
    const host = document.createElement("div");
    host.style.height = "100%";
    hostRef.current = host;
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(host);

    // Chuẩn hoá và mount
    const { text, mime } = normalizeForEditor(initialSpecText);
    setCurrentSpecText(text);
    setCurrentMime(mime);

    try {
      // ✅ Theo tài liệu chính thức: truyền { content } + callback nhận string mới
      const api = mountApiReferenceEditable(
        host,
        { content: text },
        (v: string) => {
          // Không gọi updateSpecValue(v) ở đây để tránh vòng lặp vô hạn
          setCurrentSpecText(v);
          // Nếu muốn đoán mime động theo nội dung người dùng, có thể heuristic ở đây
        }
      );
      apiRef.current = api as any;
    } catch (e: any) {
      setMountError(e?.message ?? "Failed to mount editor");
    }

    // Cleanup
    return () => {
      try { apiRef.current?.destroy?.(); } catch {}
      apiRef.current = null;
      try { host.remove(); } catch {}
      hostRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // 2) Khi initialSpecText đổi nhưng docId giữ nguyên -> cập nhật editor bằng updateSpecValue
  useEffect(() => {
    if (!docId || !apiRef.current) return;
    const { text, mime } = normalizeForEditor(initialSpecText);
    setCurrentSpecText(text);
    setCurrentMime(mime);
    try { apiRef.current.updateSpecValue?.(text); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpecText]);

  // 3) Safety cleanup thêm (StrictMode)
  useLayoutEffect(() => {
    return () => {
      try { apiRef.current?.destroy?.(); } catch {}
      apiRef.current = null;
      try { hostRef.current?.remove(); } catch {}
      hostRef.current = null;
    };
  }, []);

  async function handleSave() {
    if (!docId) return;
    setSaving(true);
    try {
      // Gửi đúng MIME nếu suy đoán được, BE của bạn vẫn có heuristic nên có thể để undefined nếu muốn
      await updateSpec(docId, currentSpecText);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardHeader
        title="OpenAPI Editor (Scalar)"
        action={
          <Stack direction="row" gap={1} alignItems="center">
            {(loading || saving) && <CircularProgress size={18} />}
            <Button
              variant="contained"
              disabled={!docId || disabled || loading || saving || !!mountError}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </Stack>
        }
      />
      <CardContent sx={{ pt: 0, flex: 1, display: "flex", flexDirection: "column" }}>
        {errorMessage && <Alert severity="error" sx={{ mb: 1 }}>{errorMessage}</Alert>}
        {mountError && <Alert severity="error" sx={{ mb: 1 }}>{mountError}</Alert>}
        <div ref={containerRef} style={{ flex: 1, minHeight: 420 }} />
      </CardContent>
    </Card>
  );
}
