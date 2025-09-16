package com.example.vtm_apidocs_be.utils;


import com.example.vtm_apidocs_be.dto.LlmGenerateRequest;
import com.example.vtm_apidocs_be.entity.LlmProviderType;
import com.example.vtm_apidocs_be.service.LlmProviderService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class LlmService {

    private final Map<LlmProviderType, LlmProviderService> providerMap = new EnumMap<>(LlmProviderType.class);

    public LlmService(List<LlmProviderService> providers) {
        // Tự “factory hoá”: Map<ProviderType, Provider>
        for (LlmProviderService p : providers) {
            var type = p.providerType();
            if (providerMap.putIfAbsent(type, p) != null) {
                log.warn("Duplicate LLM provider for type {}", type);
            }
        }
        log.info("Registered LLM providers: {}", providerMap.keySet());
    }

    public String generateOpenApiFromPdf(LlmGenerateRequest req) {
        if (req.getProvider() == null) {
            throw new IllegalArgumentException("provider is required");
        }
        var provider = providerMap.get(req.getProvider());
        if (provider == null) {
            throw new IllegalArgumentException("No provider registered for: " + req.getProvider());
        }
        String content = provider.generateOpenApiFromPdf(req);
        if (content == null || content.isBlank()) {
            throw new RuntimeException("LLM returned empty content");
        }
        return content;
    }
}
