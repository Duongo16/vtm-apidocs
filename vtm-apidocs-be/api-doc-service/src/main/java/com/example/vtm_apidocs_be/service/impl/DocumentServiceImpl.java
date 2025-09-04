package com.example.vtm_apidocs_be.service.impl;

import com.example.vtm_apidocs_be.entity.ApiDocument;
import com.example.vtm_apidocs_be.entity.ApiEndpointIndex;
import com.example.vtm_apidocs_be.repo.DocumentRepository;
import com.example.vtm_apidocs_be.repo.EndpointIndexRepository;
import com.example.vtm_apidocs_be.service.DocumentService;
import com.example.vtm_apidocs_be.service.EndpointIndexService;
import com.example.vtm_apidocs_be.service.SpecParserService;
import com.example.vtm_apidocs_be.utils.DocTextExtractor;
import com.example.vtm_apidocs_be.utils.LlmClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository docRepo;
    private final EndpointIndexRepository epRepo;
    private final SpecParserService parserService;
    private final EndpointIndexService indexService;
    private final LlmClient llmClient;

    @Override
    @Transactional(readOnly = true)
    public SpecPayload getSpecForFrontend(Long docId, String frontendFlag) {
        ApiDocument doc = docRepo.findById(docId).orElseThrow();
        String raw = doc.getSpecJson();
        String contentType = parserService.detectContentType(raw);
        return new SpecPayload(raw, contentType);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApiEndpointIndex> listEndpoints(Long docId) {
        return epRepo.findByDocumentId(docId);
    }

    @Override
    @Transactional
    public void updateSpec(Long docId, String specText) {
        var openAPI = parserService.parseOrThrow(specText);
        ApiDocument doc = docRepo.findById(docId).orElseThrow();
        if (doc.getName() != null) doc.setName(doc.getName());
        if (doc.getSlug() != null) doc.setSlug(doc.getSlug());
        if (doc.getVersion() != null) doc.setVersion(doc.getVersion());
        if (doc.getDescription() != null) doc.setDescription(doc.getDescription());
        docRepo.save(doc);
        indexService.reindex(doc.getId(), openAPI);
    }

    @Override
    @Transactional
    public void uploadSpec(Long docId, MultipartFile file) {
        String raw;
        try {
            raw = new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot read file: " + e.getMessage(), e);
        }
        updateSpec(docId, raw);
    }

    @Override
    @Transactional
    public void reindex(Long docId) {
        ApiDocument doc = docRepo.findById(docId).orElseThrow();
        var openAPI = parserService.parseOrThrow(doc.getSpecJson());
        indexService.reindex(doc.getId(), openAPI);
    }

    @Override
    @Transactional
    public String updateStatus(Long docId, String status) {
        ApiDocument doc = docRepo.findById(docId).orElseThrow();

        try {
            ApiDocument.Status newStatus = ApiDocument.Status.valueOf(status.toLowerCase());
            doc.setStatus(newStatus);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status value: " + status
                    + ". Allowed: draft, published, archived");
        }

        docRepo.save(doc);
        return doc.getStatus().name();
    }

    @Override
    @Transactional
    public ApiDocument importJson(String name, String slug, String version, String description, String specJson) {
        var openAPI = parserService.parseOrThrow(specJson);
        ApiDocument doc = docRepo.findBySlug(slug).orElseGet(ApiDocument::new);
        doc.setName(name);
        doc.setSlug(slug);
        doc.setVersion(version);
        doc.setDescription(description);
        doc.setSpecJson(specJson);
        if (doc.getStatus() == null) doc.setStatus(ApiDocument.Status.draft);
        if (doc.getPublishedAt() == null) doc.setPublishedAt(Instant.now());
        doc = docRepo.save(doc);

        indexService.reindex(doc.getId(), openAPI);
        return doc;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApiDocument> listDocuments(String q, String status) {
        String qq = (q == null || q.isBlank()) ? null : q.toLowerCase().trim();

        ApiDocument.Status st = null;
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            try {
                // enum lowercase
                st = ApiDocument.Status.valueOf(status.toLowerCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid status filter: " + status
                        + ". Allowed: draft, published, archived, or 'all'.");
            }
        }

        return docRepo.search(qq, st);
    }

    @Override
    @Transactional
    public ApiDocument updateMeta(Long id, String name, String slug, String version, String description) {
        ApiDocument doc = docRepo.findById(id).orElseThrow();

        // Check trùng slug (bỏ qua chính nó)
        if (slug != null && !slug.isBlank() && docRepo.existsBySlugAndIdNot(slug, id)) {
            throw new IllegalArgumentException("Slug already exists: " + slug);
        }

        if (name != null) doc.setName(name);
        if (slug != null && !slug.isBlank()) doc.setSlug(slug);
        if (version != null) doc.setVersion(version);
        if (description != null) doc.setDescription(description);

        return docRepo.save(doc);
    }

    @Override
    @Transactional
    public void deleteDocument(Long id) {
        ApiDocument doc = docRepo.findById(id).orElseThrow();

        epRepo.deleteByDocumentId(id);
        docRepo.delete(doc);
    }

    @Override
    public ApiDocument importPdf(String name, String slug, String version, String description, byte[] pdfBytes) {
        // Gọi LLM đọc PDF → trả về OpenAPI JSON
        String draftJson = llmClient.generateOpenApiFromPdf(pdfBytes, name, version, description);

        String normalized = normalizeOpenApiJson(draftJson);
        var openAPI = parserService.parseOrThrow(normalized);

        ApiDocument doc = importJson(name, slug, version, description, normalized);
        indexService.reindex(doc.getId(), openAPI);
        return doc;
    }

    private String normalizeOpenApiJson(String json) {
        String j = json == null ? "" : json.trim();
        if (j.startsWith("```")) {
            j = j.replaceFirst("^```[a-zA-Z]*", "").replaceAll("```\\s*$", "").trim();
        }
        j = j.replace("\\/","/").replace("u002f","/").replace("\\u002f","/");
        int s = j.indexOf('{'), e = j.lastIndexOf('}');
        if (s >= 0 && e > s) j = j.substring(s, e + 1);
        return j;
    }

}


