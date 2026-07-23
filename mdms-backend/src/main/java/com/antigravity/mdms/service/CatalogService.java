package com.antigravity.mdms.service;

import com.antigravity.mdms.mapper.MetadataCatalogMapper;
import com.antigravity.mdms.model.*;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CatalogService {

    private final MetadataCatalogMapper catalogMapper;

    public CatalogService(MetadataCatalogMapper catalogMapper) {
        this.catalogMapper = catalogMapper;
    }

    public List<MetadataSchema> getSchemasByDataSourceId(UUID dataSourceId) {
        return catalogMapper.findSchemasByDataSourceId(dataSourceId);
    }

    public List<MetadataTable> getTablesBySchemaId(UUID schemaId) {
        return catalogMapper.findTablesBySchemaId(schemaId);
    }

    public List<MetadataColumn> getColumnsByTableId(UUID tableId) {
        return catalogMapper.findColumnsByTableId(tableId);
    }

    public void updateTableDescription(UUID id, String description) {
        catalogMapper.updateTableDescription(id, description);
    }

    public void updateColumnDescription(UUID id, String description) {
        catalogMapper.updateColumnDescription(id, description);
    }

    public void updateColumn(MetadataColumn column) {
        catalogMapper.updateColumn(column);
    }

    public List<MetadataTable> search(String query) {
        return catalogMapper.searchTables(query);
    }

    public List<IngestionJob> getJobsByDataSourceId(UUID dataSourceId) {
        return catalogMapper.findJobsByDataSourceId(dataSourceId);
    }

    public Map<String, Object> getTableLineage(UUID tableId) {
        Map<String, Object> lineage = new HashMap<>();
        lineage.put("upstream", catalogMapper.findUpstreamRelations(tableId));
        lineage.put("downstream", catalogMapper.findDownstreamRelations(tableId));
        return lineage;
    }
}
