package com.example.vtm_apidocs_be.web;

import com.example.vtm_apidocs_be.entity.ApiDocument;
import com.example.vtm_apidocs_be.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/admin/docs")
@RequiredArgsConstructor
public class ImportController {

    private final DocumentService documentService;

    @PostMapping(value = "/import-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> importPdf(
            @RequestParam String name,
            @RequestParam String slug,
            @RequestParam String version,
            @RequestParam(required = false) String description,
            @RequestParam("file") MultipartFile file
    ) throws Exception {
        String filename = (file.getOriginalFilename() == null ? "" : file.getOriginalFilename()).toLowerCase();
        if (!filename.endsWith(".pdf")) {
            throw new IllegalArgumentException("Only PDF is accepted in this route");
        }
        ApiDocument doc = documentService.importPdf(name, slug, version, description, file.getBytes());

        var dto = documentService.getSpecForFrontend(doc.getId(), "1");
        return Map.of("documentId", doc.getId(), "status", "ok", "specText", dto.raw());
    }
}

