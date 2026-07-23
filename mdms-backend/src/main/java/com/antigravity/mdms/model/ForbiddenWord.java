package com.antigravity.mdms.model;

import java.time.Instant;
import java.util.UUID;

public class ForbiddenWord {
    private UUID id;
    private UUID tenantId;
    private String word;
    private String replacement;
    private String description;
    private Instant createdAt;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public String getWord() { return word; }
    public void setWord(String word) { this.word = word; }

    public String getReplacement() { return replacement; }
    public void setReplacement(String replacement) { this.replacement = replacement; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
