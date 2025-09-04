package com.example.vtm_apidocs_be.service.impl;

import com.example.vtm_apidocs_be.service.SpecParserService;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.parser.OpenAPIV3Parser;
import io.swagger.v3.parser.core.models.SwaggerParseResult;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

@Service
public class SpecParserServiceImpl implements SpecParserService {

    @Override
    public String detectContentType(String raw) {
        if (raw == null) return MediaType.TEXT_PLAIN_VALUE;
        var t = raw.trim();
        if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]")))
            return MediaType.APPLICATION_JSON_VALUE;
        return MediaType.TEXT_PLAIN_VALUE; // YAML/txt
    }

    @Override
    public OpenAPI parseOrThrow(String specText) {
        SwaggerParseResult res = new OpenAPIV3Parser().readContents(specText, null, null);
        if (res.getOpenAPI() == null) {
            var msg = (res.getMessages() == null || res.getMessages().isEmpty())
                    ? "Cannot parse OpenAPI spec"
                    : String.join("; ", res.getMessages());
            throw new IllegalArgumentException("Invalid OpenAPI: " + msg);
        }
        return res.getOpenAPI();
    }
}
