package com.antigravity.mdms.service;

import com.antigravity.mdms.config.EncryptionUtil;
import com.antigravity.mdms.mapper.DataSourceMapper;
import com.antigravity.mdms.model.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DataSourceService {

    private static final Logger log = LoggerFactory.getLogger(DataSourceService.class);
    private final DataSourceMapper dataSourceMapper;
    private final EncryptionUtil encryptionUtil;

    public DataSourceService(DataSourceMapper dataSourceMapper, EncryptionUtil encryptionUtil) {
        this.dataSourceMapper = dataSourceMapper;
        this.encryptionUtil = encryptionUtil;
    }

    public List<DataSource> getAllDataSources() {
        return dataSourceMapper.findAll();
    }

    public DataSource getDataSourceById(UUID id) {
        return dataSourceMapper.findById(id);
    }

    public DataSource createDataSource(DataSource dataSource) {
        dataSource.setId(UUID.randomUUID());
        // Encrypt the target database connection password before storage
        dataSource.setPasswordEncrypted(encryptionUtil.encrypt(dataSource.getPasswordEncrypted()));
        dataSource.setStatus("DISCONNECTED");
        dataSourceMapper.insert(dataSource);
        return dataSource;
    }

    public void updateDataSource(DataSource dataSource) {
        DataSource existing = dataSourceMapper.findById(dataSource.getId());
        if (existing != null) {
            if (dataSource.getPasswordEncrypted() != null && !dataSource.getPasswordEncrypted().isEmpty()) {
                dataSource.setPasswordEncrypted(encryptionUtil.encrypt(dataSource.getPasswordEncrypted()));
            } else {
                dataSource.setPasswordEncrypted(existing.getPasswordEncrypted());
            }
            dataSourceMapper.update(dataSource);
        }
    }

    public void deleteDataSource(UUID id) {
        dataSourceMapper.delete(id);
    }

    public boolean testConnection(UUID id) {
        DataSource ds = dataSourceMapper.findById(id);
        if (ds == null) return false;
        
        boolean success = testJdbcConnection(
            ds.getDbType(),
            ds.getHost(),
            ds.getPort(),
            ds.getDatabaseName(),
            ds.getUsername(),
            encryptionUtil.decrypt(ds.getPasswordEncrypted())
        );

        dataSourceMapper.updateStatus(id, success ? "CONNECTED" : "ERROR");
        return success;
    }

    public boolean testJdbcConnection(String dbType, String host, int port, String databaseName, String username, String decryptedPassword) {
        List<String> hostsToTry = new ArrayList<>();
        if (host != null && !host.trim().isEmpty()) {
            hostsToTry.add(host.trim());
        }
        if ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host)) {
            hostsToTry.add("host.docker.internal");
        } else if ("host.docker.internal".equalsIgnoreCase(host)) {
            hostsToTry.add("localhost");
        }

        for (String targetHost : hostsToTry) {
            String url = buildJdbcUrl(dbType, targetHost, port, databaseName);
            String driverClass = getDriverClass(dbType);
            if (url == null) return false;

            try {
                if (driverClass != null) {
                    try {
                        Class.forName(driverClass);
                    } catch (ClassNotFoundException ce) {
                        log.warn("JDBC driver class {} not found, using dynamic drivers", driverClass);
                    }
                }
                try (Connection conn = DriverManager.getConnection(url, username, decryptedPassword)) {
                    if (conn.isValid(5)) {
                        return true;
                    }
                }
            } catch (Exception e) {
                log.warn("JDBC connection test attempt failed for {}: {}", targetHost, e.getMessage());
            }
        }
        log.error("JDBC connection test failed for {} database across all host targets: {}", dbType, hostsToTry);
        return false;
    }

    public static String buildJdbcUrl(String dbType, String host, int port, String databaseName) {
        if ("POSTGRESQL".equalsIgnoreCase(dbType)) {
            return String.format("jdbc:postgresql://%s:%d/%s", host, port, databaseName);
        } else if ("MYSQL".equalsIgnoreCase(dbType)) {
            return String.format("jdbc:mysql://%s:%d/%s", host, port, databaseName);
        } else if ("ORACLE".equalsIgnoreCase(dbType)) {
            return String.format("jdbc:oracle:thin:@//%s:%d/%s", host, port, databaseName);
        } else if ("MSSQL".equalsIgnoreCase(dbType)) {
            return String.format("jdbc:sqlserver://%s:%d;databaseName=%s;encrypt=true;trustServerCertificate=true", host, port, databaseName);
        } else if ("TIBERO".equalsIgnoreCase(dbType)) {
            return String.format("jdbc:tibero:thin:@%s:%d:%s", host, port, databaseName);
        }
        return null;
    }

    public static String getDriverClass(String dbType) {
        if ("POSTGRESQL".equalsIgnoreCase(dbType)) return "org.postgresql.Driver";
        if ("MYSQL".equalsIgnoreCase(dbType)) return "com.mysql.cj.jdbc.Driver";
        if ("ORACLE".equalsIgnoreCase(dbType)) return "oracle.jdbc.OracleDriver";
        if ("MSSQL".equalsIgnoreCase(dbType)) return "com.microsoft.sqlserver.jdbc.SQLServerDriver";
        if ("TIBERO".equalsIgnoreCase(dbType)) return "com.tmax.tibero.jdbc.TbDriver";
        return null;
    }
}
