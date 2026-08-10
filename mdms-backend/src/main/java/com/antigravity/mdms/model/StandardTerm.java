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
    private String commonDomainName;
    private String allowedValues;
    private String storageFormat;
    private String expressionFormat;
    private String adminCodeName;
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

    public String getCommonDomainName() { return commonDomainName; }
    public void setCommonDomainName(String commonDomainName) { this.commonDomainName = commonDomainName; }

    public String getAllowedValues() { return allowedValues; }
    public void setAllowedValues(String allowedValues) { this.allowedValues = allowedValues; }

    public String getStorageFormat() { return storageFormat; }
    public void setStorageFormat(String storageFormat) { this.storageFormat = storageFormat; }

    public String getExpressionFormat() { return expressionFormat; }
    public void setExpressionFormat(String expressionFormat) { this.expressionFormat = expressionFormat; }

    public String getAdminCodeName() { return adminCodeName; }
    public void setAdminCodeName(String adminCodeName) { this.adminCodeName = adminCodeName; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
