package com.example.vtm_apidocs_be.utils;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class LlmClient {
    private final WebClient.Builder webClientBuilder;
    private WebClient llmWebClient;

    @PostConstruct
    void init() {
        this.llmWebClient = webClientBuilder.build();
    }

    @Value("${llm.api.url}") private String apiUrl;
    @Value("${llm.api.key}") private String apiKey;
    @Value("${llm.model}")   private String model;

    public String generateOpenApiFromPdf(byte[] pdfBytes, String title, String version, String description) {
        String prompt = """
      Read the PDF and OUTPUT ONLY a valid OpenAPI 3.0.3 JSON object (no markdown).
      Include: openapi, info(title/version/description), tags, components(schemas), paths, security if mentioned.
      Title: %s
      Version: %s
      Description: %s
      """.formatted(title, version, description == null ? "" : description);

        String dataUrl = "data:application/pdf;base64," +
                java.util.Base64.getEncoder().encodeToString(pdfBytes);

        Map<String, Object> payload = Map.of(
                "model", model,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", List.of(
                                Map.of("type", "text", "text", prompt),
                                Map.of("type", "file",
                                        "file", Map.of(
                                                "filename", "document.pdf",
                                                "file_data", dataUrl
                                        ))
                        )
                ))
                // Structured JSON nếu model hỗ trợ:
//                "response_format", Map.of("type", "json_object"),
                // (Tùy chọn) plugin để điều khiển cách parse PDF:
//                "plugins", List.of(Map.of(
//                        "id", "file-parser",
//                        "pdf", Map.of("engine", "pdf-text") // hoặc "mistral-ocr" cho scan
//                )),
//                "temperature", 0.2
        );

        Map<?, ?> resp = llmWebClient.post()
                .uri(apiUrl)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        @SuppressWarnings("unchecked")
        var choices = (List<Map<String, Object>>) resp.get("choices");
        var msg = (Map<String, Object>) choices.get(0).get("message");
        return (String) msg.get("content");
    }
}


