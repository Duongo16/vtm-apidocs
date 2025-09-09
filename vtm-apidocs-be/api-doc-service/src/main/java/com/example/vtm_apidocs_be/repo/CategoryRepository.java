package com.example.vtm_apidocs_be.repo;

import com.example.vtm_apidocs_be.entity.ApiCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<ApiCategory, Long> {

    Optional<ApiCategory> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    @Query("""
           select c from ApiCategory c
           where (:q is null or :q = '' 
                  or lower(c.name) like lower(concat('%', :q, '%'))
                  or lower(c.slug) like lower(concat('%', :q, '%')))
           """)
    Page<ApiCategory> search(@Param("q") String q, Pageable pageable);

    @Query("select c from ApiCategory c order by coalesce(c.sortOrder, 999999), c.name asc")
    List<ApiCategory> findAllOrdered();
}

