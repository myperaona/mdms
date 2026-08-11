package com.antigravity.mdms.mapper;

import com.antigravity.mdms.model.*;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.UUID;

@Mapper
public interface DatabaseDesignMapper {

    // --- Design Session ---
    List<DesignSession> findAllDesignSessions();
    DesignSession findDesignSessionById(@Param("designId") UUID designId);
    void insertDesignSession(DesignSession session);
    void updateDesignSession(DesignSession session);
    void updateDesignSessionStatus(@Param("designId") UUID designId, @Param("status") String status);
    void deleteDesignSession(@Param("designId") UUID designId);

    // --- Subject Area ---
    List<SubjectArea> findSubjectAreasByDesignId(@Param("designId") UUID designId);
    SubjectArea findSubjectAreaById(@Param("subjectAreaId") UUID subjectAreaId);
    void insertSubjectArea(SubjectArea area);
    void updateSubjectArea(SubjectArea area);
    void deleteSubjectArea(@Param("subjectAreaId") UUID subjectAreaId);

    // --- Subject Area Term Mapping ---
    List<StandardTerm> findTermsBySubjectAreaId(@Param("subjectAreaId") UUID subjectAreaId);
    void insertSubjectAreaTermMapping(@Param("mappingId") UUID mappingId, @Param("subjectAreaId") UUID subjectAreaId, @Param("termId") UUID termId, @Param("createdBy") String createdBy);
    void deleteSubjectAreaTermMapping(@Param("subjectAreaId") UUID subjectAreaId, @Param("termId") UUID termId);
    void deleteSubjectAreaTermMappingsBySubjectAreaId(@Param("subjectAreaId") UUID subjectAreaId);

    // --- Table Design ---
    List<TableDesign> findTablesByDesignId(@Param("designId") UUID designId);
    TableDesign findTableDesignById(@Param("tableDesignId") UUID tableDesignId);
    void insertTableDesign(TableDesign table);
    void updateTableDesign(TableDesign table);
    void deleteTableDesign(@Param("tableDesignId") UUID tableDesignId);

    // --- Table Column ---
    List<TableColumn> findColumnsByTableDesignId(@Param("tableDesignId") UUID tableDesignId);
    TableColumn findColumnById(@Param("columnId") UUID columnId);
    void insertTableColumn(TableColumn column);
    void updateTableColumn(TableColumn column);
    void deleteTableColumn(@Param("columnId") UUID columnId);
    void deleteColumnsByTableDesignId(@Param("tableDesignId") UUID tableDesignId);

    // --- ERD Entity & Relation ---
    List<ErdEntity> findErdEntitiesByDesignId(@Param("designId") UUID designId);
    void upsertErdEntity(ErdEntity entity);
    void deleteErdEntity(@Param("entityId") UUID entityId);

    List<ErdRelation> findErdRelationsByDesignId(@Param("designId") UUID designId);
    void insertErdRelation(ErdRelation relation);
    void deleteErdRelation(@Param("relationId") UUID relationId);

    // --- DB Connection ---
    List<DbConnection> findAllDbConnections();
    DbConnection findDbConnectionById(@Param("connectionId") UUID connectionId);
    void insertDbConnection(DbConnection connection);
    void updateDbConnection(DbConnection connection);
    void deleteDbConnection(@Param("connectionId") UUID connectionId);

    // --- DB Deploy Log ---
    List<DbDeployLog> findDeployLogsByDesignId(@Param("designId") UUID designId);
    void insertDeployLog(DbDeployLog log);
}
