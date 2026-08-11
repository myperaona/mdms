package com.antigravity.mdms.controller;

import com.antigravity.mdms.model.*;
import com.antigravity.mdms.service.DatabaseDesignService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/designs")
public class DatabaseDesignController {

    private final DatabaseDesignService service;

    public DatabaseDesignController(DatabaseDesignService service) {
        this.service = service;
    }

    private static ResponseEntity<?> badRequest(String msg) {
        return ResponseEntity.badRequest().body(Collections.singletonMap("error", msg));
    }

    private static ResponseEntity<?> successResponse() {
        return ResponseEntity.ok(Collections.singletonMap("success", true));
    }

    private String getCurrentUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return principal instanceof String ? (String) principal : "System";
    }

    // --- 1. Design Session API ---
    @GetMapping
    public ResponseEntity<List<DesignSession>> getDesignSessions() {
        return ResponseEntity.ok(service.getAllDesignSessions());
    }

    @GetMapping("/{designId}")
    public ResponseEntity<?> getDesignSession(@PathVariable UUID designId) {
        DesignSession session = service.getDesignSessionById(designId);
        if (session == null) return badRequest("Design session not found");
        return ResponseEntity.ok(session);
    }

    @PostMapping
    public ResponseEntity<?> createDesignSession(@RequestBody DesignSession session) {
        session.setCreatedBy(getCurrentUsername());
        return ResponseEntity.ok(service.createDesignSession(session));
    }

    @PutMapping("/{designId}")
    public ResponseEntity<?> updateDesignSession(@PathVariable UUID designId, @RequestBody DesignSession session) {
        session.setDesignId(designId);
        return ResponseEntity.ok(service.updateDesignSession(session));
    }

    @PatchMapping("/{designId}/status")
    public ResponseEntity<?> updateDesignSessionStatus(@PathVariable UUID designId, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null) return badRequest("Status parameter is required");
        service.updateDesignSessionStatus(designId, status);
        return successResponse();
    }

    @DeleteMapping("/{designId}")
    public ResponseEntity<?> deleteDesignSession(@PathVariable UUID designId) {
        service.deleteDesignSession(designId);
        return successResponse();
    }

    // --- 2. Subject Area API ---
    @GetMapping("/{designId}/subject-areas")
    public ResponseEntity<List<SubjectArea>> getSubjectAreas(@PathVariable UUID designId) {
        return ResponseEntity.ok(service.getSubjectAreasByDesignId(designId));
    }

    @PostMapping("/{designId}/subject-areas")
    public ResponseEntity<?> createSubjectArea(@PathVariable UUID designId, @RequestBody SubjectArea area) {
        area.setDesignId(designId);
        return ResponseEntity.ok(service.createSubjectArea(area));
    }

    @PutMapping("/subject-areas/{subjectAreaId}")
    public ResponseEntity<?> updateSubjectArea(@PathVariable UUID subjectAreaId, @RequestBody SubjectArea area) {
        area.setSubjectAreaId(subjectAreaId);
        return ResponseEntity.ok(service.updateSubjectArea(area));
    }

    @DeleteMapping("/subject-areas/{subjectAreaId}")
    public ResponseEntity<?> deleteSubjectArea(@PathVariable UUID subjectAreaId) {
        service.deleteSubjectArea(subjectAreaId);
        return successResponse();
    }

    // --- 3. Subject Area Term Mapping API ---
    @GetMapping("/subject-areas/{subjectAreaId}/terms")
    public ResponseEntity<List<StandardTerm>> getSubjectAreaTerms(@PathVariable UUID subjectAreaId) {
        return ResponseEntity.ok(service.getTermsBySubjectAreaId(subjectAreaId));
    }

    @PostMapping("/subject-areas/{subjectAreaId}/terms")
    public ResponseEntity<?> addTermToSubjectArea(@PathVariable UUID subjectAreaId, @RequestBody Map<String, UUID> body) {
        UUID termId = body.get("termId");
        if (termId == null) return badRequest("termId is required");
        service.addTermToSubjectArea(subjectAreaId, termId, getCurrentUsername());
        return successResponse();
    }

    @DeleteMapping("/subject-areas/{subjectAreaId}/terms/{termId}")
    public ResponseEntity<?> removeTermFromSubjectArea(@PathVariable UUID subjectAreaId, @PathVariable UUID termId) {
        service.removeTermFromSubjectArea(subjectAreaId, termId);
        return successResponse();
    }

    // --- 4. Table & Column Design API ---
    @GetMapping("/{designId}/tables")
    public ResponseEntity<List<TableDesign>> getTables(@PathVariable UUID designId) {
        return ResponseEntity.ok(service.getTablesByDesignId(designId));
    }

    @PostMapping("/{designId}/tables")
    public ResponseEntity<?> createTable(@PathVariable UUID designId, @RequestBody TableDesign table) {
        table.setDesignId(designId);
        return ResponseEntity.ok(service.createTableDesign(table));
    }

    @PutMapping("/tables/{tableDesignId}")
    public ResponseEntity<?> updateTable(@PathVariable UUID tableDesignId, @RequestBody TableDesign table) {
        table.setTableDesignId(tableDesignId);
        return ResponseEntity.ok(service.updateTableDesign(table));
    }

    @DeleteMapping("/tables/{tableDesignId}")
    public ResponseEntity<?> deleteTable(@PathVariable UUID tableDesignId) {
        service.deleteTableDesign(tableDesignId);
        return successResponse();
    }

    @GetMapping("/tables/{tableDesignId}/columns")
    public ResponseEntity<List<TableColumn>> getColumns(@PathVariable UUID tableDesignId) {
        return ResponseEntity.ok(service.getColumnsByTableDesignId(tableDesignId));
    }

    @PostMapping("/tables/{tableDesignId}/columns")
    public ResponseEntity<?> createColumn(@PathVariable UUID tableDesignId, @RequestBody TableColumn col) {
        col.setTableDesignId(tableDesignId);
        return ResponseEntity.ok(service.createTableColumn(col));
    }

    @PutMapping("/columns/{columnId}")
    public ResponseEntity<?> updateColumn(@PathVariable UUID columnId, @RequestBody TableColumn col) {
        col.setColumnId(columnId);
        return ResponseEntity.ok(service.updateTableColumn(col));
    }

    @DeleteMapping("/columns/{columnId}")
    public ResponseEntity<?> deleteColumn(@PathVariable UUID columnId) {
        service.deleteColumn(columnId);
        return successResponse();
    }

    // --- 5. ERD API ---
    @GetMapping("/{designId}/erd/entities")
    public ResponseEntity<List<ErdEntity>> getErdEntities(@PathVariable UUID designId) {
        return ResponseEntity.ok(service.getErdEntitiesByDesignId(designId));
    }

    @PostMapping("/{designId}/erd/entities")
    public ResponseEntity<?> saveErdEntities(@PathVariable UUID designId, @RequestBody List<ErdEntity> entities) {
        service.saveErdEntities(entities);
        return successResponse();
    }

    @GetMapping("/{designId}/erd/relations")
    public ResponseEntity<List<ErdRelation>> getErdRelations(@PathVariable UUID designId) {
        return ResponseEntity.ok(service.getErdRelationsByDesignId(designId));
    }

    @PostMapping("/{designId}/erd/relations")
    public ResponseEntity<?> createErdRelation(@PathVariable UUID designId, @RequestBody ErdRelation relation) {
        relation.setDesignId(designId);
        return ResponseEntity.ok(service.createErdRelation(relation));
    }

    @DeleteMapping("/erd/relations/{relationId}")
    public ResponseEntity<?> deleteErdRelation(@PathVariable UUID relationId) {
        service.deleteErdRelation(relationId);
        return successResponse();
    }

    // --- 6. DB Connection Management API ---
    @GetMapping("/db-connections")
    public ResponseEntity<List<DbConnection>> getDbConnections() {
        return ResponseEntity.ok(service.getAllDbConnections());
    }

    @PostMapping("/db-connections")
    public ResponseEntity<?> createDbConnection(@RequestBody DbConnection conn) {
        return ResponseEntity.ok(service.createDbConnection(conn));
    }

    @PutMapping("/db-connections/{connectionId}")
    public ResponseEntity<?> updateDbConnection(@PathVariable UUID connectionId, @RequestBody DbConnection conn) {
        conn.setConnectionId(connectionId);
        return ResponseEntity.ok(service.updateDbConnection(conn));
    }

    @DeleteMapping("/db-connections/{connectionId}")
    public ResponseEntity<?> deleteDbConnection(@PathVariable UUID connectionId) {
        service.deleteDbConnection(connectionId);
        return successResponse();
    }

    @PostMapping("/db-connections/{connectionId}/test")
    public ResponseEntity<?> testDbConnection(@PathVariable UUID connectionId) {
        return ResponseEntity.ok(service.testDbConnection(connectionId));
    }

    // --- 7. DDL Generation & Deployment API ---
    @PostMapping("/{designId}/ddl/generate")
    public ResponseEntity<?> generateDdl(@PathVariable UUID designId, @RequestBody Map<String, Object> body) {
        String dbType = (String) body.get("dbType");
        List<UUID> selectedTableIds = (List<UUID>) body.get("tableIds");
        return ResponseEntity.ok(service.generateDdl(designId, selectedTableIds, dbType));
    }

    @PostMapping("/{designId}/ddl/deploy")
    public ResponseEntity<?> deployDdl(@PathVariable UUID designId, @RequestBody Map<String, String> body) {
        String connectionIdStr = body.get("connectionId");
        String sqlText = body.get("ddlText");
        if (connectionIdStr == null || sqlText == null) {
            return badRequest("connectionId and ddlText are required");
        }
        UUID connectionId = UUID.fromString(connectionIdStr);
        return ResponseEntity.ok(service.deployDdlToDb(designId, connectionId, sqlText, getCurrentUsername()));
    }

    @GetMapping("/{designId}/deploy-logs")
    public ResponseEntity<List<DbDeployLog>> getDeployLogs(@PathVariable UUID designId) {
        return ResponseEntity.ok(service.getDeployLogsByDesignId(designId));
    }
}
