package com.example.vtm_apidocs_be.repo;

import com.example.vtm_apidocs_be.entity.ApiDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<ApiDocument, Long> {

    Optional<ApiDocument> findBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    @Query("""
           select d
           from ApiDocument d
           """)
    List<ApiDocument> search(@Param("q") String q, @Param("status") ApiDocument.Status status);
}
