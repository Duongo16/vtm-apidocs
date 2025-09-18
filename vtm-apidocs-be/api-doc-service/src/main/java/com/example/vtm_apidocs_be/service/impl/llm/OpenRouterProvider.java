package com.example.vtm_apidocs_be.service.impl.llm;


import com.example.vtm_apidocs_be.dto.LlmGenerateRequest;
import com.example.vtm_apidocs_be.entity.LlmProviderType;
import com.example.vtm_apidocs_be.service.LlmProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
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
public class OpenRouterProvider implements LlmProviderService {

    private final WebClient.Builder webClientBuilder;

    // defaults (có thể override qua req.apiUrl/req.model)
    private static final String DEFAULT_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    private static final String DEFAULT_MODEL   = "meta-llama/llama-3.1-70b-instruct:free";

    @Override public LlmProviderType providerType() { return LlmProviderType.OPENROUTER; }

    @Override
    public String generateOpenApiFromPdf(LlmGenerateRequest req) {
        var apiUrl = (req.getApiUrl() == null || req.getApiUrl().isBlank()) ? DEFAULT_API_URL : req.getApiUrl();
        var model  = (req.getModel()  == null || req.getModel().isBlank())  ? DEFAULT_MODEL   : req.getModel();
        var apiKey = req.getApiKey(); // cần truyền riêng cho openrouter

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OpenRouter API key is required for this provider");
        }

        var dataUrl = "data:application/pdf;base64," + Base64.getEncoder().encodeToString(req.getPdfBytes());

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

        var messages = List.of(Map.of(
                "role", "user",
                "content", List.of(
                        Map.of("type", "text", "text", prompt),
                        Map.of("type", "file", "file", Map.of(
                                "filename", "document.pdf",
                                "file_data", dataUrl
                        ))
                )
        ));

        // optional plugins/temperature từ options
        Object plugins = req.getOptions() == null ? null : req.getOptions().get("plugins");
        Object temperature = req.getOptions() == null ? null : req.getOptions().getOrDefault("temperature", 0);

        var payload = new java.util.LinkedHashMap<String, Object>();
        payload.put("model", model);
        payload.put("messages", messages);
        if (plugins != null) payload.put("plugins", plugins);
        payload.put("temperature", temperature);

        var client = webClientBuilder
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

        Map<String, Object> resp = client.post()
                .uri(apiUrl)
                .bodyValue(payload)
                .retrieve()
                .onStatus(HttpStatusCode::isError, r ->
                        r.bodyToMono(String.class).flatMap(body ->
                                Mono.error(new RuntimeException("OpenRouter " + r.statusCode().value() + " -> " + body))
                        )
                )
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        @SuppressWarnings("unchecked")
        var choices = (List<Map<String, Object>>) resp.get("choices");
        var msg = (Map<String, Object>) choices.get(0).get("message");
        var content = (String) msg.get("content");
        return stripCodeFences(content);
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
