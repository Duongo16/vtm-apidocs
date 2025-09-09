package com.example.vtm_apidocs_be.web;

import com.example.vtm_apidocs_be.entity.ApiDocument;
import com.example.vtm_apidocs_be.service.DocumentService;
import com.example.vtm_apidocs_be.utils.LlmClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/admin/docs")
@RequiredArgsConstructor
public class ImportController {

    private final DocumentService documentService;
    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;

    @PostMapping(value = "/import-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> importPdf(@RequestParam String name,
                                         @RequestParam String slug,
                                         @RequestParam String version,
                                         @RequestParam(required = false) String description,
                                         @RequestParam(required = false) Long categoryId,
                                         @RequestParam("file") MultipartFile file) throws Exception {
        String filename = (file.getOriginalFilename() == null ? "" : file.getOriginalFilename()).toLowerCase();
        if (!filename.endsWith(".pdf")) throw new IllegalArgumentException("Only PDF is accepted in this route");

        ApiDocument doc = documentService.importPdf(name, slug, version, description, categoryId, file.getBytes());

        var dto = documentService.getSpecForFrontend(doc.getId(), "1");
        return Map.of("documentId", doc.getId(), "status", "ok", "specText", dto.raw(),
                "categoryId", doc.getCategory() != null ? doc.getCategory().getId() : null);
    }



    @PostMapping(
            value = "/generate-openapi",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> generateOpenApi(
            @RequestPart("file") MultipartFile file,
            @RequestParam(defaultValue = "Untitled API") String title,
            @RequestParam(defaultValue = "1.0.0") String version,
            @RequestParam(required = false) String description
    ) throws Exception {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing PDF file"));
        }
        String ct = file.getContentType();
        if (ct != null && !ct.toLowerCase().contains("pdf")) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must be a PDF"));
        }

        byte[] pdfBytes = file.getBytes();
        String json = llmClient.generateOpenApiFromPdf(pdfBytes, title, version, description);

        try {
            Map<?, ?> parsed = objectMapper.readValue(json, Map.class);
            return ResponseEntity.ok(parsed);
        } catch (JsonProcessingException ex) {
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(json);
        }
    }
}

