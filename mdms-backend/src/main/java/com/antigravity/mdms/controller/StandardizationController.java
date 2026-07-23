package com.antigravity.mdms.controller;

import com.antigravity.mdms.model.Domain;
import com.antigravity.mdms.model.ForbiddenWord;
import com.antigravity.mdms.model.StandardTerm;
import com.antigravity.mdms.model.StandardWord;
import com.antigravity.mdms.service.StandardizationService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/standardization")
public class StandardizationController {

    private final StandardizationService service;

    public StandardizationController(StandardizationService service) {
        this.service = service;
    }

    // --- Domain Operations ---
    @GetMapping("/domains")
    public ResponseEntity<List<Domain>> getDomains() {
        return ResponseEntity.ok(service.getAllDomains());
    }

    @PostMapping("/domains")
    public ResponseEntity<?> saveDomain(@RequestBody Domain domain) {
        try {
            if (domain.getId() == null) {
                return ResponseEntity.ok(service.createDomain(domain));
            } else {
                return ResponseEntity.ok(service.updateDomain(domain));
            }
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/domains/{id}")
    public ResponseEntity<?> deleteDomain(@PathVariable UUID id) {
        service.deleteDomain(id);
        Map<String, Boolean> resp = new HashMap<>();
        resp.put("success", true);
        return ResponseEntity.ok(resp);
    }

    // --- Forbidden Word Operations ---
    @GetMapping("/forbidden-words")
    public ResponseEntity<List<ForbiddenWord>> getForbiddenWords() {
        return ResponseEntity.ok(service.getAllForbiddenWords());
    }

    @PostMapping("/forbidden-words")
    public ResponseEntity<?> saveForbiddenWord(@RequestBody ForbiddenWord word) {
        try {
            if (word.getId() == null) {
                return ResponseEntity.ok(service.createForbiddenWord(word));
            } else {
                return ResponseEntity.ok(service.updateForbiddenWord(word));
            }
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/forbidden-words/{id}")
    public ResponseEntity<?> deleteForbiddenWord(@PathVariable UUID id) {
        service.deleteForbiddenWord(id);
        Map<String, Boolean> resp = new HashMap<>();
        resp.put("success", true);
        return ResponseEntity.ok(resp);
    }

    // --- Standard Word Operations ---
    @GetMapping("/words")
    public ResponseEntity<List<StandardWord>> getStandardWords() {
        return ResponseEntity.ok(service.getAllStandardWords());
    }

    @PostMapping("/words")
    public ResponseEntity<?> saveStandardWord(@RequestBody StandardWord word) {
        try {
            if (word.getId() == null) {
                return ResponseEntity.ok(service.createStandardWord(word));
            } else {
                return ResponseEntity.ok(service.updateStandardWord(word));
            }
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/words/{id}")
    public ResponseEntity<?> deleteStandardWord(@PathVariable UUID id) {
        service.deleteStandardWord(id);
        Map<String, Boolean> resp = new HashMap<>();
        resp.put("success", true);
        return ResponseEntity.ok(resp);
    }

    // --- Standard Term Operations ---
    @GetMapping("/terms")
    public ResponseEntity<List<StandardTerm>> getStandardTerms() {
        return ResponseEntity.ok(service.getAllStandardTerms());
    }

    @PostMapping("/terms")
    public ResponseEntity<?> saveStandardTerm(@RequestBody StandardTerm term) {
        try {
            if (term.getId() == null) {
                return ResponseEntity.ok(service.createStandardTerm(term));
            } else {
                return ResponseEntity.ok(service.updateStandardTerm(term));
            }
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/terms/{id}")
    public ResponseEntity<?> deleteStandardTerm(@PathVariable UUID id) {
        service.deleteStandardTerm(id);
        Map<String, Boolean> resp = new HashMap<>();
        resp.put("success", true);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/terms/assemble")
    public ResponseEntity<?> assembleTerm(@RequestBody List<UUID> wordIds) {
        try {
            return ResponseEntity.ok(service.assembleTerm(wordIds));
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    // --- Bulk Import / Export ---
    @PostMapping("/import/{type}")
    public ResponseEntity<?> importCsv(@PathVariable String type, @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "CSV file is empty");
            return ResponseEntity.badRequest().body(err);
        }
        try {
            String csvData = new String(file.getBytes(), StandardCharsets.UTF_8);
            StandardizationService.ImportReport report;
            switch (type.toLowerCase()) {
                case "domains":
                    report = service.importDomains(csvData);
                    break;
                case "forbidden-words":
                    report = service.importForbiddenWords(csvData);
                    break;
                case "words":
                    report = service.importStandardWords(csvData);
                    break;
                case "terms":
                    report = service.importStandardTerms(csvData);
                    break;
                default:
                    Map<String, String> err = new HashMap<>();
                    err.put("error", "Invalid import type");
                    return ResponseEntity.badRequest().body(err);
            }
            return ResponseEntity.ok(report);
        } catch (IOException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Failed to process uploaded file: " + e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }

    @GetMapping("/export/{type}")
    public void exportCsv(@PathVariable String type, HttpServletResponse response) throws IOException {
        String csvData = "";
        switch (type.toLowerCase()) {
            case "domains":
                csvData = service.exportDomainsToCsv();
                break;
            case "forbidden-words":
                csvData = service.exportForbiddenWordsToCsv();
                break;
            case "words":
                csvData = service.exportStandardWordsToCsv();
                break;
            case "terms":
                csvData = service.exportStandardTermsToCsv();
                break;
            default:
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid export type");
                return;
        }
        
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=" + type + "_export.csv");
        // Ensure UTF-8 BOM is written so Excel displays Korean correctly
        response.getOutputStream().write(new byte[]{(byte)0xEF, (byte)0xBB, (byte)0xBF});
        response.getOutputStream().write(csvData.getBytes(StandardCharsets.UTF_8));
        response.getOutputStream().flush();
    }

    // --- Report operations ---
    @GetMapping("/report")
    public ResponseEntity<?> getReport() {
        return ResponseEntity.ok(service.getStandardizationReport());
    }
}
