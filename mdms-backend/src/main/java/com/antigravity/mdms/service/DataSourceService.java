package com.antigravity.mdms.service;

import com.antigravity.mdms.config.EncryptionUtil;
import com.antigravity.mdms.mapper.DataSourceMapper;
import com.antigravity.mdms.model.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.DriverManager;
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
        String url;
        String driverClass = null;

        if ("POSTGRESQL".equalsIgnoreCase(dbType)) {
            url = String.format("jdbc:postgresql://%s:%d/%s", host, port, databaseName);
            driverClass = "org.postgresql.Driver";
        } else if ("MYSQL".equalsIgnoreCase(dbType)) {
            url = String.format("jdbc:mysql://%s:%d/%s", host, port, databaseName);
            driverClass = "com.mysql.cj.jdbc.Driver";
        } else if ("ORACLE".equalsIgnoreCase(dbType)) {
            url = String.format("jdbc:oracle:thin:@//%s:%d/%s", host, port, databaseName);
            driverClass = "oracle.jdbc.OracleDriver";
        } else if ("MSSQL".equalsIgnoreCase(dbType)) {
            url = String.format("jdbc:sqlserver://%s:%d;databaseName=%s;encrypt=true;trustServerCertificate=true", host, port, databaseName);
            driverClass = "com.microsoft.sqlserver.jdbc.SQLServerDriver";
        } else if ("TIBERO".equalsIgnoreCase(dbType)) {
            url = String.format("jdbc:tibero:thin:@%s:%d:%s", host, port, databaseName);
            driverClass = "com.tmax.tibero.jdbc.TbDriver";
        } else {
            return false;
        }

        try {
            if (driverClass != null) {
                try {
                    Class.forName(driverClass);
                } catch (ClassNotFoundException ce) {
                    log.warn("JDBC driver class {} not found in system classpath, relying on dynamically loaded drivers.", driverClass);
                }
            }
            try (Connection conn = DriverManager.getConnection(url, username, decryptedPassword)) {
                return conn.isValid(5);
            }
        } catch (Exception e) {
            log.error("JDBC connection test failed for {} database: {}", dbType, e.getMessage());
            return false;
        }
    }
}
