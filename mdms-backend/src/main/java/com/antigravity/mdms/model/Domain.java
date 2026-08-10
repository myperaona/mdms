package com.antigravity.mdms.model;

import java.time.Instant;
import java.util.UUID;

public class Domain {
    private UUID id;
    private UUID tenantId;
    private String domainGroup;
    private String domainClassification;
    private String name;
    private String dataType;
    private Integer dataLength;
    private Integer decimalLength;
    private String storageFormat;
    private String expressionFormat;
    private String unit;
    private String allowedValues;
    private String description;
    private Instant createdAt;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public String getDomainGroup() { return domainGroup; }
    public void setDomainGroup(String domainGroup) { this.domainGroup = domainGroup; }

    public String getDomainClassification() { return domainClassification; }
    public void setDomainClassification(String domainClassification) { this.domainClassification = domainClassification; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDataType() { return dataType; }
    public void setDataType(String dataType) { this.dataType = dataType; }

    public Integer getDataLength() { return dataLength; }
    public void setDataLength(Integer dataLength) { this.dataLength = dataLength; }

    public Integer getDecimalLength() { return decimalLength; }
    public void setDecimalLength(Integer decimalLength) { this.decimalLength = decimalLength; }

    public String getStorageFormat() { return storageFormat; }
    public void setStorageFormat(String storageFormat) { this.storageFormat = storageFormat; }

    public String getExpressionFormat() { return expressionFormat; }
    public void setExpressionFormat(String expressionFormat) { this.expressionFormat = expressionFormat; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getAllowedValues() { return allowedValues; }
    public void setAllowedValues(String allowedValues) { this.allowedValues = allowedValues; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
