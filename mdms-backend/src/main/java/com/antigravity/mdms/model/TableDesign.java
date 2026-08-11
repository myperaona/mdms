package com.antigravity.mdms.model;

import java.time.Instant;
import java.util.UUID;

public class TableDesign {
    private UUID tableDesignId;
    private UUID designId;
    private UUID subjectAreaId;
    private String tableLogicName;
    private String tablePhysicalName;
    private String description;
    private String version;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;

    // Join helper attribute
    private String subjectAreaName;
    private Integer columnCount;

    public UUID getTableDesignId() { return tableDesignId; }
    public void setTableDesignId(UUID tableDesignId) { this.tableDesignId = tableDesignId; }

    public UUID getDesignId() { return designId; }
    public void setDesignId(UUID designId) { this.designId = designId; }

    public UUID getSubjectAreaId() { return subjectAreaId; }
    public void setSubjectAreaId(UUID subjectAreaId) { this.subjectAreaId = subjectAreaId; }

    public String getTableLogicName() { return tableLogicName; }
    public void setTableLogicName(String tableLogicName) { this.tableLogicName = tableLogicName; }

    public String getTablePhysicalName() { return tablePhysicalName; }
    public void setTablePhysicalName(String tablePhysicalName) { this.tablePhysicalName = tablePhysicalName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getSubjectAreaName() { return subjectAreaName; }
    public void setSubjectAreaName(String subjectAreaName) { this.subjectAreaName = subjectAreaName; }

    public Integer getColumnCount() { return columnCount; }
    public void setColumnCount(Integer columnCount) { this.columnCount = columnCount; }
}
