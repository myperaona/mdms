package com.antigravity.mdms.model;

import java.time.Instant;
import java.util.UUID;

public class StandardTerm {
    private UUID id;
    private UUID tenantId;
    private String logicalName;
    private String physicalName;
    private String description;
    private String wordIds;
    private Instant createdAt;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public String getLogicalName() { return logicalName; }
    public void setLogicalName(String logicalName) { this.logicalName = logicalName; }

    public String getPhysicalName() { return physicalName; }
    public void setPhysicalName(String physicalName) { this.physicalName = physicalName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getWordIds() { return wordIds; }
    public void setWordIds(String wordIds) { this.wordIds = wordIds; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
