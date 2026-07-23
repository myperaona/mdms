package com.antigravity.mdms.mapper;

import com.antigravity.mdms.model.MetadataSchema;
import com.antigravity.mdms.model.MetadataTable;
import com.antigravity.mdms.model.MetadataColumn;
import com.antigravity.mdms.model.IngestionJob;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Mapper
public interface MetadataCatalogMapper {
    // Schema operations
    MetadataSchema findSchemaById(@Param("id") UUID id);
    MetadataSchema findSchemaByName(@Param("dataSourceId") UUID dataSourceId, @Param("name") String name);
    List<MetadataSchema> findSchemasByDataSourceId(@Param("dataSourceId") UUID dataSourceId);
    void insertSchema(MetadataSchema schema);
    void deleteSchemasByDataSourceId(@Param("dataSourceId") UUID dataSourceId);

    // Table operations
    MetadataTable findTableById(@Param("id") UUID id);
    MetadataTable findTableByName(@Param("schemaId") UUID schemaId, @Param("name") String name);
    List<MetadataTable> findTablesBySchemaId(@Param("schemaId") UUID schemaId);
    void insertTable(MetadataTable table);
    void updateTableDescription(@Param("id") UUID id, @Param("description") String description);

    // Column operations
    MetadataColumn findColumnById(@Param("id") UUID id);
    List<MetadataColumn> findColumnsByTableId(@Param("tableId") UUID tableId);
    void insertColumn(MetadataColumn column);
    void updateColumnDescription(@Param("id") UUID id, @Param("description") String description);
    void updateColumn(MetadataColumn column);

    // Global Search across metadata
    List<MetadataTable> searchTables(@Param("query") String query);

    // Lineage operations
    List<Map<String, Object>> findUpstreamRelations(@Param("tableId") UUID tableId);
    List<Map<String, Object>> findDownstreamRelations(@Param("tableId") UUID tableId);

    // Ingestion Job operations
    IngestionJob findJobById(@Param("id") UUID id);
    List<IngestionJob> findJobsByDataSourceId(@Param("dataSourceId") UUID dataSourceId);
    void insertJob(IngestionJob job);
    void updateJob(IngestionJob job);
}
