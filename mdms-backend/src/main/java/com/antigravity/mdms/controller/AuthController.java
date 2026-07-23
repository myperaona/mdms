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

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

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

    @PostMapping("/tenant/register")
    public ResponseEntity<?> registerTenant(@RequestBody TenantRegisterRequest req) {
        try {
            // Register the tenant and create their dedicated schema
            Tenant tenant = tenantService.registerTenant(req.getTenantName());
            // Create the first admin user under this tenant
            AppUser user = userService.registerUser(tenant.getId(), req.getUsername(), req.getEmail(), req.getPassword());
            
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("tenant", tenant.getName());
            resp.put("username", user.getUsername());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        AppUser user = userService.findByUsername(req.getUsername());
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Invalid username or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
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
            
            Map<String, Object> resp = new HashMap<>();
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
            
            Map<String, Object> resp = new HashMap<>();
            resp.put("token", token);
            resp.put("mfaRequired", false);
            resp.put("username", user.getUsername());
            resp.put("tenantName", tenant != null ? tenant.getName() : "System");
            return ResponseEntity.ok(resp);
        }
    }

    @PostMapping("/mfa/setup")
    public ResponseEntity<?> setupMfa() {
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        AppUser user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Tenant tenant = tenantService.getTenantById(user.getTenantId());
        String tenantName = tenant != null ? tenant.getName() : "MDMS";

        // Generate dynamic key and return configuration details
        String secret = mfaService.generateSecret();
        String qrUrl = mfaService.getQrCodeUrl(username, secret, tenantName);

        // Store secret temporarily but don't enable yet until verification completes
        userService.enableMfa(user.getId(), secret);

        Map<String, String> resp = new HashMap<>();
        resp.put("secret", secret);
        resp.put("qrCodeUrl", qrUrl);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<?> verifyMfa(@RequestBody Map<String, String> payload) {
        String code = payload.get("code");
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        AppUser user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        boolean valid = mfaService.verifyCode(user.getMfaSecret(), code);
        if (!valid) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Invalid MFA verification code");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
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

        Map<String, Object> resp = new HashMap<>();
        resp.put("token", token);
        resp.put("username", user.getUsername());
        resp.put("tenantName", tenant != null ? tenant.getName() : "System");
        return ResponseEntity.ok(resp);
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
