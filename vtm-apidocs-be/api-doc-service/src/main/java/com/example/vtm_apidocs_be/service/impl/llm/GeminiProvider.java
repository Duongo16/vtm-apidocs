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
            You are an API architect. Read the provided PDF and OUTPUT ONLY a valid OpenAPI 3.0.3 JSON object (no markdown, no code fences, no prose).
            Include: openapi, info(title/version/description), tags, components(schemas), paths, and security if mentioned.
            Title: %s
            Version: %s
            Description: %s
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

