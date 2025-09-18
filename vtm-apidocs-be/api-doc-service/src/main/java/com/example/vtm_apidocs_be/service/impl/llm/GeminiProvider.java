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

    // v1beta generateContent
    private static final String DEFAULT_API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    private static final String DEFAULT_MODEL            = "gemini-1.5-flash";

    @Override public LlmProviderType providerType() { return LlmProviderType.GEMINI; }
    @Override
    public String generateOpenApiFromPdf(LlmGenerateRequest req) {
        var model  = (req.getModel()  == null || req.getModel().isBlank())  ? DEFAULT_MODEL : req.getModel();
        var apiKey = req.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key is required for this provider");
        }

        var apiUrl = String.format(DEFAULT_API_URL_TEMPLATE, model, apiKey);

        var prompt = """
                You are a senior API architect and meticulous OpenAPI author.
                
                TASK
                - Read the provided PDF specification and OUTPUT ONLY a valid OpenAPI 3.0.3 JSON object.
                - No markdown, no code fences, no comments, no prose. JSON only.
                
                MUST-HAVES (in this order)
                - openapi (must be "3.0.3")
                - info { title, version, description }
                - servers (deduce base URLs from the PDF; if multiple environments exist, include them all)
                - tags (group operations logically by domain/module as described in the PDF)
                - components {
                    securitySchemes (derive from PDF: apiKey, http bearer, OAuth2, etc.),
                    schemas (strong typing, formats, enums, examples, required),
                    parameters (reusable),
                    requestBodies (reusable),
                    responses (reusable, including a generic Error)
                  }
                - security (top-level if the PDF specifies default security)
                - paths (every operation with correct parameters/requestBody/responses)
                
                STRICT OUTPUT RULES
                - Keys in "paths" MUST start with a forward slash like "/api/files", NEVER as escaped unicode (do NOT emit "u002f").
                - Media types MUST be valid IANA types (e.g., "application/json", "multipart/form-data", "application/xml").
                  NEVER emit "applicationu002fjson" or "multipartu002fform-data".
                - For file uploads use:
                  requestBody.content["multipart/form-data"].schema.properties.file = { "type":"string","format":"binary" }.
                - For binary downloads use:
                  responses[200].content["application/octet-stream"].schema = { "type":"string","format":"binary" }.
                - Use proper locations for parameters: "path", "query", "header", "cookie".
                - Path params MUST be marked required:true and appear in the actual path template.
                - Use response codes from the PDF. If a default error format exists, add it to 4xx/5xx responses via $ref.
                - Include realistic "example" values when the PDF provides them (or when they are clearly implied).
                - Use consistent naming style from the PDF (camelCase vs snake_case). Do NOT invent fields not present in the PDF.
                
                EXTRACTION & MODELING GUIDELINES
                - Derive all endpoints, HTTP methods, path templates, query/header fields, and bodies from the PDF.
                - If transport is XML, model with "application/xml" and include basic xml annotations in schemas (e.g., {"xml":{"name":"xml"}}) when structure is envelope-like.
                - If the PDF specifies a gateway endpoint with a "service" discriminator, model using oneOf + discriminator.
                - For auth:
                  * API key in header: securitySchemes.api_key = {"type":"apiKey","in":"header","name":"X-API-Key"} (adjust name from PDF)
                  * Bearer JWT: {"type":"http","scheme":"bearer","bearerFormat":"JWT"}
                  * OAuth2: define flows and scopes exactly as given.
                - Add pagination parameters if described (e.g., page/size or cursor/limit).
                - Add enums and value constraints (pattern/minLength/maxLength/min/max, format: "date-time", "uuid", "int64", etc.) wherever specified.
                
                VALIDATION REQUIREMENTS
                - The JSON MUST be valid OpenAPI 3.0.3 (no trailing commas, no duplicate keys, all $ref resolve).
                - Keep the document concise: only include endpoints and fields that the PDF describes or clearly implies.
                - If a piece of information is truly missing, omit it rather than guessing.
                
                INPUT METADATA (use these values verbatim)
                Title: %s
                Version: %s
                Description: %s
                
                OUTPUT
                - Output ONLY the OpenAPI JSON object. Nothing else.
                
            """.formatted(req.getTitle(), req.getVersion(), req.getDescription() == null ? "" : req.getDescription());

        var b64 = Base64.getEncoder().encodeToString(req.getPdfBytes());

        var payload = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt),
                                Map.of("inlineData", Map.of(
                                        "mimeType", "application/pdf",
                                        "data", b64
                                ))
                        ))
                )
        );

        var client = webClientBuilder
                .defaultHeader("X-Goog-Api-Key", apiKey)
                .build();

        Map<String, Object> resp = client.post()
                .uri(apiUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .onStatus(HttpStatusCode::isError, r ->
                        r.bodyToMono(String.class).flatMap(body ->
                                Mono.error(new RuntimeException("Gemini " + r.statusCode().value() + " -> " + body))
                        )
                )
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        // parse: candidates[0].content.parts[*].text
        @SuppressWarnings("unchecked")
        var candidates = (List<Map<String, Object>>) resp.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new RuntimeException("Gemini returned no candidates");
        }
        @SuppressWarnings("unchecked")
        var content = (Map<String, Object>) candidates.get(0).get("content");
        @SuppressWarnings("unchecked")
        var parts = (List<Map<String, Object>>) content.get("parts");
        var sb = new StringBuilder();
        for (var p : parts) {
            var t = (String) p.get("text");
            if (t != null) sb.append(t);
        }
        return stripCodeFences(sb.toString());
    }

    private String stripCodeFences(String content) {
        if (content == null) return null;
        if (content.startsWith("```")) {
            int i = content.indexOf('{');
            int j = content.lastIndexOf('}');
            if (i >= 0 && j > i) return content.substring(i, j + 1);
        }
        return content;
    }
}

