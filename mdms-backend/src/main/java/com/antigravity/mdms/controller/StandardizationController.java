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
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
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

    // --- Internal Helpers ---
    private static ResponseEntity<?> badRequest(String message) {
        return ResponseEntity.badRequest().body(Collections.singletonMap("error", message));
    }

    private static ResponseEntity<?> successResponse() {
        return ResponseEntity.ok(Collections.singletonMap("success", true));
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
            return badRequest(e.getMessage());
        }
    }

    @DeleteMapping("/domains/{id}")
    public ResponseEntity<?> deleteDomain(@PathVariable UUID id) {
        service.deleteDomain(id);
        return successResponse();
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
            return badRequest(e.getMessage());
        }
    }

    @DeleteMapping("/forbidden-words/{id}")
    public ResponseEntity<?> deleteForbiddenWord(@PathVariable UUID id) {
        service.deleteForbiddenWord(id);
        return successResponse();
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
            return badRequest(e.getMessage());
        }
    }

    @DeleteMapping("/words/{id}")
    public ResponseEntity<?> deleteStandardWord(@PathVariable UUID id) {
        service.deleteStandardWord(id);
        return successResponse();
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
            return badRequest(e.getMessage());
        }
    }

    @DeleteMapping("/terms/{id}")
    public ResponseEntity<?> deleteStandardTerm(@PathVariable UUID id) {
        service.deleteStandardTerm(id);
        return successResponse();
    }

    @PostMapping("/terms/assemble")
    public ResponseEntity<?> assembleTerm(@RequestBody List<UUID> wordIds) {
        try {
            return ResponseEntity.ok(service.assembleTerm(wordIds));
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }

    // --- Bulk Import / Export ---
    @PostMapping("/import/{type}")
    public ResponseEntity<?> importCsv(@PathVariable String type, @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return badRequest("CSV file is empty");
        }
        if (file.getSize() > StandardizationService.MAX_CSV_SIZE_BYTES) {
            return badRequest("CSV file exceeds maximum allowed size of 10 MB");
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
                    return badRequest("Invalid import type: " + type);
            }
            return ResponseEntity.ok(report);
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                .body(Collections.singletonMap("error", "Failed to process uploaded file: " + e.getMessage()));
        }
    }

    @GetMapping("/export/{type}")
    public void exportCsv(@PathVariable String type, HttpServletResponse response) throws IOException {
        String csvData;
        String filename;
        switch (type.toLowerCase()) {
            case "domains":
                csvData = service.exportDomainsToCsv();
                filename = "domains_export.csv";
                break;
            case "forbidden-words":
                csvData = service.exportForbiddenWordsToCsv();
                filename = "forbidden_words_export.csv";
                break;
            case "words":
                csvData = service.exportStandardWordsToCsv();
                filename = "standard_words_export.csv";
                break;
            case "terms":
                csvData = service.exportStandardTermsToCsv();
                filename = "standard_terms_export.csv";
                break;
            case "report":
                csvData = service.exportReportToCsv(null, null);
                filename = "non_compliant_columns_report.csv";
                break;
            default:
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid export type");
                return;
        }
        
        response.setContentType("text/csv; charset=UTF-8");
        // RFC 6266 compliant Content-Disposition header with UTF-8 filename encoding
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename);
        // Ensure UTF-8 BOM is written so Excel displays Korean correctly
        response.getOutputStream().write(new byte[]{(byte)0xEF, (byte)0xBB, (byte)0xBF});
        response.getOutputStream().write(csvData.getBytes(StandardCharsets.UTF_8));
        response.getOutputStream().flush();
    }

    @GetMapping("/export/report")
    public void exportReportXlsx(
            @RequestParam(value = "dataSourceId", required = false) UUID dataSourceId,
            @RequestParam(value = "schemaId", required = false) UUID schemaId,
            HttpServletResponse response) throws IOException {
        byte[] excelBytes = service.exportReportToXlsx(dataSourceId, schemaId);
        String filename = "non_compliant_columns_report.xlsx";

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename);
        response.getOutputStream().write(excelBytes);
        response.getOutputStream().flush();
    }

    @GetMapping("/report")
    public ResponseEntity<?> getReport(
            @RequestParam(value = "dataSourceId", required = false) UUID dataSourceId,
            @RequestParam(value = "schemaId", required = false) UUID schemaId) {
        return ResponseEntity.ok(service.getStandardizationReport(dataSourceId, schemaId));
    }
}
