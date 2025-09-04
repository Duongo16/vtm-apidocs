package com.example.vtm_apidocs_be.entity;

// ApiServer.java
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="api_server")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiServer {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="api_document_id")
    private ApiDocument document;

    private String url;
    private String description;
}
