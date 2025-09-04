package com.example.vtm_apidocs_be.entity;

// ApiDocument.java
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name="api_document")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiDocument {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="category_id")
    private ApiCategory category;

    private String name;
    private String slug;
    private String version;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Lob
    private String description;

    @Enumerated(EnumType.STRING)
    private SpecFormat specFormat;

    @Lob
    @Column(columnDefinition="longtext")
    private String specJson; // lưu dạng JSON string

    private String specHash;

    @Enumerated(EnumType.STRING)
    private Source source;

    private Instant publishedAt;

    public enum Status { draft, published, archived }
    public enum SpecFormat { json, yaml }
    public enum Source { manual, imported }
}
