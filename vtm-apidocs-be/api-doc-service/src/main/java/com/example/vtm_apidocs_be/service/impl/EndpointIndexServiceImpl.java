package com.example.vtm_apidocs_be.service.impl;

import com.example.vtm_apidocs_be.entity.ApiEndpointIndex;
import com.example.vtm_apidocs_be.repo.EndpointIndexRepository;
import com.example.vtm_apidocs_be.service.EndpointIndexService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem.HttpMethod;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class EndpointIndexServiceImpl implements EndpointIndexService {

    private final EndpointIndexRepository epRepo;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void reindex(Long docId, OpenAPI openAPI) {
        epRepo.deleteByApiDocumentId(docId);
        if (openAPI.getPaths() == null) return;

        openAPI.getPaths().forEach((path, item) -> {
            Map<HttpMethod, Operation> ops = item.readOperationsMap();
            ops.forEach((method, op) -> {
                ApiEndpointIndex idx = new ApiEndpointIndex();
                idx.setId(docId);
                idx.setMethod(ApiEndpointIndex.HttpMethod.valueOf(method.name()));
                idx.setPath(path);
                idx.setSummary(op.getSummary());
                idx.setTagsJson(writeJson(op.getTags()));
                idx.setDeprecated(Boolean.TRUE.equals(op.getDeprecated()));
                epRepo.save(idx);
            });
        });
    }

    private String writeJson(Object o) {
        try { return objectMapper.writeValueAsString(o); }
        catch (Exception e) { return "[]"; }
    }
}

