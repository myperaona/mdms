package com.antigravity.mdms.service;

import org.apache.commons.codec.binary.Base32;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;

@Service
public class MfaService {
    private static final SecureRandom random = new SecureRandom();
    private static final Base32 base32 = new Base32();

    public String generateSecret() {
        byte[] buffer = new byte[10]; // 80 bits is recommended standard
        random.nextBytes(buffer);
        return base32.encodeToString(buffer).trim();
    }

    public String getQrCodeUrl(String username, String secret, String tenantName) {
        String label = tenantName + ":" + username;
        return String.format("otpauth://totp/%s?secret=%s&issuer=%s", label, secret, tenantName);
    }

    public boolean verifyCode(String secret, String codeStr) {
        if (codeStr == null || codeStr.length() != 6) {
            return false;
        }
        int code;
        try {
            code = Integer.parseInt(codeStr);
        } catch (NumberFormatException e) {
            return false;
        }

        byte[] decodedKey = base32.decode(secret);
        long timeIndex = System.currentTimeMillis() / 1000 / 30;

        // Verify with a small window (-1 to +1 steps of 30 seconds) to accommodate network clock drift
        for (int i = -1; i <= 1; i++) {
            if (verifyCodeForTime(decodedKey, timeIndex + i, code)) {
                return true;
            }
        }
        return false;
    }

    private boolean verifyCodeForTime(byte[] key, long time, int code) {
        byte[] data = ByteBuffer.allocate(8).putLong(time).array();
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0xF;
            int binary = ((hash[offset] & 0x7F) << 24) |
                         ((hash[offset + 1] & 0xFF) << 16) |
                         ((hash[offset + 2] & 0xFF) << 8) |
                         (hash[offset + 3] & 0xFF);

            int otp = binary % 1000000;
            return otp == code;
        } catch (GeneralSecurityException e) {
            return false;
        }
    }
}
