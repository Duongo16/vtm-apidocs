package com.example.vtm_apidocs_be.web;

import com.example.vtm_apidocs_be.entity.ApiDocument;
import com.example.vtm_apidocs_be.entity.ApiEndpointIndex;
import com.example.vtm_apidocs_be.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/admin/docs")
@RequiredArgsConstructor
@Slf4j
public class SpecController {

    private final DocumentService documentService;

    // -------- Spec endpoints --------

    @GetMapping("/{id}/spec")
    public ResponseEntity<String> getSpec(@PathVariable Long id,
                                          @RequestParam(value = "frontend", required = false) String frontend) {
        var dto = documentService.getSpecForFrontend(id, frontend);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, dto.contentType() + ";charset=" + StandardCharsets.UTF_8)
                .body(dto.raw());
    }


    /** Cập nhật spec */
    @PutMapping("/{id}")
    public Map<String, Object> updateSpec(@PathVariable Long id, @RequestBody String specText) {
        documentService.updateSpec(id, specText);
        return Map.of("documentId", id, "status", "ok", "updatedAt", Instant.now().toString());
    }

    /** Upload file spec (.json/.yaml/.yml). */
    @PostMapping(value = "/{id}/upload", consumes = "multipart/form-data")
    public Map<String, Object> uploadSpec(@PathVariable Long id, @RequestPart("file") MultipartFile file) {
        documentService.uploadSpec(id, file);
        return Map.of("documentId", id, "filename", file.getOriginalFilename(), "status", "ok");
    }

    /** Reindex thủ công. */
    @PostMapping("/{id}/reindex")
    public Map<String, Object> reindex(@PathVariable Long id) {
        documentService.reindex(id);
        return Map.of("documentId", id, "status", "ok");
    }

    /** Publish/Unpublish/Archive tài liệu (status = draft|published|archived). Giữ tương thích tên endpoint cũ. */
    @PostMapping("/{id}/publish")
    public Map<String, Object> publish(@PathVariable Long id,
                                       @RequestParam(defaultValue = "published") String status) {
        var newStatus = documentService.updateStatus(id, status);
        return Map.of("documentId", id, "status", newStatus);
    }

    /** Cập nhật status tổng quát (nếu muốn dùng endpoint rõ ràng hơn). */
    @PutMapping("/{id}/status")
    public Map<String, Object> updateStatus(@PathVariable Long id, @RequestParam String status) {
        var newStatus = documentService.updateStatus(id, status);
        return Map.of("documentId", id, "status", newStatus);
    }

    /** Danh sách endpoint index (phục vụ dashboard/search). */
    @GetMapping("/{id}/endpoints")
    public List<ApiEndpointIndex> listEndpoints(@PathVariable Long id) {
        return documentService.listEndpoints(id);
    }

    /** Import nhanh spec JSON (tạo/sửa document theo slug) rồi auto index. */
    @PostMapping("/import")
    public Map<String, Object> importJson(@RequestBody String specJson,
                                          @RequestParam String name,
                                          @RequestParam String slug,
                                          @RequestParam(defaultValue = "1.0.0") String version,
                                          @RequestParam(required = false) String description) {
        ApiDocument doc = documentService.importJson(name, slug, version, description, specJson);
        return Map.of("documentId", doc.getId(), "slug", doc.getSlug(), "version", doc.getVersion(), "status", doc.getStatus().name());
    }

    // -------- Document management --------

    /** List + search theo q (name/slug/version/description), filter status (draft|published|archived|all). */
    @GetMapping
    public List<ApiDocument> listDocuments(@RequestParam(required = false) String q,
                                           @RequestParam(required = false, defaultValue = "all") String status) {
        System.out.println("check");
        return documentService.listDocuments(q, status);
    }

    /** Lấy chi tiết 1 document (bao gồm meta cơ bản). */
    @GetMapping("/{id}")
    public ApiDocument getDocument(@PathVariable Long id) {
        return documentService.listDocuments(null, "all")
                .stream().filter(d -> d.getId().equals(id)).findFirst()
                .orElseThrow();
    }

    /** Cập nhật meta: name / slug / version / description (body dạng JSON). */
    public record UpdateMetaReq(String name, String slug, String version, String description) {}

    @PutMapping("/{id}/meta")
    public ApiDocument updateMeta(@PathVariable Long id, @RequestBody UpdateMetaReq req) {
        return documentService.updateMeta(id, req.name(), req.slug(), req.version(), req.description());
    }

    /** Xóa document + index liên quan. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(@PathVariable Long id) {
        documentService.deleteDocument(id);
    }
}
