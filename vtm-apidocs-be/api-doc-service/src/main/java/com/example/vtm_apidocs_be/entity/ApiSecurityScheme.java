package com.example.vtm_apidocs_be.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="api_security_scheme")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiSecurityScheme {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="api_document_id")
    private ApiDocument document;

    private String name;

    @Enumerated(EnumType.STRING)
    private Type type; // apiKey,http,oauth2,openIdConnect

    @Enumerated(EnumType.STRING)
    private InLocation inLocation; // header,query,cookie

    private String keyName;
    private String scheme;
    private String bearerFormat;

    @Lob
    @Column(columnDefinition="longtext")
    private String flowsJson;

    @Lob
    private String description;

    public enum Type { apiKey, http, oauth2, openIdConnect }
    public enum InLocation { header, query, cookie }
}
