package com.antigravity.mdms.model;

import java.util.UUID;

public class ErdRelation {
    private UUID relationId;
    private UUID designId;
    private UUID fromTableId;
    private UUID toTableId;
    private UUID fromColumnId;
    private UUID toColumnId;
    private String relationType;
    private String cardinality;

    public UUID getRelationId() { return relationId; }
    public void setRelationId(UUID relationId) { this.relationId = relationId; }

    public UUID getDesignId() { return designId; }
    public void setDesignId(UUID designId) { this.designId = designId; }

    public UUID getFromTableId() { return fromTableId; }
    public void setFromTableId(UUID fromTableId) { this.fromTableId = fromTableId; }

    public UUID getToTableId() { return toTableId; }
    public void setToTableId(UUID toTableId) { this.toTableId = toTableId; }

    public UUID getFromColumnId() { return fromColumnId; }
    public void setFromColumnId(UUID fromColumnId) { this.fromColumnId = fromColumnId; }

    public UUID getToColumnId() { return toColumnId; }
    public void setToColumnId(UUID toColumnId) { this.toColumnId = toColumnId; }

    public String getRelationType() { return relationType; }
    public void setRelationType(String relationType) { this.relationType = relationType; }

    public String getCardinality() { return cardinality; }
    public void setCardinality(String cardinality) { this.cardinality = cardinality; }
}
