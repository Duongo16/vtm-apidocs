package com.example.vtm_apidocs_be.service.impl;

import com.example.vtm_apidocs_be.dto.LlmGenerateRequest;
import com.example.vtm_apidocs_be.entity.ApiDocument;
import com.example.vtm_apidocs_be.entity.ApiEndpointIndex;
import com.example.vtm_apidocs_be.entity.LlmProviderType;
import com.example.vtm_apidocs_be.repo.DocumentRepository;
import com.example.vtm_apidocs_be.repo.CategoryRepository;
import com.example.vtm_apidocs_be.repo.EndpointIndexRepository;
import com.example.vtm_apidocs_be.service.DocumentService;
import com.example.vtm_apidocs_be.service.EndpointIndexService;
import com.example.vtm_apidocs_be.service.SpecParserService;
import com.example.vtm_apidocs_be.utils.LlmClient;
import com.example.vtm_apidocs_be.utils.LlmService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import static org.apache.commons.lang3.StringUtils.firstNonBlank;

@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository docRepo;
    private final EndpointIndexRepository epRepo;
    private final CategoryRepository categoryRepo;
    private final SpecParserService parserService;
    private final EndpointIndexService indexService;
    private final LlmClient llmClient;
    private final LlmService llmService;

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
        ApiDocument doc = docRepo.findById(docId).orElseThrow();
        doc.setSpecJson(specText);
        docRepo.saveAndFlush(doc);
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
    public ApiDocument importJson(String name, String slug, String version, String description, String specJson, Long categoryId) {
        var openAPI = parserService.parseOrThrow(specJson);

        ApiDocument doc = new ApiDocument();
        doc.setName(name);
        doc.setSlug(slug);
        doc.setVersion(version);
        doc.setDescription(description);
        doc.setSpecJson(specJson);

        var cat = categoryRepo.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));
        doc.setCategory(cat);

        if (doc.getStatus() == null) doc.setStatus(ApiDocument.Status.draft);
        if (doc.getPublishedAt() == null) doc.setPublishedAt(Instant.now());

        doc = docRepo.save(doc);
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
    public ApiDocument importPdf(String name, String slug, String version, String description, Long categoryId, byte[] pdfBytes) {
        // Gọi LLM đọc PDF → trả về OpenAPI JSON
        String draftJson = llmClient.generateOpenApiFromPdf(pdfBytes, name, version, description);

        String normalized = normalizeOpenApiJson(draftJson);
        var openAPI = parserService.parseOrThrow(normalized);

        ApiDocument doc = importJson(name, slug, version, description, normalized, categoryId);
        return doc;
    }

    @Override
    public ApiDocument importPdf(String name, String slug, String version, String description, Long categoryId, byte[] pdfBytes, LlmProviderType provider) {

        var requestBuilder = LlmGenerateRequest.builder()
                .provider(provider)
                .pdfBytes(pdfBytes)
                .title(name)
                .version(version)
                .description(description);

        switch (provider) {
            case OPENROUTER -> {
                requestBuilder
                        .apiUrl(firstNonBlank(openRouterApiUrl, "https://openrouter.ai/api/v1/chat/completions"))
                        .model(firstNonBlank(openRouterModel, "meta-llama/llama-3.1-70b-instruct:free"))
                        .apiKey(required(openRouterApiKey, "OpenRouter API key (llm.api.key) is required"));
            }
            case OPENAI -> {
                requestBuilder
                        .apiUrl(firstNonBlank(openAiApiUrl, "https://api.openai.com/v1/chat/completions"))
                        .model(required(openAiModel, "OpenAI model (openai.model) is required"))
                        .apiKey(required(openAiApiKey, "OpenAI API key (openai.api.key) is required"));
            }
            case GEMINI -> {
                requestBuilder
                        .model(firstNonBlank(geminiModel, "gemini-1.5-flash"))
                        .apiKey(required(geminiApiKey, "Gemini API key (gemini.api.key) is required"));
            }
        }

        String draftJson = llmService.generateOpenApiFromPdf(requestBuilder.build());

        String normalized = normalizeOpenApiJson(draftJson);
        var openAPI = parserService.parseOrThrow(normalized);

        ApiDocument doc = importJson(name, slug, version, description, normalized, categoryId);
        return doc;
    }

    private String normalizeOpenApiJson(String json) {
        String j = json == null ? "" : json.trim();
        if (j.startsWith("```")) {
            j = j.replaceFirst("^```[a-zA-Z]*", "").replaceAll("```\\s*$", "").trim();
        }
        j = j.replace("\\/", "/").replace("u002f", "/").replace("\\u002f", "/");
        int s = j.indexOf('{'), e = j.lastIndexOf('}');
        if (s >= 0 && e > s) j = j.substring(s, e + 1);
        return j;
    }

    @Value("${llm.api.url:https://openrouter.ai/api/v1/chat/completions}")
    private String openRouterApiUrl;

    @Value("${llm.api.key:}")
    private String openRouterApiKey;

    @Value("${llm.model:meta-llama/llama-3.1-70b-instruct:free}")
    private String openRouterModel;

    @Value("${openai.api.url:https://api.openai.com/v1/chat/completions}")
    private String openAiApiUrl;

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String openAiModel;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String geminiModel;

    private static String firstNonBlank(String a, String fallback) {
        return (a != null && !a.isBlank()) ? a : fallback;
    }

    private static String required(String v, String msgIfMissing) {
        if (v == null || v.isBlank()) throw new IllegalStateException(msgIfMissing);
        return v;
    }

}


