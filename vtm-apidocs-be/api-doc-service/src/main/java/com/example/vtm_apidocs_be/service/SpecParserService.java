package com.example.vtm_apidocs_be.service;

import io.swagger.v3.oas.models.OpenAPI;

public interface SpecParserService {
    String detectContentType(String raw);
    OpenAPI parseOrThrow(String specText);
}
