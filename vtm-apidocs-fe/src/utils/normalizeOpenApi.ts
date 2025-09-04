export function normalizeOpenApi(raw: any) {
  const cloned = structuredClone(raw);

  // 1) Fix "paths" key: "u002fapiu002ffiles" -> "/api/files"
  if (cloned.paths && typeof cloned.paths === "object") {
    renameKeysInMap(cloned.paths, k => k.replaceAll("u002f", "/"));
    // Đồng thời fix các media types dưới mỗi operation->responses[*]->content và requestBody->content
    for (const pathKey of Object.keys(cloned.paths)) {
      const pathItem = cloned.paths[pathKey];
      if (!pathItem) continue;
      for (const method of ["get","post","put","patch","delete","options","head","trace"]) {
        const op = pathItem[method];
        if (!op) continue;

        // requestBody.content
        if (op.requestBody?.content) {
          renameKeysInMap(op.requestBody.content, fixMediaType);
        }
        // responses[*].content
        if (op.responses && typeof op.responses === "object") {
          for (const code of Object.keys(op.responses)) {
            const resp = op.responses[code];
            if (resp?.content) renameKeysInMap(resp.content, fixMediaType);
          }
        }
      }
    }
  }

  // 2) Fix top-level components?.requestBodies?.[*]?.content nếu có
  if (cloned.components?.requestBodies) {
    for (const rbKey of Object.keys(cloned.components.requestBodies)) {
      const rb = cloned.components.requestBodies[rbKey];
      if (rb?.content) renameKeysInMap(rb.content, fixMediaType);
    }
  }

  return cloned;
}

function renameKeysInMap(obj: Record<string, any>, mapKey: (k: string) => string) {
  for (const k of Object.keys(obj)) {
    const newKey = mapKey(k);
    if (newKey !== k) {
      obj[newKey] = obj[k];
      delete obj[k];
    }
  }
}

function fixMediaType(mt: string) {
  // "multipartu002fform-data" -> "multipart/form-data", "applicationu002fjson" -> "application/json"
  return mt.replaceAll("u002f", "/");
}
