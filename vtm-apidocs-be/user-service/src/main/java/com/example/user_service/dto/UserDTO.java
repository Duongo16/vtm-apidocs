package com.example.user_service.dto;

import com.example.user_service.entity.User.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private Long id;
    private String name;
    private String email;
    private Role role;
    private Integer status;
    private Integer createdAt;
    private Integer updatedAt;
}

