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
            String trimmed = rawHost.trim();
            hosts.add(trimmed);
            // If running inside Docker container and target DB is on host machine or local network,
            // also try host.docker.internal and container name as fallbacks
            if (!"host.docker.internal".equalsIgnoreCase(trimmed)) {
                hosts.add("host.docker.internal");
            }
            if ("localhost".equalsIgnoreCase(trimmed) || "127.0.0.1".equalsIgnoreCase(trimmed)) {
                hosts.add("mariadb-container");
            }
        }
        return hosts;
    }

    public String parseHostFromUrl(String url) {
        if (url == null) return null;
        if (url.contains("://")) {
            String temp = url.substring(url.indexOf("://") + 3);
            if (temp.contains(":")) {
                return temp.substring(0, temp.indexOf(":"));
            } else if (temp.contains("/")) {
                return temp.substring(0, temp.indexOf("/"));
            } else if (temp.contains(";")) {
                return temp.substring(0, temp.indexOf(";"));
            }
            return temp;
        } else if (url.contains("@")) {
            String temp = url.substring(url.indexOf("@") + 1);
            if (temp.startsWith("//")) {
                temp = temp.substring(2);
            }
            if (temp.contains(":")) {
                return temp.substring(0, temp.indexOf(":"));
            } else if (temp.contains("/")) {
                return temp.substring(0, temp.indexOf("/"));
            }
            return temp;
        }
        return null;
    }

    public Connection createConnection(String dbType, String url, String username, String password) throws Exception {
        driverLoader.loadDriversFromDirectory();
        
        // Parse host from URL (supports both :// and @ formats)
        String host = parseHostFromUrl(url);

        List<String> hostsToTry = buildTargetHosts(host);
        Connection conn = null;
        Exception lastException = null;

        if (!hostsToTry.isEmpty()) {
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
        }

        // Fallback: If no connection succeeded or hostsToTry was empty, try the exact URL directly
        if (conn == null) {
            try {
                conn = DriverManager.getConnection(url, username, password);
                if (conn != null && !conn.isClosed()) {
                    log.info("Successfully established connection using fallback original URL: {}", url);
                }
            } catch (Exception e) {
                if (lastException == null) lastException = e;
                log.warn("Failed connection attempt to original URL: {}. Reason: {}", url, e.getMessage());
            }
        }

        if (conn == null) {
            if (lastException != null) {
                throw lastException;
            } else {
                throw new SQLException("Could not connect to target database for URL: " + url);
            }
        }

        return conn;
    }
}
