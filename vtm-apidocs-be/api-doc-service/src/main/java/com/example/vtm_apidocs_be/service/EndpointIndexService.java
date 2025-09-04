package com.example.vtm_apidocs_be.service;

import io.swagger.v3.oas.models.OpenAPI;

public interface EndpointIndexService {
    void reindex(Long docId, OpenAPI openAPI);
}
