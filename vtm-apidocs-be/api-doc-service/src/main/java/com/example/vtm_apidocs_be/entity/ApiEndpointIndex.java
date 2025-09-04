package com.example.vtm_apidocs_be.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="api_endpoint_index",
        uniqueConstraints=@UniqueConstraint(name="uq_doc_method_path", columnNames={"api_document_id","method","path"})
)
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiEndpointIndex {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="api_document_id")
    private ApiDocument document;

    @Enumerated(EnumType.STRING)
    private HttpMethod method;

    private String path;
    private String operationId;
    private String summary;

    @Lob @Column(columnDefinition="longtext")
    private String tagsJson; // ["demo","customers"]

    private boolean deprecated;

    @Lob @Column(columnDefinition="longtext")
    private String securityJson;

    public enum HttpMethod { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS }
}
