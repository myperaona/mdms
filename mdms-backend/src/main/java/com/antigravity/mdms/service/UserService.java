package com.antigravity.mdms.service;

import com.antigravity.mdms.mapper.UserMapper;
import com.antigravity.mdms.model.AppUser;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserMapper userMapper, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public AppUser registerUser(UUID tenantId, String username, String email, String password) {
        if (userMapper.findByUsername(username) != null) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userMapper.findByEmail(email) != null) {
            throw new IllegalArgumentException("Email already exists");
        }

        AppUser user = new AppUser();
        user.setId(UUID.randomUUID());
        user.setTenantId(tenantId);
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setMfaEnabled(false);
        userMapper.insert(user);

        return user;
    }

    public AppUser findByUsername(String username) {
        return userMapper.findByUsername(username);
    }

    public void enableMfa(UUID userId, String secret) {
        userMapper.updateMfaSecret(userId, secret, true);
    }

    public void disableMfa(UUID userId) {
        userMapper.updateMfaSecret(userId, null, false);
    }
}
