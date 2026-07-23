package com.antigravity.mdms.model;

import java.time.OffsetDateTime;
import java.util.UUID;

public class MetadataColumn {
    private UUID id;
    private UUID tableId;
    private String name;
    private String dataType;
    private boolean nullable;
    private boolean primaryKey;
    private boolean foreignKey;
    private String referencedTable;
    private String referencedColumn;
    private String description;
    private OffsetDateTime createdAt;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTableId() { return tableId; }
    public void setTableId(UUID tableId) { this.tableId = tableId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDataType() { return dataType; }
    public void setDataType(String dataType) { this.dataType = dataType; }

    public boolean isNullable() { return nullable; }
    public void setNullable(boolean nullable) { this.nullable = nullable; }

    public boolean isPrimaryKey() { return primaryKey; }
    public void setPrimaryKey(boolean primaryKey) { this.primaryKey = primaryKey; }

    public boolean isForeignKey() { return foreignKey; }
    public void setForeignKey(boolean foreignKey) { this.foreignKey = foreignKey; }

    public String getReferencedTable() { return referencedTable; }
    public void setReferencedTable(String referencedTable) { this.referencedTable = referencedTable; }

    public String getReferencedColumn() { return referencedColumn; }
    public void setReferencedColumn(String referencedColumn) { this.referencedColumn = referencedColumn; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
