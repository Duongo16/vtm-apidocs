package com.example.vtm_apidocs_be.service;

import com.example.vtm_apidocs_be.dto.LlmGenerateRequest;
import com.example.vtm_apidocs_be.entity.LlmProviderType;

public interface LlmProviderService {
    LlmProviderType providerType();
    String generateOpenApiFromPdf(LlmGenerateRequest req);
}
