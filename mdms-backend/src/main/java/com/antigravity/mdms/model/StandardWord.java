package com.antigravity.mdms.model;

import java.time.Instant;
import java.util.UUID;

public class StandardWord {
    private UUID id;
    private UUID tenantId;
    private String logicalName;
    private String physicalName;
    private String englishName;
    private UUID domainId;
    private Boolean isFormatWord;
    private String synonyms;
    private String forbiddenWords;
    private String description;
    private Instant createdAt;

    // Join helper attribute
    private String domainName;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public String getLogicalName() { return logicalName; }
    public void setLogicalName(String logicalName) { this.logicalName = logicalName; }

    public String getPhysicalName() { return physicalName; }
    public void setPhysicalName(String physicalName) { this.physicalName = physicalName; }

    public String getEnglishName() { return englishName; }
    public void setEnglishName(String englishName) { this.englishName = englishName; }

    public UUID getDomainId() { return domainId; }
    public void setDomainId(UUID domainId) { this.domainId = domainId; }

    public Boolean getIsFormatWord() { return isFormatWord; }
    public void setIsFormatWord(Boolean isFormatWord) { this.isFormatWord = isFormatWord; }

    public String getSynonyms() { return synonyms; }
    public void setSynonyms(String synonyms) { this.synonyms = synonyms; }

    public String getForbiddenWords() { return forbiddenWords; }
    public void setForbiddenWords(String forbiddenWords) { this.forbiddenWords = forbiddenWords; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getDomainName() { return domainName; }
    public void setDomainName(String domainName) { this.domainName = domainName; }
}
