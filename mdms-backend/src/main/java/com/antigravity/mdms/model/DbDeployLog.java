package com.antigravity.mdms.model;

import java.time.Instant;
import java.util.UUID;

public class DbDeployLog {
    private UUID deployLogId;
    private UUID designId;
    private UUID tableDesignId;
    private UUID connectionId;
    private String sqlText;
    private Instant executedAt;
    private String executedBy;
    private String resultStatus; // SUCCESS, FAIL
    private String errorMessage;

    // Join helper attribute
    private String connectionName;

    public UUID getDeployLogId() { return deployLogId; }
    public void setDeployLogId(UUID deployLogId) { this.deployLogId = deployLogId; }

    public UUID getDesignId() { return designId; }
    public void setDesignId(UUID designId) { this.designId = designId; }

    public UUID getTableDesignId() { return tableDesignId; }
    public void setTableDesignId(UUID tableDesignId) { this.tableDesignId = tableDesignId; }

    public UUID getConnectionId() { return connectionId; }
    public void setConnectionId(UUID connectionId) { this.connectionId = connectionId; }

    public String getSqlText() { return sqlText; }
    public void setSqlText(String sqlText) { this.sqlText = sqlText; }

    public Instant getExecutedAt() { return executedAt; }
    public void setExecutedAt(Instant executedAt) { this.executedAt = executedAt; }

    public String getExecutedBy() { return executedBy; }
    public void setExecutedBy(String executedBy) { this.executedBy = executedBy; }

    public String getResultStatus() { return resultStatus; }
    public void setResultStatus(String resultStatus) { this.resultStatus = resultStatus; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getConnectionName() { return connectionName; }
    public void setConnectionName(String connectionName) { this.connectionName = connectionName; }
}
