package com.example.vtm_apidocs_be.utils;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

@Component
public class DocTextExtractor {

    public static String extract(MultipartFile file) {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        try (InputStream in = file.getInputStream()) {
            if (name.endsWith(".docx")) {
                return extractDocx(in);
            } else if (name.endsWith(".doc")) {
                return extractDoc(in);
            } else {
                throw new IllegalArgumentException("Unsupported file type");
            }
        } catch (IOException e) {
            throw new RuntimeException("Read DOC/DOCX failed", e);
        }
    }

    private static String extractDocx(InputStream in) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (org.apache.poi.xwpf.usermodel.XWPFDocument doc = new org.apache.poi.xwpf.usermodel.XWPFDocument(in)) {
            for (var p : doc.getParagraphs()) {
                sb.append(p.getText()).append("\n");
            }
            // có thể đọc bảng:
            doc.getTables().forEach(t -> t.getRows().forEach(r -> {
                r.getTableCells().forEach(c -> sb.append(c.getText()).append("\t"));
                sb.append("\n");
            }));
        }
        return sb.toString();
    }

    private static String extractDoc(InputStream in) throws IOException {
        try (org.apache.poi.hwpf.HWPFDocument doc = new org.apache.poi.hwpf.HWPFDocument(in);
             org.apache.poi.hwpf.extractor.WordExtractor ex = new org.apache.poi.hwpf.extractor.WordExtractor(doc)) {
            return ex.getText();
        }
    }
}
