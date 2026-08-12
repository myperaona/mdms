package com.antigravity.mdms.service;

import com.antigravity.mdms.config.DynamicJdbcDriverLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JdbcConnectionProvider {
    private static final Logger log = LoggerFactory.getLogger(JdbcConnectionProvider.class);
    private final DynamicJdbcDriverLoader driverLoader;

    public JdbcConnectionProvider(DynamicJdbcDriverLoader driverLoader) {
        this.driverLoader = driverLoader;
    }

    public List<String> buildTargetHosts(String rawHost) {
        List<String> hosts = new ArrayList<>();
        if (rawHost != null && !rawHost.trim().isEmpty()) {
            hosts.add(rawHost.trim());
        }
        if (rawHost != null && ("14.35.198.50".equals(rawHost.trim()) || rawHost.contains("14.35.198.50"))) {
            if (!hosts.contains("localhost")) hosts.add("localhost");
            if (!hosts.contains("127.0.0.1")) hosts.add("127.0.0.1");
            if (!hosts.contains("host.docker.internal")) hosts.add("host.docker.internal");
        } else if (rawHost != null && ("localhost".equals(rawHost.trim()) || "127.0.0.1".equals(rawHost.trim()))) {
            if (!hosts.contains("host.docker.internal")) hosts.add("host.docker.internal");
        }
        return hosts;
    }

    public Connection createConnection(String dbType, String url, String username, String password) throws Exception {
        driverLoader.loadDriversFromDirectory();
        
        // Parse host from URL
        String host = null;
        if (url != null && url.contains("://")) {
            String temp = url.substring(url.indexOf("://") + 3);
            if (temp.contains(":")) {
                host = temp.substring(0, temp.indexOf(":"));
            } else if (temp.contains("/")) {
                host = temp.substring(0, temp.indexOf("/"));
            }
        }

        List<String> hostsToTry = buildTargetHosts(host);
        Connection conn = null;
        Exception lastException = null;

        for (String targetHost : hostsToTry) {
            String targetUrl = (host != null && !targetHost.equalsIgnoreCase(host)) 
                ? url.replace(host, targetHost) 
                : url;
            try {
                conn = DriverManager.getConnection(targetUrl, username, password);
                if (conn != null && !conn.isClosed()) {
                    log.info("Successfully established connection using target URL: {}", targetUrl);
                    break;
                }
            } catch (Exception e) {
                lastException = e;
                log.warn("Failed connection attempt to URL: {}. Reason: {}", targetUrl, e.getMessage());
            }
        }

        if (conn == null) {
            if (lastException != null) {
                throw lastException;
            } else {
                throw new SQLException("Could not connect to target database across target hosts: " + hostsToTry);
            }
        }

        return conn;
    }
}
