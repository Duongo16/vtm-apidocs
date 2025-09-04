package com.example.vtm_apidocs_be.web;

import io.netty.resolver.DefaultAddressResolverGroup;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/llm")
@RequiredArgsConstructor
public class LlmTestController {

    private final WebClient.Builder webClientBuilder;

    @Value("${llm.api.url}")  private String apiUrl;   // https://openrouter.ai/api/v1/chat/completions
    @Value("${llm.api.key}")  private String apiKey;   // Bearer ...
    @Value("${llm.model}")    private String model;    // ví dụ: deepseek/deepseek-chat-v3.1:free
    @Value("${app.publicUrl:http://localhost:8081}") private String publicUrl; // để set Referer

    private WebClient orClient() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OPENROUTER_API_KEY/llm.api.key is missing");
        }

        // Ép Netty dùng JDK resolver (ổn định, tránh lỗi AAAA DNS)
        HttpClient httpClient = HttpClient.create()
                .resolver(DefaultAddressResolverGroup.INSTANCE);

        return webClientBuilder
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("HTTP-Referer", publicUrl)
                .defaultHeader("X-Title", "VTM-APIDocs (Dev)")
                .build();
    }

    @GetMapping("/openrouter/echo")
    public Map<String, Object> echo() {
        // content = string (đơn giản, tương thích rộng)
        var payload = Map.of(
                "model", model,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", "Say 'Việt Nam muôn năm' and nothing else."
                )),
                "temperature", 0
        );

        Map<String, Object> resp = orClient().post()
                .uri(apiUrl)
                .bodyValue(payload)
                .retrieve()
                .onStatus(
                        HttpStatusCode::isError,
                        r -> r.bodyToMono(String.class).flatMap(body ->
                                Mono.error(new RuntimeException("OpenRouter "
                                        + r.statusCode().value() + " -> " + body)))
                )
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        @SuppressWarnings("unchecked")
        var choices = (List<Map<String, Object>>) resp.get("choices");
        var msg = (Map<String, Object>) choices.get(0).get("message");
        var content = (String) msg.get("content");
        return Map.of("ok", true, "content", content, "raw", resp);
    }
}
