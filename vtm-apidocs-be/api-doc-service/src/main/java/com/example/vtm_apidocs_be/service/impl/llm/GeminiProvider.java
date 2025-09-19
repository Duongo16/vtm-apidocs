package com.example.vtm_apidocs_be.service.impl.llm;

import com.example.vtm_apidocs_be.dto.LlmGenerateRequest;
import com.example.vtm_apidocs_be.entity.LlmProviderType;
import com.example.vtm_apidocs_be.service.LlmProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class GeminiProvider implements LlmProviderService {

    private final WebClient.Builder webClientBuilder;

    // Models & endpoints
    private static final String DEFAULT_MODEL   = "gemini-1.5-flash";
    private static final String GEN_URL_TPL     = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    private static final String UPLOAD_URL      = "https://generativelanguage.googleapis.com/upload/v1beta/files";

    // Switch inline vs files API at 20MB
    private static final long INLINE_LIMIT_BYTES = 20L * 1024 * 1024; // 20 MB

    @Override
    public LlmProviderType providerType() {
        return LlmProviderType.GEMINI;
    }

    @Override
    public String generateOpenApiFromPdf(LlmGenerateRequest req) {
        String model  = (req.getModel() == null || req.getModel().isBlank()) ? DEFAULT_MODEL : req.getModel();
        String apiKey = req.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key is required for this provider");
        }
        String apiUrl = GEN_URL_TPL.formatted(model, apiKey);

        // Prompt (kept from your original version)
        String prompt = """
        You are a senior API architect and meticulous OpenAPI author.
        
        TASK

        * Read the provided PDF specification and OUTPUT ONLY a valid OpenAPI 3.0.3 JSON object.
        * No markdown, no code fences, no comments, no prose. JSON only.

        NON-ALTERATION GUARANTEE

        * DO NOT rename, translate, reformat, or invent any API names, section headings, operationIds, schema/field names, parameter names, tag names, enum values, or error codes. Use exactly the original names, spelling, casing, and language from the PDF.
        * Preserve the original casing style (camelCase, snake\\_case, UPPER\\_SNAKE, etc.) exactly as in the PDF for every identifier.
        * If the PDF shows duplicate or repeated sections (e.g., multiple occurrences of the same security scheme or component), MERGE by exact name; DO NOT create duplicates or alternate names.

        MUST-HAVES (in this order)

        * openapi (must be "3.0.3")
        * info { title, version, description }  // Use the provided metadata verbatim.
        * servers (deduce base URLs from the PDF; if multiple environments exist, include them all exactly as named)
        * tags (group operations logically by domain/module exactly as described/named in the PDF)
        * components {
          securitySchemes (derive only from the PDF: apiKey, http bearer, OAuth2, etc. Appear exactly once; merge duplicates by name),
          schemas (strong typing, formats, enums, examples, required; field names exactly as in PDF),
          parameters (reusable; names and locations exactly as in PDF),
          requestBodies (reusable; names exactly as in PDF),
          responses (reusable, including a generic Error if defined in the PDF)
          }
        * security (top-level only if the PDF specifies a default security requirement; use exact scheme names from components)
        * paths (every operation with correct method, parameters, requestBody, and responses exactly as in the PDF)

        STRICT OUTPUT RULES

        * Keys in "paths" MUST start with a forward slash like "/api/files"; NEVER emit escaped unicode (do NOT emit "u002f").
        * Media types MUST be valid IANA types (e.g., "application/json", "multipart/form-data", "application/xml"). NEVER emit "applicationu002fjson" or "multipartu002fform-data".
        * For file uploads use:
          requestBody.content\\["multipart/form-data"].schema.properties.file = { "type":"string","format":"binary" }.
        * For binary downloads use:
          responses\\["200"].content\\["application/octet-stream"].schema = { "type":"string","format":"binary" }.
        * Use proper parameter locations: "path", "query", "header", "cookie".
        * Path params MUST be required\\:true and appear in the actual path template.
        * Use response codes exactly as in the PDF. If a default/standardized error format exists in the PDF, reference it in 4xx/5xx with \\$ref.
        * Include realistic "example" values when the PDF provides them (or when clearly implied), without renaming fields.
        * Use the PDF’s exact naming style everywhere. Do NOT introduce fields or sections not present in the PDF.

        EXTRACTION & MODELING GUIDELINES

        * Derive all endpoints, HTTP methods, path templates, query/header fields, and bodies strictly from the PDF.
        * If transport is XML, model with "application/xml" and include minimal xml annotations in schemas (e.g., {"xml":{"name":"Root"}}) when an envelope structure is shown, using exact element names from the PDF.
        * If the PDF specifies a gateway endpoint with a "service" discriminator, model using oneOf + discriminator, using exact mapping keys as given.
        * Auth:

          * Header API key: {"type":"apiKey","in":"header","name":"<exact name from PDF>"}.
          * Bearer JWT: {"type":"http","scheme":"bearer","bearerFormat":"JWT"} if and only if the PDF specifies it.
          * OAuth2: define flows, auth URLs, token URLs, and scopes exactly as given (no additions).
        * Add pagination parameters only if described (e.g., page/size or cursor/limit) and name them exactly as in the PDF.
        * Add enums and constraints (pattern/minLength/maxLength/min/max, formats like "date-time", "uuid", "int64") only when specified.

        VALIDATION REQUIREMENTS

        * The JSON MUST be valid OpenAPI 3.0.3: no trailing commas, no duplicate keys, all \\$ref resolve, a single "components" object with a single "securitySchemes" object (merged by exact names; no duplicates).
        * Keep the document concise: include only endpoints/fields explicitly present in the PDF or clearly implied by its examples/tables. If a piece of information is missing, omit it rather than guessing.

        INPUT METADATA (use these values verbatim)
        Title: %s
        Version: %s
        Description: %s

        OUTPUT
        * Output ONLY the OpenAPI JSON object. Nothing else.
        """.formatted(req.getTitle(), req.getVersion(), req.getDescription() == null ? "" : req.getDescription());

        String mime = "application/pdf";
        Map<String, Object> contentsPart;

        if (req.getPdfBytes() != null && req.getPdfBytes().length > INLINE_LIMIT_BYTES) {
            // Large file → Files API
            Map<String, Object> uploaded = geminiUpload(req.getPdfBytes(), apiKey,
                    req.getTitle() == null ? "document.pdf" : req.getTitle(), mime);

            @SuppressWarnings("unchecked")
            Map<String, Object> file = (Map<String, Object>) uploaded.get("file");
            if (file == null || file.get("uri") == null) {
                throw new RuntimeException("Gemini upload failed: missing file.uri");
            }
            String fileUri = (String) file.get("uri");

            contentsPart = Map.of("parts", List.of(
                    Map.of("text", prompt),
                    Map.of("file_data", Map.of(
                            "mime_type", mime,
                            "file_uri", fileUri
                    ))
            ));
        } else {
            // Small file → inline base64
            String b64 = Base64.getEncoder().encodeToString(req.getPdfBytes());
            contentsPart = Map.of("parts", List.of(
                    Map.of("text", prompt),
                    Map.of("inlineData", Map.of(
                            "mimeType", mime,
                            "data", b64
                    ))
            ));
        }

        Map<String, Object> payload = Map.of("contents", List.of(contentsPart));

        WebClient client = webClientBuilder
                .defaultHeader("X-Goog-Api-Key", apiKey)
                .build();

        Map<String, Object> resp = client.post()
                .uri(apiUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .onStatus(HttpStatusCode::isError, r ->
                        r.bodyToMono(String.class)
                                .flatMap(body -> Mono.error(new RuntimeException("Gemini " + r.statusCode().value() + " -> " + body)))
                )
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        String json = stripCodeFences(extractText(resp));
        if (json == null || json.isBlank()) {
            throw new RuntimeException("Gemini returned empty content");
        }
        return json;
    }

    /**
     * Gemini Files API: resumable upload (start → upload+finalize) and return file metadata JSON.
     * Response contains "file": { "uri": "files/..." , ... }
     */
    private Map<String, Object> geminiUpload(byte[] data, String apiKey, String displayName, String mime) {
        WebClient client = webClientBuilder.build();

        // Start session (returns X-Goog-Upload-URL in headers)
        var startResp = client.post()
                .uri(UPLOAD_URL + "?key=" + apiKey)
                .header("X-Goog-Upload-Protocol", "resumable")
                .header("X-Goog-Upload-Command", "start")
                .header("X-Goog-Upload-Header-Content-Length", String.valueOf(data.length))
                .header("X-Goog-Upload-Header-Content-Type", mime)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("file", Map.of("display_name", displayName)))
                .exchangeToMono(r -> r.toBodilessEntity())
                .block();

        String uploadUrl = startResp != null ? startResp.getHeaders().getFirst("X-Goog-Upload-URL") : null;
        if (uploadUrl == null || uploadUrl.isBlank()) {
            throw new RuntimeException("No X-Goog-Upload-URL from Gemini");
        }

        // Upload bytes & finalize
        return client.post()
                .uri(uploadUrl)
                .header("X-Goog-Upload-Offset", "0")
                .header("X-Goog-Upload-Command", "upload, finalize")
                .contentType(MediaType.parseMediaType(mime))
                .bodyValue(data)
                .retrieve()
                .onStatus(HttpStatusCode::isError, r ->
                        r.bodyToMono(String.class)
                                .flatMap(body -> Mono.error(new RuntimeException("Gemini upload " + r.statusCode().value() + " -> " + body)))
                )
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();
    }

    /**
     * Extracts concatenated text from candidates[0].content.parts[*].text
     */
    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> resp) {
        if (resp == null) return null;
        var candidates = (List<Map<String, Object>>) resp.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new RuntimeException("Gemini returned no candidates");
        }
        var content = (Map<String, Object>) candidates.get(0).get("content");
        var parts = (List<Map<String, Object>>) content.get("parts");
        var sb = new StringBuilder();
        if (parts != null) {
            for (var p : parts) {
                var t = (String) p.get("text");
                if (t != null) sb.append(t);
            }
        }
        return sb.toString();
    }

    private String stripCodeFences(String s) {
        if (s == null) return null;
        if (s.startsWith("```")) {
            int i = s.indexOf('{');
            int j = s.lastIndexOf('}');
            if (i >= 0 && j > i) return s.substring(i, j + 1);
        }
        return s;
    }
}
