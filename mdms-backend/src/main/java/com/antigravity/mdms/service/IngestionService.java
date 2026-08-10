package com.antigravity.mdms.service;

import com.antigravity.mdms.config.EncryptionUtil;
import com.antigravity.mdms.config.TenantContext;
import com.antigravity.mdms.mapper.DataSourceMapper;
import com.antigravity.mdms.mapper.MetadataCatalogMapper;
import com.antigravity.mdms.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class IngestionService {
    private static final Logger log = LoggerFactory.getLogger(IngestionService.class);

    private final DataSourceMapper dataSourceMapper;
    private final EncryptionUtil encryptionUtil;
    private final MetadataPersistenceService persistenceService;

    public IngestionService(DataSourceMapper dataSourceMapper, EncryptionUtil encryptionUtil, 
                            MetadataPersistenceService persistenceService) {
        this.dataSourceMapper = dataSourceMapper;
        this.encryptionUtil = encryptionUtil;
        this.persistenceService = persistenceService;
    }

    @Async
    public void runIngestionAsync(UUID dataSourceId, String tenantSchemaName, String tenantId) {
        // Set tenant context for this background thread
        TenantContext.setCurrentTenantSchema(tenantSchemaName);
        TenantContext.setCurrentTenantId(tenantId);
        try {
            runIngestionSync(dataSourceId);
        } finally {
            TenantContext.clear();
        }
    }

    public void runIngestionSync(UUID dataSourceId) {
        DataSource ds = dataSourceMapper.findById(dataSourceId);
        if (ds == null) {
            throw new IllegalArgumentException("Data source not found");
        }

        IngestionJob job = new IngestionJob();
        job.setId(UUID.randomUUID());
        job.setDataSourceId(dataSourceId);
        job.setStatus("RUNNING");
        job.setStartedAt(OffsetDateTime.now());
        persistenceService.saveInitialJob(job);

        String decryptedPassword = encryptionUtil.decrypt(ds.getPasswordEncrypted());
        String url;
        String driverClass = null;

        if ("POSTGRESQL".equalsIgnoreCase(ds.getDbType())) {
            url = String.format("jdbc:postgresql://%s:%d/%s", ds.getHost(), ds.getPort(), ds.getDatabaseName());
            driverClass = "org.postgresql.Driver";
        } else if ("MYSQL".equalsIgnoreCase(ds.getDbType())) {
            url = String.format("jdbc:mysql://%s:%d/%s", ds.getHost(), ds.getPort(), ds.getDatabaseName());
            driverClass = "com.mysql.cj.jdbc.Driver";
        } else if ("ORACLE".equalsIgnoreCase(ds.getDbType())) {
            url = String.format("jdbc:oracle:thin:@//%s:%d/%s", ds.getHost(), ds.getPort(), ds.getDatabaseName());
            driverClass = "oracle.jdbc.OracleDriver";
        } else if ("MSSQL".equalsIgnoreCase(ds.getDbType())) {
            url = String.format("jdbc:sqlserver://%s:%d;databaseName=%s;encrypt=true;trustServerCertificate=true", ds.getHost(), ds.getPort(), ds.getDatabaseName());
            driverClass = "com.microsoft.sqlserver.jdbc.SQLServerDriver";
        } else if ("TIBERO".equalsIgnoreCase(ds.getDbType())) {
            url = String.format("jdbc:tibero:thin:@%s:%d:%s", ds.getHost(), ds.getPort(), ds.getDatabaseName());
            driverClass = "com.tmax.tibero.jdbc.TbDriver";
        } else {
            persistenceService.updateJobStatus(job, "FAILED", "Unsupported database type: " + ds.getDbType(), dataSourceId, "ERROR");
            return;
        }

        try {
            if (driverClass != null) {
                Class.forName(driverClass);
            }
        } catch (Exception e) {
            log.warn("Could not explicitly load driver class: {} - attempting connection anyway", driverClass);
        }

        try (Connection conn = DriverManager.getConnection(url, ds.getUsername(), decryptedPassword)) {
            DatabaseMetaData metaData = conn.getMetaData();
            
            List<MetadataSchema> schemas = new ArrayList<>();
            List<MetadataTable> tables = new ArrayList<>();
            List<MetadataColumn> columns = new ArrayList<>();

            // Ingest schemas
            String catalog = conn.getCatalog();
            Set<String> schemaNames = new HashSet<>();
            
            try (ResultSet rsSchemas = metaData.getSchemas(catalog, null)) {
                while (rsSchemas.next()) {
                    String sName = rsSchemas.getString("TABLE_SCHEM");
                    if (!isSystemSchema(sName)) {
                        schemaNames.add(sName);
                    }
                }
            }

            // In case schemas are empty (e.g. MySQL catalogs)
            if (schemaNames.isEmpty()) {
                schemaNames.add(ds.getDatabaseName());
            }

            for (String sName : schemaNames) {
                MetadataSchema schemaEntity = new MetadataSchema();
                schemaEntity.setId(UUID.randomUUID());
                schemaEntity.setDataSourceId(dataSourceId);
                schemaEntity.setName(sName);
                schemaEntity.setDescription("Ingested schema: " + sName);
                schemas.add(schemaEntity);

                // Fetch tables inside the schema
                String schemaPattern = "MYSQL".equalsIgnoreCase(ds.getDbType()) ? null : sName;
                try (ResultSet rsTables = metaData.getTables(catalog, schemaPattern, "%", new String[]{"TABLE", "VIEW"})) {
                    while (rsTables.next()) {
                        String tName = rsTables.getString("TABLE_NAME");
                        MetadataTable tableEntity = new MetadataTable();
                        tableEntity.setId(UUID.randomUUID());
                        tableEntity.setSchemaId(schemaEntity.getId());
                        tableEntity.setName(tName);
                        tableEntity.setDescription("");
                        tableEntity.setRowCountEstimate(0L);
                        tables.add(tableEntity);

                        // Fetch Primary Keys
                        Set<String> primaryKeys = new HashSet<>();
                        try (ResultSet rsPK = metaData.getPrimaryKeys(catalog, schemaPattern, tName)) {
                            while (rsPK.next()) {
                                primaryKeys.add(rsPK.getString("COLUMN_NAME"));
                            }
                        }

                        // Fetch Foreign Keys
                        Map<String, String[]> foreignKeys = new HashMap<>(); // colName -> [refTable, refCol]
                        try (ResultSet rsFK = metaData.getImportedKeys(catalog, schemaPattern, tName)) {
                            while (rsFK.next()) {
                                String fkColName = rsFK.getString("FKCOLUMN_NAME");
                                String pkTabName = rsFK.getString("PKTABLE_NAME");
                                String pkColName = rsFK.getString("PKCOLUMN_NAME");
                                foreignKeys.put(fkColName, new String[]{pkTabName, pkColName});
                            }
                        }

                        // Fetch Columns
                        try (ResultSet rsCols = metaData.getColumns(catalog, schemaPattern, tName, "%")) {
                            while (rsCols.next()) {
                                String cName = rsCols.getString("COLUMN_NAME");
                                String cType = rsCols.getString("TYPE_NAME");
                                int nullableInt = rsCols.getInt("NULLABLE");
                                boolean isNullable = nullableInt == DatabaseMetaData.columnNullable;

                                MetadataColumn colEntity = new MetadataColumn();
                                colEntity.setId(UUID.randomUUID());
                                colEntity.setTableId(tableEntity.getId());
                                colEntity.setName(cName);
                                colEntity.setDataType(cType);
                                colEntity.setNullable(isNullable);
                                colEntity.setPrimaryKey(primaryKeys.contains(cName));
                                colEntity.setForeignKey(foreignKeys.containsKey(cName));
                                if (colEntity.isForeignKey()) {
                                    String[] fkDetails = foreignKeys.get(cName);
                                    colEntity.setReferencedTable(fkDetails[0]);
                                    colEntity.setReferencedColumn(fkDetails[1]);
                                }
                                colEntity.setDescription("");
                                columns.add(colEntity);
                            }
                        }
                    }
                }
            }

            // Save all gathered metadata to local database in a single fast transaction
            persistenceService.saveIngestedMetadata(dataSourceId, schemas, tables, columns, job, 
                "SUCCESS", "Metadata ingestion completed successfully.", "CONNECTED");

        } catch (Exception e) {
            log.error("Ingestion failed", e);
            persistenceService.updateJobStatus(job, "FAILED", e.getMessage(), dataSourceId, "ERROR");
        }
    }

    private boolean isSystemSchema(String schemaName) {
        if (schemaName == null) return true;
        String s = schemaName.toLowerCase();
        return s.startsWith("pg_") || s.equals("information_schema") || s.equals("sys") || s.equals("db") || s.equals("mysql") 
            || s.equals("performance_schema") || s.equals("system") || s.equals("outln") || s.equals("db_owner") 
            || s.startsWith("db_") || s.equals("guest") || s.equals("syscat") || s.equals("sysgif");
    }
}
