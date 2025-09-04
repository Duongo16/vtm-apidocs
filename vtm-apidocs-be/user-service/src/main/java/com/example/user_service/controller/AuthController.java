package com.example.user_service.controller;

import com.example.user_service.entity.User;
import com.example.user_service.repository.UserRepository;
import com.example.user_service.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Email already registered"));
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletResponse response) {
        String email = body.get("email");
        String password = body.get("password");

        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null && passwordEncoder.matches(password, user.getPassword())) {
            String token = jwtUtil.generateToken(email);

            // Tạo cookie HTTP-only
            Cookie cookie = new Cookie("accessToken", token);
            cookie.setHttpOnly(true);         // JS không thể đọc
            cookie.setSecure(false);           // chỉ HTTPS, nếu dev có thể tạm false
            cookie.setPath("/");              // cookie hợp lệ với toàn bộ domain
            cookie.setMaxAge(15 * 60);        // 15 phút
            cookie.setSecure(true);     // bảo vệ CSRF cơ bản
            response.addCookie(cookie);

            // Trả thông tin user mà không gửi token
            Map<String, Object> result = new HashMap<>();
            result.put("user", Map.of(
                    "id", user.getId(),
                    "email", user.getEmail(),
                    "name", user.getName(),
                    "role", user.getRole()
            ));

            return ResponseEntity.ok(result);
        }

        return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
    }


    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("accessToken".equals(cookie.getName())) {
                    String token = cookie.getValue();
                    String email = jwtUtil.extractUsername(token);
                    System.out.println(token);
                    System.out.println(email);
                    User user = userRepository.findByEmail(email).orElse(null);
                    if (user != null) {
                        return ResponseEntity.ok(user);
                    }
                }
            }
        }
        return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("accessToken", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}

