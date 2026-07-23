package com.antigravity.mdms.mapper;

import com.antigravity.mdms.model.Tenant;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.UUID;

@Mapper
public interface TenantMapper {
    List<Tenant> findAll();
    Tenant findById(@Param("id") UUID id);
    Tenant findByName(@Param("name") String name);
    Tenant findBySchemaName(@Param("schemaName") String schemaName);
    void insert(Tenant tenant);
    void createSchema(@Param("schemaName") String schemaName);
    
    // Commands to construct tenant schemas dynamically
    void createDataSourceTable(@Param("schemaName") String schemaName);
    void createMetadataSchemaTable(@Param("schemaName") String schemaName);
    void createMetadataTableTable(@Param("schemaName") String schemaName);
    void createMetadataColumnTable(@Param("schemaName") String schemaName);
    void createIngestionJobTable(@Param("schemaName") String schemaName);

    void createDomainTable(@Param("schemaName") String schemaName);
    void createForbiddenWordTable(@Param("schemaName") String schemaName);
    void createStandardWordTable(@Param("schemaName") String schemaName);
    void createStandardTermTable(@Param("schemaName") String schemaName);
}
