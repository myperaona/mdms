package com.antigravity.mdms.model;

import java.util.UUID;

public class ErdEntity {
    private UUID entityId;
    private UUID designId;
    private UUID tableDesignId;
    private Integer positionX;
    private Integer positionY;
    private Integer width;
    private Integer height;

    public UUID getEntityId() { return entityId; }
    public void setEntityId(UUID entityId) { this.entityId = entityId; }

    public UUID getDesignId() { return designId; }
    public void setDesignId(UUID designId) { this.designId = designId; }

    public UUID getTableDesignId() { return tableDesignId; }
    public void setTableDesignId(UUID tableDesignId) { this.tableDesignId = tableDesignId; }

    public Integer getPositionX() { return positionX; }
    public void setPositionX(Integer positionX) { this.positionX = positionX; }

    public Integer getPositionY() { return positionY; }
    public void setPositionY(Integer positionY) { this.positionY = positionY; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }
}
