
package com.example.vtm_apidocs_be.dto;
import com.example.vtm_apidocs_be.entity.LlmProviderType;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class LlmGenerateRequest {
    private LlmProviderType provider;
    private String apiUrl;
    private String apiKey;
    private String model;
    private byte[] pdfBytes;
    private String title;
    private String version;
    private String description;
    private Map<String, Object> options;
}


