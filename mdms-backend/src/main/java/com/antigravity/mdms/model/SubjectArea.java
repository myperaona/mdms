package com.antigravity.mdms.model;

import java.util.UUID;

public class SubjectArea {
    private UUID subjectAreaId;
    private UUID designId;
    private String subjectAreaName;
    private String subjectAreaCode;
    private UUID parentSubjectAreaId;
    private String description;
    private Integer sortOrder;
    private String useYn;

    // Join helper attribute
    private Integer termCount;

    public UUID getSubjectAreaId() { return subjectAreaId; }
    public void setSubjectAreaId(UUID subjectAreaId) { this.subjectAreaId = subjectAreaId; }

    public UUID getDesignId() { return designId; }
    public void setDesignId(UUID designId) { this.designId = designId; }

    public String getSubjectAreaName() { return subjectAreaName; }
    public void setSubjectAreaName(String subjectAreaName) { this.subjectAreaName = subjectAreaName; }

    public String getSubjectAreaCode() { return subjectAreaCode; }
    public void setSubjectAreaCode(String subjectAreaCode) { this.subjectAreaCode = subjectAreaCode; }

    public UUID getParentSubjectAreaId() { return parentSubjectAreaId; }
    public void setParentSubjectAreaId(UUID parentSubjectAreaId) { this.parentSubjectAreaId = parentSubjectAreaId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public String getUseYn() { return useYn; }
    public void setUseYn(String useYn) { this.useYn = useYn; }

    public Integer getTermCount() { return termCount; }
    public void setTermCount(Integer termCount) { this.termCount = termCount; }
}
