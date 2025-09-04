import { apiDocsServiceApi } from "./api";

export type DocStatus = "draft" | "published" | "archived";

export type ApiDocumentSummary = {
  id: number;
  name: string;
  slug: string;
  version: string;
  status: DocStatus;
  description?: string;
  updatedAt?: string;
};

export async function listDocuments(q?: string, status?: DocStatus) {
  const { data } = await apiDocsServiceApi.get<ApiDocumentSummary[]>(
    "/admin/docs",
    {
      params: { q, status },
    }
  );
  return data;
}

export async function getSpec(id: number) {
  const { data } = await apiDocsServiceApi.get<string>(
    `/admin/docs/${id}/spec`,
    {
      params: { frontend: 1 },
      responseType: "text",
      transformResponse: [(d) => d], // trả nguyên văn (JSON/YAML) dạng string
    }
  );
  return data;
}

export async function updateSpec(id: number, specStr: string) {
  const isJson = (() => {
    try {
      JSON.parse(specStr);
      return true;
    } catch {
      return false;
    }
  })();

  const { data } = await apiDocsServiceApi.put<string>(
    `/admin/docs/${id}/spec`,
    specStr,
    {
      headers: { "Content-Type": isJson ? "application/json" : "text/plain" },
      responseType: "text",
      transformResponse: [(d) => d],
    }
  );
  return data;
}

export async function updateMeta(
  id: number,
  payload: { name: string; slug: string; version: string; description: string }
) {
  const { data } = await apiDocsServiceApi.put(`/admin/docs/${id}/meta`, payload);
  return data;
}

export async function publish(id: number, status: DocStatus) {
  const { data } = await apiDocsServiceApi.put<string>(
    `/admin/docs/${id}/status`,
    null,
    {
      params: { status },
      responseType: "text",
      transformResponse: [(d) => d],
    }
  );
  return data;
}

export async function reindex(id: number) {
  const { data } = await apiDocsServiceApi.post<string>(
    `/admin/docs/${id}/reindex`,
    null,
    {
      responseType: "text",
      transformResponse: [(d) => d],
    }
  );
  return data;
}

export async function removeDoc(id: number) {
  const { data } = await apiDocsServiceApi.delete<string>(`/admin/docs/${id}`, {
    responseType: "text",
    transformResponse: [(d) => d],
  });
  return data;
}

export async function importSpec(payload: {
  name: string;
  slug: string;
  version: string;
  description: string;
  spec: string;
}) {
  const form = new FormData();
  form.set("name", payload.name);
  form.set("slug", payload.slug);
  form.set("version", payload.version);
  if (payload.description) form.set("description", payload.description);
  form.set("spec", payload.spec);

  const { data } = await apiDocsServiceApi.post<{
    documentId: number;
    slug: string;
    version: string;
  }>("/admin/docs/import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
}

export async function importDoc(file: File, meta: {name:string; slug:string; version:string; description?:string}) {
  const form = new FormData();
  Object.entries(meta).forEach(([k,v]) => form.append(k, v ?? ""));
  form.append("file", file);
  const res = await fetch(`/admin/docs/import-doc`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ documentId: number; specText: string; status: string }>;
}

