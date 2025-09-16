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
            You are an API architect. Read the provided PDF and OUTPUT ONLY a valid OpenAPI 3.0.3 JSON object (no markdown, no code fences, no prose).
            Include: openapi, info(title/version/description), tags, components(schemas), paths, and security if mentioned.
            Title: %s
            Version: %s
            Description: %s
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
