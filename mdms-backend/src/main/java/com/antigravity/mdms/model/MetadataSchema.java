package com.antigravity.mdms.model;

import java.time.OffsetDateTime;
import java.util.UUID;

public class MetadataSchema {
    private UUID id;
    private UUID dataSourceId;
    private String name;
    private String description;
    private OffsetDateTime createdAt;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getDataSourceId() { return dataSourceId; }
    public void setDataSourceId(UUID dataSourceId) { this.dataSourceId = dataSourceId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
