package com.antigravity.mdms.controller;

import com.antigravity.mdms.config.JwtTokenProvider;
import com.antigravity.mdms.model.AppUser;
import com.antigravity.mdms.model.Tenant;
import com.antigravity.mdms.service.MfaService;
import com.antigravity.mdms.service.TenantService;
import com.antigravity.mdms.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final Pattern SAFE_NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_\\-]{2,50}$");

    private final UserService userService;
    private final TenantService tenantService;
    private final MfaService mfaService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserService userService, TenantService tenantService, MfaService mfaService,
                          JwtTokenProvider jwtTokenProvider, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.tenantService = tenantService;
        this.mfaService = mfaService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    private static ResponseEntity<?> badRequest(String message) {
        return ResponseEntity.badRequest().body(Collections.singletonMap("error", message));
    }

    @PostMapping("/tenant/register")
    public ResponseEntity<?> registerTenant(@RequestBody TenantRegisterRequest req) {
        // Input validation
        if (req.getTenantName() == null || !SAFE_NAME_PATTERN.matcher(req.getTenantName()).matches()) {
            return badRequest("Tenant name must be 2-50 characters, alphanumeric with underscores/hyphens only");
        }
        if (req.getUsername() == null || !SAFE_NAME_PATTERN.matcher(req.getUsername()).matches()) {
            return badRequest("Username must be 2-50 characters, alphanumeric with underscores/hyphens only");
        }
        if (req.getEmail() == null || !EMAIL_PATTERN.matcher(req.getEmail()).matches()) {
            return badRequest("Invalid email format");
        }
        if (req.getPassword() == null || req.getPassword().length() < 6 || req.getPassword().length() > 100) {
            return badRequest("Password must be between 6 and 100 characters");
        }
        try {
            // Register the tenant and create their dedicated schema
            Tenant tenant = tenantService.registerTenant(req.getTenantName());
            // Create the first admin user under this tenant
            AppUser user = userService.registerUser(tenant.getId(), req.getUsername(), req.getEmail(), req.getPassword());
            
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("tenant", tenant.getName());
            resp.put("username", user.getUsername());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return badRequest(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        // Input validation to avoid unnecessary DB lookups
        if (req.getUsername() == null || req.getUsername().isBlank() || req.getUsername().length() > 50) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Collections.singletonMap("error", "Invalid username or password"));
        }
        if (req.getPassword() == null || req.getPassword().isBlank() || req.getPassword().length() > 100) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Collections.singletonMap("error", "Invalid username or password"));
        }
        AppUser user = userService.findByUsername(req.getUsername());
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Collections.singletonMap("error", "Invalid username or password"));
        }

        Tenant tenant = tenantService.getTenantById(user.getTenantId());
        String schemaName = tenant != null ? tenant.getSchemaName() : "public";

        if (user.isMfaEnabled()) {
            // Issue a temporary token requiring MFA validation (ROLE_PRE_AUTH_MFA)
            String preAuthToken = jwtTokenProvider.createToken(
                user.getUsername(), 
                user.getTenantId().toString(), 
                schemaName, 
                true, 
                false
            );
            
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("token", preAuthToken);
            resp.put("mfaRequired", true);
            resp.put("username", user.getUsername());
            return ResponseEntity.ok(resp);
        } else {
            // MFA is not enabled, issue direct full token (ROLE_USER)
            String token = jwtTokenProvider.createToken(
                user.getUsername(), 
                user.getTenantId().toString(), 
                schemaName, 
                false, 
                true
            );
            
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("token", token);
            resp.put("mfaRequired", false);
            resp.put("username", user.getUsername());
            resp.put("tenantName", tenant != null ? tenant.getName() : "System");
            return ResponseEntity.ok(resp);
        }
    }

    @PostMapping("/mfa/setup")
    public ResponseEntity<?> setupMfa(@RequestBody(required = false) MfaSetupRequest req) {
        if (req == null || req.getPassword() == null || req.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "MFA 등록을 위해 현재 비밀번호를 입력해야 합니다."));
        }
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        AppUser user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Collections.singletonMap("error", "현재 비밀번호가 일치하지 않습니다."));
        }

        Tenant tenant = tenantService.getTenantById(user.getTenantId());
        String tenantName = tenant != null ? tenant.getName() : "MDMS";

        String secret = mfaService.generateSecret();
        String qrUrl = mfaService.getQrCodeUrl(username, secret, tenantName);

        Map<String, String> resp = new LinkedHashMap<>();
        resp.put("secret", secret);
        resp.put("qrCodeUrl", qrUrl);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/mfa/confirm")
    public ResponseEntity<?> confirmMfa(@RequestBody Map<String, String> payload) {
        String secret = payload.get("secret");
        String code = payload.get("code");
        if (secret == null || secret.isBlank() || code == null || !code.matches("^\\d{6}$")) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "올바른 MFA 비밀키와 6자리 코드를 입력해주세요."));
        }
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        AppUser user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        boolean valid = mfaService.verifyCode(secret, code);
        if (!valid) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Collections.singletonMap("error", "MFA 인증 코드가 일치하지 않습니다."));
        }

        // 최종 MFA 활성화
        userService.enableMfa(user.getId(), secret);

        // 1회성 복구 코드 생성 (8자리 랜덤 영문대문자/숫자)
        String recoveryCode = java.util.UUID.randomUUID().toString().replaceAll("-", "").substring(0, 10).toUpperCase();

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("message", "MFA 등록이 완료되었습니다.");
        resp.put("recoveryCode", recoveryCode);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<?> verifyMfa(@RequestBody Map<String, String> payload) {
        String code = payload.get("code");
        // Validate MFA code format (must be 6-digit numeric)
        if (code == null || !code.matches("^\\d{6}$")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Collections.singletonMap("error", "Invalid MFA verification code format"));
        }
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        AppUser user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        boolean valid = mfaService.verifyCode(user.getMfaSecret(), code);
        if (!valid) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Collections.singletonMap("error", "Invalid MFA verification code"));
        }

        Tenant tenant = tenantService.getTenantById(user.getTenantId());
        String schemaName = tenant != null ? tenant.getSchemaName() : "public";

        // Issue new JWT with mfaVerified set to true (enabling ROLE_USER)
        String token = jwtTokenProvider.createToken(
            user.getUsername(), 
            user.getTenantId().toString(), 
            schemaName, 
            true, 
            true
        );

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("token", token);
        resp.put("username", user.getUsername());
        resp.put("tenantName", tenant != null ? tenant.getName() : "System");
        return ResponseEntity.ok(resp);
    }

    public static class MfaSetupRequest {
        private String password;
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    // Inner DTO Request Classes
    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class TenantRegisterRequest {
        private String tenantName;
        private String username;
        private String email;
        private String password;

        public String getTenantName() { return tenantName; }
        public void setTenantName(String tenantName) { this.tenantName = tenantName; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}
