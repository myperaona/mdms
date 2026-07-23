package com.antigravity.mdms.model;

import java.time.OffsetDateTime;
import java.util.UUID;

public class MetadataTable {
    private UUID id;
    private UUID schemaId;
    private String name;
    private String description;
    private Long rowCountEstimate;
    private OffsetDateTime createdAt;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getSchemaId() { return schemaId; }
    public void setSchemaId(UUID schemaId) { this.schemaId = schemaId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getRowCountEstimate() { return rowCountEstimate; }
    public void setRowCountEstimate(Long rowCountEstimate) { this.rowCountEstimate = rowCountEstimate; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
