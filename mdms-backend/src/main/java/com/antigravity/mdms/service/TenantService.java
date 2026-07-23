package com.antigravity.mdms.service;

import com.antigravity.mdms.mapper.TenantMapper;
import com.antigravity.mdms.model.Tenant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class TenantService {

    private final TenantMapper tenantMapper;

    public TenantService(TenantMapper tenantMapper) {
        this.tenantMapper = tenantMapper;
    }

    @Transactional
    public Tenant registerTenant(String name) {
        // Sanitize schema name to prevent SQL injection and comply with PostgreSQL schema limits
        String schemaName = "tenant_" + name.trim().toLowerCase().replaceAll("[^a-z0-9_]", "_");
        if (schemaName.length() > 50) {
            schemaName = schemaName.substring(0, 50);
        }
        
        // Ensure uniqueness of tenant name and schema
        if (tenantMapper.findByName(name) != null) {
            throw new IllegalArgumentException("Tenant name already exists");
        }
        if (tenantMapper.findBySchemaName(schemaName) != null) {
            schemaName += "_" + UUID.randomUUID().toString().substring(0, 8);
        }

        // Create PostgreSQL schema
        tenantMapper.createSchema(schemaName);

        // Create isolation tables inside the new schema
        tenantMapper.createDataSourceTable(schemaName);
        tenantMapper.createMetadataSchemaTable(schemaName);
        tenantMapper.createMetadataTableTable(schemaName);
        tenantMapper.createMetadataColumnTable(schemaName);
        tenantMapper.createIngestionJobTable(schemaName);
        
        tenantMapper.createDomainTable(schemaName);
        tenantMapper.createForbiddenWordTable(schemaName);
        tenantMapper.createStandardWordTable(schemaName);
        tenantMapper.createStandardTermTable(schemaName);

        // Persist globally
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setName(name);
        tenant.setSchemaName(schemaName);
        tenant.setStatus("ACTIVE");
        tenantMapper.insert(tenant);

        return tenant;
    }

    public Tenant getTenantById(UUID id) {
        return tenantMapper.findById(id);
    }
}
