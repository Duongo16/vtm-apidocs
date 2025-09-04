package com.example.vtm_apidocs_be.service;

import com.example.vtm_apidocs_be.entity.ApiDocument;
import com.example.vtm_apidocs_be.entity.ApiEndpointIndex;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface DocumentService {

    record SpecPayload(String raw, String contentType) {}
    SpecPayload getSpecForFrontend(Long docId, String frontendFlag);
    List<ApiEndpointIndex> listEndpoints(Long docId);
    void updateSpec(Long docId, String specText);
    void uploadSpec(Long docId, MultipartFile file);
    void reindex(Long docId);
    String updateStatus(Long docId, String status);
    ApiDocument importJson(String name, String slug, String version, String description, String specJson);
    List<ApiDocument> listDocuments(String q, String status);
    ApiDocument updateMeta(Long id, String name, String slug, String version, String description);
    void deleteDocument(Long id);
    ApiDocument importPdf(String name, String slug, String version, String description, byte[] pdfBytes);
}
