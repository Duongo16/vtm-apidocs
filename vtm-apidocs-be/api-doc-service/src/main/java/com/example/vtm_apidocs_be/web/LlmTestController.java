package com.example.vtm_apidocs_be.web;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/llm")
@RequiredArgsConstructor
public class LlmTestController {

    private final WebClient.Builder webClientBuilder;

    @Value("${llm.api.url}")  private String apiUrl;   // https://openrouter.ai/api/v1/chat/completions
    @Value("${llm.api.key}")  private String apiKey;   // Bearer ...
    @Value("${llm.model}")    private String model;    // ví dụ: openai/gpt-4o

    @GetMapping("/openrouter/echo")
    public Map<String, Object> echo() {
        var payload = Map.of(
                "model", model,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", List.of(Map.of("type", "text", "text", "Say 'pong' and nothing else."))
                )),
                "temperature", 0.0
        );

        var client = webClientBuilder.build();
        Map<?,?> resp = client.post()
                .uri(apiUrl)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        @SuppressWarnings("unchecked")
        var choices = (List<Map<String, Object>>) resp.get("choices");
        var msg = (Map<String, Object>) choices.get(0).get("message");
        var content = (String) msg.get("content");
        return Map.of("ok", true, "content", content, "raw", resp);
    }
}
