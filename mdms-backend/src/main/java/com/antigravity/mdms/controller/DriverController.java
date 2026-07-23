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

        try {
            // Ensure target directory exists
            Path dirPath = Paths.get(DRIVERS_DIR);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            // Copy file to target drivers directory
            Path filePath = dirPath.resolve(file.getOriginalFilename());
            Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // Attempt dynamic class loading
            boolean loaded = driverLoader.loadDriverJar(filePath.toFile());
            if (loaded) {
                Map<String, Object> resp = new HashMap<>();
                resp.put("success", true);
                resp.put("fileName", file.getOriginalFilename());
                return ResponseEntity.ok(resp);
            } else {
                // If it wasn't a valid driver jar, delete it
                Files.deleteIfExists(filePath);
                Map<String, String> err = new HashMap<>();
                err.put("error", "No JDBC Driver implementations found in the uploaded jar");
                return ResponseEntity.badRequest().body(err);
            }

        } catch (IOException e) {
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
