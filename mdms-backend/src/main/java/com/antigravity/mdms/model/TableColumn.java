package com.antigravity.mdms.model;

import java.util.UUID;

public class TableColumn {
    private UUID columnId;
    private UUID tableDesignId;
    private UUID termId;
    private String columnLogicName;
    private String columnPhysicalName;
    private String dataType;
    private Integer length;
    private Integer precision;
    private Integer scale;
    private String nullableYn;
    private String defaultValue;
    private String pkYn;
    private String fkYn;
    private String uniqueYn;
    private Integer sortOrder;
    private String remark;

    public UUID getColumnId() { return columnId; }
    public void setColumnId(UUID columnId) { this.columnId = columnId; }

    public UUID getTableDesignId() { return tableDesignId; }
    public void setTableDesignId(UUID tableDesignId) { this.tableDesignId = tableDesignId; }

    public UUID getTermId() { return termId; }
    public void setTermId(UUID termId) { this.termId = termId; }

    public String getColumnLogicName() { return columnLogicName; }
    public void setColumnLogicName(String columnLogicName) { this.columnLogicName = columnLogicName; }

    public String getColumnPhysicalName() { return columnPhysicalName; }
    public void setColumnPhysicalName(String columnPhysicalName) { this.columnPhysicalName = columnPhysicalName; }

    public String getDataType() { return dataType; }
    public void setDataType(String dataType) { this.dataType = dataType; }

    public Integer getLength() { return length; }
    public void setLength(Integer length) { this.length = length; }

    public Integer getPrecision() { return precision; }
    public void setPrecision(Integer precision) { this.precision = precision; }

    public Integer getScale() { return scale; }
    public void setScale(Integer scale) { this.scale = scale; }

    public String getNullableYn() { return nullableYn; }
    public void setNullableYn(String nullableYn) { this.nullableYn = nullableYn; }

    public String getDefaultValue() { return defaultValue; }
    public void setDefaultValue(String defaultValue) { this.defaultValue = defaultValue; }

    public String getPkYn() { return pkYn; }
    public void setPkYn(String pkYn) { this.pkYn = pkYn; }

    public String getFkYn() { return fkYn; }
    public void setFkYn(String fkYn) { this.fkYn = fkYn; }

    public String getUniqueYn() { return uniqueYn; }
    public void setUniqueYn(String uniqueYn) { this.uniqueYn = uniqueYn; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
}
