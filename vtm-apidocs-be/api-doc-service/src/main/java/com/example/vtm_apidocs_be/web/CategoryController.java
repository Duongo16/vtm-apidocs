package com.example.vtm_apidocs_be.web;

import com.example.vtm_apidocs_be.repo.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository repo;

    public record CategoryListItem(Long id, String name, String slug) {}

    @GetMapping
    public List<CategoryListItem> list() {
        return repo.findAllOrdered()
                .stream()
                .map(c -> new CategoryListItem(c.getId(), c.getName(), c.getSlug()))
                .toList();
    }
}
