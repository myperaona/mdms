package com.antigravity.mdms.controller;

import com.antigravity.mdms.config.TenantContext;
import com.antigravity.mdms.model.*;
import com.antigravity.mdms.service.CatalogService;
import com.antigravity.mdms.service.IngestionService;
import com.antigravity.mdms.service.StandardizationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogService catalogService;
    private final IngestionService ingestionService;
    private final StandardizationService standardizationService;

    public CatalogController(CatalogService catalogService, IngestionService ingestionService, StandardizationService standardizationService) {
        this.catalogService = catalogService;
        this.ingestionService = ingestionService;
        this.standardizationService = standardizationService;
    }

    @PutMapping("/columns/{columnId}")
    public ResponseEntity<?> updateColumn(@PathVariable UUID columnId, @RequestBody MetadataColumn column) {
        try {
            standardizationService.validateForbiddenWords(column.getDescription(), column.getName());
            column.setId(columnId);
            catalogService.updateColumn(column);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/datasources/{dsId}/schemas")
    public List<MetadataSchema> getSchemas(@PathVariable UUID dsId) {
        return catalogService.getSchemasByDataSourceId(dsId);
    }

    @GetMapping("/schemas/{schemaId}/tables")
    public List<MetadataTable> getTables(@PathVariable UUID schemaId) {
        return catalogService.getTablesBySchemaId(schemaId);
    }

    @GetMapping("/tables/{tableId}/columns")
    public List<MetadataColumn> getColumns(@PathVariable UUID tableId) {
        return catalogService.getColumnsByTableId(tableId);
    }

    @PutMapping("/tables/{tableId}/description")
    public ResponseEntity<Void> updateTableDesc(@PathVariable UUID tableId, @RequestBody Map<String, String> payload) {
        catalogService.updateTableDescription(tableId, payload.get("description"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/tables/{tableId}/lineage")
    public Map<String, Object> getLineage(@PathVariable UUID tableId) {
        return catalogService.getTableLineage(tableId);
    }

    @PutMapping("/columns/{columnId}/description")
    public ResponseEntity<Void> updateColumnDesc(@PathVariable UUID columnId, @RequestBody Map<String, String> payload) {
        catalogService.updateColumnDescription(columnId, payload.get("description"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search")
    public List<MetadataTable> search(@RequestParam String query) {
        return catalogService.search(query);
    }

    @PostMapping("/datasources/{dsId}/ingest")
    public ResponseEntity<?> triggerIngestion(@PathVariable UUID dsId) {
        String activeSchema = TenantContext.getCurrentTenantSchema();
        if (activeSchema == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No active tenant context found"));
        }
        
        // Trigger ingestion asynchronously on a separate thread pool
        ingestionService.runIngestionAsync(dsId, activeSchema, TenantContext.getCurrentTenantId());

        Map<String, String> resp = new HashMap<>();
        resp.put("message", "Metadata ingestion triggered successfully. Check job logs for updates.");
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/datasources/{dsId}/ingestion-jobs")
    public List<IngestionJob> getJobs(@PathVariable UUID dsId) {
        return catalogService.getJobsByDataSourceId(dsId);
    }
}
