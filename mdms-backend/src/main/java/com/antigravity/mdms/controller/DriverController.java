package com.antigravity.mdms.controller;

import com.antigravity.mdms.config.DynamicJdbcDriverLoader;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/drivers")
public class DriverController {

    private final DynamicJdbcDriverLoader driverLoader;
    private static final String DRIVERS_DIR = "./drivers";

    public DriverController(DynamicJdbcDriverLoader driverLoader) {
        this.driverLoader = driverLoader;
    }

    @GetMapping
    public ResponseEntity<?> getDrivers() {
        return ResponseEntity.ok(driverLoader.getLoadedJarNames());
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDriver(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || file.getOriginalFilename() == null || !file.getOriginalFilename().toLowerCase().endsWith(".jar")) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Only valid .jar files are accepted");
            return ResponseEntity.badRequest().body(err);
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Cannot read file bytes");
            return ResponseEntity.badRequest().body(err);
        }

        // Validate ZIP/JAR Magic Header (0x50 0x4B 0x03 0x04)
        if (bytes.length < 4 || bytes[0] != 0x50 || bytes[1] != 0x4B || bytes[2] != 0x03 || bytes[3] != 0x04) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Invalid JAR file header (Magic bytes check failed)");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            // Compute SHA-256 Hash
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(bytes);
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            String sha256 = sb.toString();

            // Ensure target directory exists
            Path dirPath = Paths.get(DRIVERS_DIR);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            // Copy file to target drivers directory
            Path filePath = dirPath.resolve(file.getOriginalFilename());
            Files.write(filePath, bytes);

            // Attempt dynamic class loading
            boolean loaded = driverLoader.loadDriverJar(filePath.toFile());
            if (loaded) {
                Map<String, Object> resp = new HashMap<>();
                resp.put("success", true);
                resp.put("fileName", file.getOriginalFilename());
                resp.put("sha256", sha256);
                return ResponseEntity.ok(resp);
            } else {
                // If it wasn't a valid driver jar, delete it
                Files.deleteIfExists(filePath);
                Map<String, String> err = new HashMap<>();
                err.put("error", "No JDBC Driver implementations found in the uploaded jar");
                return ResponseEntity.badRequest().body(err);
            }
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Failed to save uploaded file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @DeleteMapping
    public ResponseEntity<?> clearDrivers() {
        driverLoader.clearDrivers();
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "All JDBC driver jars cleared and unmounted");
        return ResponseEntity.ok(resp);
    }
}
