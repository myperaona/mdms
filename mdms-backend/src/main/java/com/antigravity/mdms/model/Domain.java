package com.antigravity.mdms.model;

import java.time.Instant;
import java.util.UUID;

public class Domain {
    private UUID id;
    private UUID tenantId;
    private String name;
    private String dataType;
    private Integer length;
    private Integer precisionVal;
    private String formatPattern;
    private String description;
    private Instant createdAt;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDataType() { return dataType; }
    public void setDataType(String dataType) { this.dataType = dataType; }

    public Integer getLength() { return length; }
    public void setLength(Integer length) { this.length = length; }

    public Integer getPrecisionVal() { return precisionVal; }
    public void setPrecisionVal(Integer precisionVal) { this.precisionVal = precisionVal; }

    public String getFormatPattern() { return formatPattern; }
    public void setFormatPattern(String formatPattern) { this.formatPattern = formatPattern; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
