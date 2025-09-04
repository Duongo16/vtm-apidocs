package com.example.vtm_apidocs_be.web;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/admin/llm")
@RequiredArgsConstructor
public class LlmHealthController {

    private final WebClient.Builder webClientBuilder;

    @Value("${llm.api.key}") private String apiKey;

    @GetMapping(value = "/openrouter/key", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<String> keyInfo() {
        WebClient client = webClientBuilder.build();
        return client.get()
                .uri("https://openrouter.ai/api/v1/key")
                .header("Authorization", "Bearer " + apiKey)
                .retrieve()
                .bodyToMono(String.class);
    }
}
