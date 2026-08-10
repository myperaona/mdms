package com.antigravity.mdms.config;

import com.antigravity.mdms.mapper.TenantMapper;
import com.antigravity.mdms.model.Tenant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SchemaUpgradeRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaUpgradeRunner.class);
    private final TenantMapper tenantMapper;

    public SchemaUpgradeRunner(TenantMapper tenantMapper) {
        this.tenantMapper = tenantMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting schema upgrades for existing tenants...");
        try {
            List<Tenant> tenants = tenantMapper.findAll();
            for (Tenant tenant : tenants) {
                String schema = tenant.getSchemaName();
                if (schema != null && !schema.trim().isEmpty() && schema.matches("^[a-zA-Z0-9_]{1,63}$")) {
                    log.info("Checking and upgrading schema for tenant: {} (schema: {})", tenant.getName(), schema);
                    try {
                        tenantMapper.createDomainTable(schema);
                        tenantMapper.createForbiddenWordTable(schema);
                        tenantMapper.createStandardWordTable(schema);
                        tenantMapper.createStandardTermTable(schema);
                        tenantMapper.upgradeStandardTermTable(schema);
                        log.info("Schema upgrades successful for tenant: {}", tenant.getName());
                    } catch (Exception e) {
                        log.error("Failed to upgrade schema for tenant " + tenant.getName() + ": " + e.getMessage(), e);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch tenants for schema upgrade: " + e.getMessage(), e);
        }
        log.info("Schema upgrade process complete.");
    }
}
