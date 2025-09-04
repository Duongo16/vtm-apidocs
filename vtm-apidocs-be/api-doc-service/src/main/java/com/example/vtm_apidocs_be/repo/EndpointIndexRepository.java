package com.example.vtm_apidocs_be.repo;

import com.example.vtm_apidocs_be.entity.ApiEndpointIndex;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EndpointIndexRepository extends JpaRepository<ApiEndpointIndex,Long> {
    List<ApiEndpointIndex> findByDocumentId(Long docId);
    List<ApiEndpointIndex> findByDocumentIdAndMethod(Long docId, ApiEndpointIndex.HttpMethod method);
    @Modifying
    @Transactional
    @Query("delete from ApiEndpointIndex e where e.document.id = :documentId")
    void deleteByApiDocumentId(Long documentId);
    void deleteByDocumentId(Long documentId);
}
