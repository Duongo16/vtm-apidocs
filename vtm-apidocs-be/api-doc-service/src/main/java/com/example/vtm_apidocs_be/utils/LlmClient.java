package com.example.vtm_apidocs_be.utils;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;
import io.netty.resolver.DefaultAddressResolverGroup;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class LlmClient {

    private final WebClient.Builder webClientBuilder;
    private WebClient llmWebClient;

    @Value("${llm.api.url}") private String apiUrl;
    @Value("${llm.api.key}") private String apiKey;
    @Value("${llm.model}")   private String model;
    @Value("${app.publicUrl:http://localhost:8081}") private String publicUrl;

    @PostConstruct
    void init() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OPENROUTER_API_KEY/llm.api.key is missing");
        }
        HttpClient httpClient = HttpClient.create()
                .resolver(DefaultAddressResolverGroup.INSTANCE);

        this.llmWebClient = webClientBuilder
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("HTTP-Referer", publicUrl)
                .defaultHeader("X-Title", "VTM-APIDocs (Dev)")
                .build();
    }

    public String generateOpenApiFromPdf(byte[] pdfBytes, String title, String version, String description) {
        String prompt = """
            You are an API architect. Read the provided PDF and OUTPUT ONLY a valid OpenAPI 3.0.3 JSON object (no markdown, no code fences, no prose).
            Include: openapi, info(title/version/description), tags, components(schemas), paths, and security if mentioned.
            Title: %s
            Version: %s
            Description: %s
        """.formatted(title, version, description == null ? "" : description);

        String dataUrl = "data:application/pdf;base64," +
                java.util.Base64.getEncoder().encodeToString(pdfBytes);

        // messages: text + file (base64 data URL) theo tài liệu PDF Inputs
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

        // Dùng plugin file-parser với engine 'pdf-text' để giữ FREE
        var plugins = List.of(Map.of(
                "id", "file-parser",
                "pdf", Map.of("engine", "pdf-text")  // hoặc "mistral-ocr" (trả phí) / "native"
        ));

        var payload = Map.of(
                "model", model,
                "messages", messages,
                "plugins", plugins,
                "temperature", 0
                // Tùy chọn: Structured outputs (chỉ hoạt động với một số model)
                // ,"response_format", Map.of("type", "json_object")
        );

        Map<String, Object> resp = llmWebClient.post()
                .uri(apiUrl)
                .bodyValue(payload)
                .retrieve()
                .onStatus(HttpStatusCode::isError, r ->
                        r.bodyToMono(String.class).flatMap(body ->
                                Mono.error(new RuntimeException("OpenRouter "
                                        + r.statusCode().value() + " -> " + body)))
                )
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        @SuppressWarnings("unchecked")
        var choices = (List<Map<String, Object>>) resp.get("choices");
        var msg = (Map<String, Object>) choices.get(0).get("message");
        var content = (String) msg.get("content");

        // Nếu model lỡ bọc ```json ... ``` thì cắt nhẹ cho sạch (an toàn nếu không có cũng OK)
        if (content != null && content.startsWith("```")) {
            int i = content.indexOf('{');
            int j = content.lastIndexOf('}');
            if (i >= 0 && j > i) content = content.substring(i, j + 1);
        }
        return content;
    }
}
