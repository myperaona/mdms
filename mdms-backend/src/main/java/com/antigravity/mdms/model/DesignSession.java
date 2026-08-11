package com.antigravity.mdms.model;

import java.time.Instant;
import java.util.UUID;

public class DesignSession {
    private UUID designId;
    private UUID tenantId;
    private String designName;
    private String systemName;
    private String description;
    private String version;
    private String status; // DRAFT, REVIEW, CONFIRMED, DEPLOYED
    private String createdBy;
    private Instant createdAt;
    private Instant updatedAt;

    public UUID getDesignId() { return designId; }
    public void setDesignId(UUID designId) { this.designId = designId; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public String getDesignName() { return designName; }
    public void setDesignName(String designName) { this.designName = designName; }

    public String getSystemName() { return systemName; }
    public void setSystemName(String systemName) { this.systemName = systemName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
