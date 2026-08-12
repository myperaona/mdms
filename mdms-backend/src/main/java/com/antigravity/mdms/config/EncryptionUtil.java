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
    private static final String TRANSFORMATION_CBC = "AES/CBC/PKCS5Padding";
    
    @Value("${jwt.secret:defaultSecretKey1234567890123456}")
    private String secretKey;
    
    private SecretKeySpec getSecretKeySpec() {
        byte[] keyBytes = new byte[16];
        byte[] jwtBytes = secretKey != null ? secretKey.getBytes(StandardCharsets.UTF_8) : new byte[16];
        System.arraycopy(jwtBytes, 0, keyBytes, 0, Math.min(jwtBytes.length, 16));
        return new SecretKeySpec(keyBytes, ALGORITHM);
    }

    public String encrypt(String value) {
        if (value == null) return null;
        try {
            SecretKeySpec secretKeySpec = getSecretKeySpec();
            byte[] iv = new byte[16];
            new java.security.SecureRandom().nextBytes(iv);
            javax.crypto.spec.IvParameterSpec ivSpec = new javax.crypto.spec.IvParameterSpec(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION_CBC);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, ivSpec);
            byte[] encryptedBytes = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));

            // Combine IV and Ciphertext
            byte[] combined = new byte[iv.length + encryptedBytes.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Error encrypting target database credential", e);
        }
    }
    
    public String decrypt(String encryptedValue) {
        if (encryptedValue == null) return null;
        try {
            byte[] decoded = Base64.getDecoder().decode(encryptedValue);
            SecretKeySpec secretKeySpec = getSecretKeySpec();

            // Try new CBC mode with IV first (minimum size > 16)
            if (decoded.length > 16) {
                try {
                    byte[] iv = new byte[16];
                    byte[] ciphertext = new byte[decoded.length - 16];
                    System.arraycopy(decoded, 0, iv, 0, 16);
                    System.arraycopy(decoded, 16, ciphertext, 0, ciphertext.length);

                    javax.crypto.spec.IvParameterSpec ivSpec = new javax.crypto.spec.IvParameterSpec(iv);
                    Cipher cipher = Cipher.getInstance(TRANSFORMATION_CBC);
                    cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, ivSpec);
                    byte[] decryptedBytes = cipher.doFinal(ciphertext);
                    return new String(decryptedBytes, StandardCharsets.UTF_8);
                } catch (Exception ignored) {
                    // Fallback to legacy ECB mode
                }
            }

            // Legacy ECB Decryption Fallback
            Cipher legacyCipher = Cipher.getInstance(ALGORITHM);
            legacyCipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
            byte[] decryptedBytes = legacyCipher.doFinal(decoded);
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Error decrypting target database credential", e);
        }
    }
}
