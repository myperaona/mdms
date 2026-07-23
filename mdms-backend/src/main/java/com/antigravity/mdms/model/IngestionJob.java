package com.antigravity.mdms.model;

import java.time.OffsetDateTime;
import java.util.UUID;

public class IngestionJob {
    private UUID id;
    private UUID dataSourceId;
    private String status; // PENDING, RUNNING, SUCCESS, FAILED
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;
    private String logMessage;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getDataSourceId() { return dataSourceId; }
    public void setDataSourceId(UUID dataSourceId) { this.dataSourceId = dataSourceId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }

    public OffsetDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(OffsetDateTime endedAt) { this.endedAt = endedAt; }

    public String getLogMessage() { return logMessage; }
    public void setLogMessage(String logMessage) { this.logMessage = logMessage; }
}
