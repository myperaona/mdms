package com.antigravity.mdms.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.net.URL;
import java.net.URLClassLoader;
import java.sql.Driver;
import java.sql.DriverManager;
import java.util.*;

@Component
public class DynamicJdbcDriverLoader {
    private static final Logger log = LoggerFactory.getLogger(DynamicJdbcDriverLoader.class);
    private static final String DRIVERS_DIR = "./drivers";
    private final List<String> loadedJarNames = new ArrayList<>();

    @PostConstruct
    public void init() {
        loadDriversFromDirectory();
    }

    public synchronized void loadDriversFromDirectory() {
        File dir = new File(DRIVERS_DIR);
        if (!dir.exists()) {
            if (dir.mkdirs()) {
                log.info("Created custom JDBC drivers directory at: {}", dir.getAbsolutePath());
            }
        }

        File[] files = dir.listFiles((d, name) -> name.toLowerCase().endsWith(".jar"));
        if (files == null) return;

        for (File file : files) {
            if (!loadedJarNames.contains(file.getName())) {
                loadDriverJar(file);
            }
        }
    }

    public synchronized boolean loadDriverJar(File jarFile) {
        try {
            log.info("Attempting to dynamically load custom JDBC jar: {}", jarFile.getName());
            URL url = jarFile.toURI().toURL();
            URLClassLoader classLoader = new URLClassLoader(new URL[]{url}, Thread.currentThread().getContextClassLoader());

            // 1. SPI Service Loader scan (Modern JDBC standard)
            ServiceLoader<Driver> serviceLoader = ServiceLoader.load(Driver.class, classLoader);
            boolean registeredAny = false;

            for (Driver driver : serviceLoader) {
                DriverManager.registerDriver(new DriverShim(driver));
                log.info("Successfully registered SPI custom Driver: {} from {}", driver.getClass().getName(), jarFile.getName());
                registeredAny = true;
            }

            // 2. Fallback scan for common proprietary drivers if SPI returned empty
            if (!registeredAny) {
                String[] fallbackDrivers = {
                    "com.tmax.tibero.jdbc.TbDriver",
                    "oracle.jdbc.OracleDriver",
                    "com.microsoft.sqlserver.jdbc.SQLServerDriver",
                    "com.mysql.cj.jdbc.Driver"
                };

                for (String className : fallbackDrivers) {
                    try {
                        Class<?> clazz = Class.forName(className, true, classLoader);
                        if (Driver.class.isAssignableFrom(clazz)) {
                            Driver driver = (Driver) clazz.getDeclaredConstructor().newInstance();
                            DriverManager.registerDriver(new DriverShim(driver));
                            log.info("Successfully registered Fallback custom Driver: {} from {}", className, jarFile.getName());
                            registeredAny = true;
                        }
                    } catch (ClassNotFoundException e) {
                        // Driver class not in this jar, proceed silently
                    }
                }
            }

            if (registeredAny) {
                if (!loadedJarNames.contains(jarFile.getName())) {
                    loadedJarNames.add(jarFile.getName());
                }
                return true;
            } else {
                log.warn("No valid java.sql.Driver implementations found inside: {}", jarFile.getName());
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to load driver jar file: " + jarFile.getName(), e);
            return false;
        }
    }

    public List<String> getLoadedJarNames() {
        return new ArrayList<>(loadedJarNames);
    }

    public synchronized void clearDrivers() {
        // Deregister DriverShims
        try {
            Enumeration<Driver> drivers = DriverManager.getDrivers();
            while (drivers.hasMoreElements()) {
                Driver d = drivers.nextElement();
                if (d instanceof DriverShim) {
                    DriverManager.deregisterDriver(d);
                    log.info("Deregistered custom driver shim: {}", d.getClass().getName());
                }
            }
        } catch (Exception e) {
            log.error("Failed to deregister drivers", e);
        }

        // Clean up files in `./drivers`
        File dir = new File(DRIVERS_DIR);
        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File f : files) {
                    if (f.isFile() && f.getName().toLowerCase().endsWith(".jar")) {
                        if (f.delete()) {
                            log.info("Deleted custom driver jar: {}", f.getName());
                        }
                    }
                }
            }
        }

        loadedJarNames.clear();
    }
}
