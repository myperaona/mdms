package com.antigravity.mdms.service;

import com.antigravity.mdms.config.TenantContext;
import com.antigravity.mdms.mapper.DatabaseDesignMapper;
import com.antigravity.mdms.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.*;

@Service
public class DatabaseDesignService {

    private static final Logger log = LoggerFactory.getLogger(DatabaseDesignService.class);
    private static final String AES_SECRET_KEY = "MDMSDatabaseDesignKeyForSecuredPass"; // 32 bytes fallback key
    
    private final DatabaseDesignMapper mapper;

    public DatabaseDesignService(DatabaseDesignMapper mapper) {
        this.mapper = mapper;
    }

    private UUID requireCurrentTenantId() {
        String tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalStateException("Tenant context is missing");
        }
        return UUID.fromString(tenantId);
    }

    // ==========================================
    // AES Encryption Helpers for Passwords
    // ==========================================
    private String encryptPassword(String plain) {
        if (plain == null || plain.isEmpty()) return "";
        try {
            byte[] keyBytes = Arrays.copyOf(AES_SECRET_KEY.getBytes(StandardCharsets.UTF_8), 16);
            SecretKeySpec key = new SecretKeySpec(keyBytes, "AES");
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, key);
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            log.error("Encryption failed", e);
            return plain;
        }
    }

    private String decryptPassword(String encrypted) {
        if (encrypted == null || encrypted.isEmpty()) return "";
        try {
            byte[] keyBytes = Arrays.copyOf(AES_SECRET_KEY.getBytes(StandardCharsets.UTF_8), 16);
            SecretKeySpec key = new SecretKeySpec(keyBytes, "AES");
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, key);
            byte[] decoded = Base64.getDecoder().decode(encrypted);
            return new String(cipher.doFinal(decoded), StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Decryption failed", e);
            return encrypted;
        }
    }

    // ==========================================
    // 1. Design Session
    // ==========================================
    public List<DesignSession> getAllDesignSessions() {
        return mapper.findAllDesignSessions();
    }

    public DesignSession getDesignSessionById(UUID id) {
        return mapper.findDesignSessionById(id);
    }

    @Transactional
    public DesignSession createDesignSession(DesignSession session) {
        session.setDesignId(UUID.randomUUID());
        session.setTenantId(requireCurrentTenantId());
        if (session.getStatus() == null) session.setStatus("DRAFT");
        if (session.getVersion() == null) session.setVersion("v1.0");
        mapper.insertDesignSession(session);
        return session;
    }

    @Transactional
    public DesignSession updateDesignSession(DesignSession session) {
        mapper.updateDesignSession(session);
        return session;
    }

    @Transactional
    public void updateDesignSessionStatus(UUID id, String status) {
        mapper.updateDesignSessionStatus(id, status);
    }

    @Transactional
    public void deleteDesignSession(UUID id) {
        mapper.deleteDesignSession(id);
    }

    // ==========================================
    // 2. Subject Area
    // ==========================================
    public List<SubjectArea> getSubjectAreasByDesignId(UUID designId) {
        return mapper.findSubjectAreasByDesignId(designId);
    }

    @Transactional
    public SubjectArea createSubjectArea(SubjectArea area) {
        area.setSubjectAreaId(UUID.randomUUID());
        mapper.insertSubjectArea(area);
        return area;
    }

    @Transactional
    public SubjectArea updateSubjectArea(SubjectArea area) {
        mapper.updateSubjectArea(area);
        return area;
    }

    @Transactional
    public void deleteSubjectArea(UUID id) {
        mapper.deleteSubjectAreaTermMappingsBySubjectAreaId(id);
        mapper.deleteSubjectArea(id);
    }

    // ==========================================
    // 3. Subject Area Term Mapping
    // ==========================================
    public List<StandardTerm> getTermsBySubjectAreaId(UUID subjectAreaId) {
        return mapper.findTermsBySubjectAreaId(subjectAreaId);
    }

    @Transactional
    public void addTermToSubjectArea(UUID subjectAreaId, UUID termId, String createdBy) {
        try {
            mapper.insertSubjectAreaTermMapping(UUID.randomUUID(), subjectAreaId, termId, createdBy);
        } catch (Exception e) {
            log.info("Term already mapped to subject area");
        }
    }

    @Transactional
    public void removeTermFromSubjectArea(UUID subjectAreaId, UUID termId) {
        mapper.deleteSubjectAreaTermMapping(subjectAreaId, termId);
    }

    // ==========================================
    // 4. Table & Column Design
    // ==========================================
    public List<TableDesign> getTablesByDesignId(UUID designId) {
        return mapper.findTablesByDesignId(designId);
    }

    public TableDesign getTableDesignById(UUID id) {
        return mapper.findTableDesignById(id);
    }

    @Transactional
    public TableDesign createTableDesign(TableDesign table) {
        table.setTableDesignId(UUID.randomUUID());
        if (table.getTablePhysicalName() != null) {
            table.setTablePhysicalName(table.getTablePhysicalName().toUpperCase());
        }
        mapper.insertTableDesign(table);

        // Automatically create an ERD entity position
        ErdEntity entity = new ErdEntity();
        entity.setEntityId(UUID.randomUUID());
        entity.setDesignId(table.getDesignId());
        entity.setTableDesignId(table.getTableDesignId());
        entity.setPositionX(100 + (int)(Math.random() * 300));
        entity.setPositionY(100 + (int)(Math.random() * 300));
        entity.setWidth(240);
        entity.setHeight(180);
        mapper.upsertErdEntity(entity);

        return table;
    }

    @Transactional
    public TableDesign updateTableDesign(TableDesign table) {
        if (table.getTablePhysicalName() != null) {
            table.setTablePhysicalName(table.getTablePhysicalName().toUpperCase());
        }
        mapper.updateTableDesign(table);
        return table;
    }

    @Transactional
    public void deleteTableDesign(UUID id) {
        mapper.deleteColumnsByTableDesignId(id);
        mapper.deleteTableDesign(id);
    }

    public List<TableColumn> getColumnsByTableDesignId(UUID tableDesignId) {
        return mapper.findColumnsByTableDesignId(tableDesignId);
    }

    @Transactional
    public TableColumn createTableColumn(TableColumn col) {
        col.setColumnId(UUID.randomUUID());
        if (col.getColumnPhysicalName() != null) {
            col.setColumnPhysicalName(col.getColumnPhysicalName().toUpperCase());
        }
        mapper.insertTableColumn(col);
        return col;
    }

    @Transactional
    public TableColumn updateTableColumn(TableColumn col) {
        if (col.getColumnPhysicalName() != null) {
            col.setColumnPhysicalName(col.getColumnPhysicalName().toUpperCase());
        }
        mapper.updateTableColumn(col);
        return col;
    }

    @Transactional
    public void deleteTableColumn(UUID id) {
        mapper.deleteTableColumn(id);
    }

    @Transactional
    public void deleteColumn(UUID id) {
        mapper.deleteTableColumn(id);
    }

    // ==========================================
    // 5. ERD Entity & Relation
    // ==========================================
    public List<ErdEntity> getErdEntitiesByDesignId(UUID designId) {
        return mapper.findErdEntitiesByDesignId(designId);
    }

    @Transactional
    public void saveErdEntities(List<ErdEntity> entities) {
        for (ErdEntity e : entities) {
            if (e.getEntityId() == null) e.setEntityId(UUID.randomUUID());
            mapper.upsertErdEntity(e);
        }
    }

    public List<ErdRelation> getErdRelationsByDesignId(UUID designId) {
        return mapper.findErdRelationsByDesignId(designId);
    }

    @Transactional
    public ErdRelation createErdRelation(ErdRelation relation) {
        relation.setRelationId(UUID.randomUUID());
        mapper.insertErdRelation(relation);
        return relation;
    }

    @Transactional
    public void deleteErdRelation(UUID relationId) {
        mapper.deleteErdRelation(relationId);
    }

    // ==========================================
    // 6. DB Connection Management & Ping Test
    // ==========================================
    public List<DbConnection> getAllDbConnections() {
        List<DbConnection> list = mapper.findAllDbConnections();
        for (DbConnection conn : list) {
            conn.setEncryptedPassword(null); // Mask password in response list
        }
        return list;
    }

    @Transactional
    public DbConnection createDbConnection(DbConnection connection) {
        connection.setConnectionId(UUID.randomUUID());
        connection.setTenantId(requireCurrentTenantId());
        connection.setEncryptedPassword(encryptPassword(connection.getPassword()));
        mapper.insertDbConnection(connection);
        connection.setPassword(null);
        return connection;
    }

    @Transactional
    public DbConnection updateDbConnection(DbConnection connection) {
        if (connection.getPassword() != null && !connection.getPassword().isEmpty()) {
            connection.setEncryptedPassword(encryptPassword(connection.getPassword()));
        } else {
            DbConnection existing = mapper.findDbConnectionById(connection.getConnectionId());
            if (existing != null) {
                connection.setEncryptedPassword(existing.getEncryptedPassword());
            }
        }
        mapper.updateDbConnection(connection);
        connection.setPassword(null);
        return connection;
    }

    @Transactional
    public void deleteDbConnection(UUID connectionId) {
        mapper.deleteDbConnection(connectionId);
    }

    public Map<String, Object> testDbConnection(UUID connectionId) {
        DbConnection dbConn = mapper.findDbConnectionById(connectionId);
        if (dbConn == null) {
            throw new IllegalArgumentException("Connection not found");
        }
        String plainPassword = decryptPassword(dbConn.getEncryptedPassword());
        return performPingTest(dbConn.getDbType(), dbConn.getHost(), dbConn.getPort(), dbConn.getDbName(), dbConn.getSchemaName(), dbConn.getUserId(), plainPassword);
    }

    private Map<String, Object> performPingTest(String dbType, String host, int port, String dbName, String schemaName, String user, String password) {
        Map<String, Object> result = new LinkedHashMap<>();
        String jdbcUrl;
        String driverClass;

        String typeUpper = dbType.toUpperCase();
        if (typeUpper.contains("POSTGRES")) {
            jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", host, port, dbName);
            driverClass = "org.postgresql.Driver";
        } else if (typeUpper.contains("MARIA") || typeUpper.contains("MYSQL")) {
            jdbcUrl = String.format("jdbc:mariadb://%s:%d/%s", host, port, dbName);
            driverClass = "org.mariadb.jdbc.Driver";
        } else {
            jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", host, port, dbName);
            driverClass = "org.postgresql.Driver";
        }

        try {
            Class.forName(driverClass);
            try (Connection conn = DriverManager.getConnection(jdbcUrl, user, password)) {
                if (conn.isValid(5)) {
                    result.put("result", "SUCCESS");
                    result.put("message", "Successfully connected to target database (" + dbType + " at " + host + ":" + port + ")");
                } else {
                    result.put("result", "FAIL");
                    result.put("message", "Connection validation failed (Timeout)");
                }
            }
        } catch (Exception e) {
            result.put("result", "FAIL");
            result.put("message", "Connection Error: " + e.getMessage());
        }
        return result;
    }

    // ==========================================
    // 7. DDL Generation & Target DB Deployment
    // ==========================================
    public Map<String, Object> generateDdl(UUID designId, List<UUID> selectedTableIds, String targetDbType) {
        List<TableDesign> tables = mapper.findTablesByDesignId(designId);
        List<ErdRelation> relations = mapper.findErdRelationsByDesignId(designId);

        StringBuilder sb = new StringBuilder();
        sb.append("-- Generated by MDMS Database Design Module\n");
        sb.append("-- Target DB: ").append(targetDbType != null ? targetDbType : "POSTGRESQL").append("\n");
        sb.append("-- Date: ").append(new java.util.Date()).append("\n\n");

        for (TableDesign table : tables) {
            if (selectedTableIds != null && !selectedTableIds.isEmpty() && !selectedTableIds.contains(table.getTableDesignId())) {
                continue;
            }

            List<TableColumn> columns = mapper.findColumnsByTableDesignId(table.getTableDesignId());
            sb.append("-- Table: ").append(table.getTableLogicName()).append(" (").append(table.getTablePhysicalName()).append(")\n");
            sb.append("CREATE TABLE ").append(table.getTablePhysicalName()).append(" (\n");

            List<String> pkColumns = new ArrayList<>();
            for (int i = 0; i < columns.size(); i++) {
                TableColumn col = columns.get(i);
                sb.append("    ").append(col.getColumnPhysicalName()).append(" ").append(col.getDataType());

                if (col.getLength() != null && col.getLength() > 0) {
                    if (col.getScale() != null && col.getScale() > 0) {
                        sb.append("(").append(col.getLength()).append(",").append(col.getScale()).append(")");
                    } else {
                        sb.append("(").append(col.getLength()).append(")");
                    }
                }

                if ("N".equalsIgnoreCase(col.getNullableYn())) {
                    sb.append(" NOT NULL");
                }
                if (col.getDefaultValue() != null && !col.getDefaultValue().isBlank()) {
                    sb.append(" DEFAULT ").append(col.getDefaultValue());
                }

                if ("Y".equalsIgnoreCase(col.getPkYn())) {
                    pkColumns.add(col.getColumnPhysicalName());
                }

                if (i < columns.size() - 1 || !pkColumns.isEmpty()) {
                    sb.append(",");
                }
                sb.append(" -- ").append(col.getColumnLogicName()).append("\n");
            }

            if (!pkColumns.isEmpty()) {
                sb.append("    PRIMARY KEY (").append(String.join(", ", pkColumns)).append(")\n");
            }

            sb.append(");\n\n");
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("ddlText", sb.toString());
        return resp;
    }

    @Transactional
    public DbDeployLog deployDdlToDb(UUID designId, UUID connectionId, String sqlText, String username) {
        DbConnection dbConn = mapper.findDbConnectionById(connectionId);
        if (dbConn == null) {
            throw new IllegalArgumentException("Target DB Connection not found");
        }

        String plainPassword = decryptPassword(dbConn.getEncryptedPassword());
        String jdbcUrl;
        String driverClass;
        String typeUpper = dbConn.getDbType().toUpperCase();

        if (typeUpper.contains("POSTGRES")) {
            jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", dbConn.getHost(), dbConn.getPort(), dbConn.getDbName());
            driverClass = "org.postgresql.Driver";
        } else if (typeUpper.contains("MARIA") || typeUpper.contains("MYSQL")) {
            jdbcUrl = String.format("jdbc:mariadb://%s:%d/%s", dbConn.getHost(), dbConn.getPort(), dbConn.getDbName());
            driverClass = "org.mariadb.jdbc.Driver";
        } else {
            jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", dbConn.getHost(), dbConn.getPort(), dbConn.getDbName());
            driverClass = "org.postgresql.Driver";
        }

        DbDeployLog deployLog = new DbDeployLog();
        deployLog.setDeployLogId(UUID.randomUUID());
        deployLog.setDesignId(designId);
        deployLog.setConnectionId(connectionId);
        deployLog.setSqlText(sqlText);
        deployLog.setExecutedBy(username != null ? username : "System");

        try {
            Class.forName(driverClass);
            try (Connection conn = DriverManager.getConnection(jdbcUrl, dbConn.getUserId(), plainPassword);
                 Statement stmt = conn.createStatement()) {
                
                // Execute DDL statements split by semicolon
                String[] statements = sqlText.split(";");
                for (String sql : statements) {
                    String trimmed = sql.trim();
                    if (!trimmed.isEmpty() && !trimmed.startsWith("--")) {
                        stmt.execute(trimmed);
                    }
                }
                deployLog.setResultStatus("SUCCESS");
                deployLog.setErrorMessage("DDL executed successfully on target DB.");
                
                // Update design session status to DEPLOYED
                mapper.updateDesignSessionStatus(designId, "DEPLOYED");
            }
        } catch (Exception e) {
            log.error("Failed to deploy DDL", e);
            deployLog.setResultStatus("FAIL");
            deployLog.setErrorMessage("DDL execution failed: " + e.getMessage());
        }

        mapper.insertDeployLog(deployLog);
        return deployLog;
    }

    public List<DbDeployLog> getDeployLogsByDesignId(UUID designId) {
        return mapper.findDeployLogsByDesignId(designId);
    }
}
