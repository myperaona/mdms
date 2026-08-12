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
    private final JdbcConnectionProvider jdbcConnectionProvider;

    public DataSourceService(DataSourceMapper dataSourceMapper, EncryptionUtil encryptionUtil, JdbcConnectionProvider jdbcConnectionProvider) {
        this.dataSourceMapper = dataSourceMapper;
        this.encryptionUtil = encryptionUtil;
        this.jdbcConnectionProvider = jdbcConnectionProvider;
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
        return pingDataSource(id);
    }

    public boolean pingDataSource(UUID id) {
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
        String url = buildJdbcUrl(dbType, host, port, databaseName);
        if (url == null) return false;

        try (Connection conn = jdbcConnectionProvider.createConnection(dbType, url, username, decryptedPassword)) {
            return conn != null && conn.isValid(5);
        } catch (Exception e) {
            log.warn("JDBC connection test failed for {}: {}", dbType, e.getMessage());
            return false;
        }
    }

    public static String buildJdbcUrl(String dbType, String host, int port, String databaseName) {
        if (dbType == null) return null;
        String typeUpper = dbType.toUpperCase();
        if (typeUpper.contains("POSTGRES")) {
            return String.format("jdbc:postgresql://%s:%d/%s", host, port, databaseName);
        } else if (typeUpper.contains("MARIA") || typeUpper.contains("MYSQL")) {
            return String.format("jdbc:mariadb://%s:%d/%s", host, port, databaseName);
        } else if (typeUpper.contains("ORACLE")) {
            return String.format("jdbc:oracle:thin:@//%s:%d/%s", host, port, databaseName);
        } else if (typeUpper.contains("MSSQL") || typeUpper.contains("SQLSERVER")) {
            return String.format("jdbc:sqlserver://%s:%d;databaseName=%s;encrypt=true;trustServerCertificate=true", host, port, databaseName);
        } else if (typeUpper.contains("TIBERO")) {
            return String.format("jdbc:tibero:thin:@%s:%d:%s", host, port, databaseName);
        }
        return String.format("jdbc:postgresql://%s:%d/%s", host, port, databaseName);
    }

    public static String getDriverClass(String dbType) {
        if (dbType == null) return "org.postgresql.Driver";
        String typeUpper = dbType.toUpperCase();
        if (typeUpper.contains("POSTGRES")) return "org.postgresql.Driver";
        if (typeUpper.contains("MARIA")) return "org.mariadb.jdbc.Driver";
        if (typeUpper.contains("MYSQL")) return "com.mysql.cj.jdbc.Driver";
        if (typeUpper.contains("ORACLE")) return "oracle.jdbc.OracleDriver";
        if (typeUpper.contains("MSSQL") || typeUpper.contains("SQLSERVER")) return "com.microsoft.sqlserver.jdbc.SQLServerDriver";
        if (typeUpper.contains("TIBERO")) return "com.tmax.tibero.jdbc.TbDriver";
        return "org.postgresql.Driver";
    }
}
