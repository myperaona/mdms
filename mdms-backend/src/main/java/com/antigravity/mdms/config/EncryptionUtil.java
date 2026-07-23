package com.antigravity.mdms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class EncryptionUtil {
    private static final String ALGORITHM = "AES";
    
    @Value("${jwt.secret}")
    private String secretKey;
    
    public String encrypt(String value) {
        if (value == null) return null;
        try {
            byte[] keyBytes = new byte[16];
            byte[] jwtBytes = secretKey.getBytes(StandardCharsets.UTF_8);
            System.arraycopy(jwtBytes, 0, keyBytes, 0, Math.min(jwtBytes.length, 16));
            SecretKeySpec secretKeySpec = new SecretKeySpec(keyBytes, ALGORITHM);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec);
            byte[] encryptedBytes = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch (Exception e) {
            throw new RuntimeException("Error encrypting target database credential", e);
        }
    }
    
    public String decrypt(String encryptedValue) {
        if (encryptedValue == null) return null;
        try {
            byte[] keyBytes = new byte[16];
            byte[] jwtBytes = secretKey.getBytes(StandardCharsets.UTF_8);
            System.arraycopy(jwtBytes, 0, keyBytes, 0, Math.min(jwtBytes.length, 16));
            SecretKeySpec secretKeySpec = new SecretKeySpec(keyBytes, ALGORITHM);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedValue));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Error decrypting target database credential", e);
        }
    }
}
