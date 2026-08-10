package com.antigravity.mdms.service;

import com.antigravity.mdms.mapper.DataSourceMapper;
import com.antigravity.mdms.mapper.MetadataCatalogMapper;
import com.antigravity.mdms.model.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MetadataPersistenceService {

    private final DataSourceMapper dataSourceMapper;
    private final MetadataCatalogMapper catalogMapper;

    public MetadataPersistenceService(DataSourceMapper dataSourceMapper, MetadataCatalogMapper catalogMapper) {
        this.dataSourceMapper = dataSourceMapper;
        this.catalogMapper = catalogMapper;
    }

    @Transactional
    public void saveInitialJob(IngestionJob job) {
        catalogMapper.insertJob(job);
    }

    @Transactional
    public void saveIngestedMetadata(UUID dataSourceId, List<MetadataSchema> schemas, 
                                     List<MetadataTable> tables, List<MetadataColumn> columns, 
                                     IngestionJob job, String status, String message, String dsStatus) {
        // Delete previous metadata catalog for this source to perform a clean refresh
        catalogMapper.deleteSchemasByDataSourceId(dataSourceId);

        // Ingest schemas
        for (MetadataSchema s : schemas) {
            catalogMapper.insertSchema(s);
        }

        // Ingest tables
        for (MetadataTable t : tables) {
            catalogMapper.insertTable(t);
        }

        // Ingest columns
        for (MetadataColumn c : columns) {
            catalogMapper.insertColumn(c);
        }

        // Update Job status
        job.setStatus(status);
        job.setEndedAt(OffsetDateTime.now());
        job.setLogMessage(message);
        catalogMapper.updateJob(job);

        // Update DataSource status
        dataSourceMapper.updateStatus(dataSourceId, dsStatus);
    }

    @Transactional
    public void updateJobStatus(IngestionJob job, String status, String message, UUID dataSourceId, String dsStatus) {
        job.setStatus(status);
        job.setEndedAt(OffsetDateTime.now());
        job.setLogMessage(message);
        catalogMapper.updateJob(job);
        if (dataSourceId != null && dsStatus != null) {
            dataSourceMapper.updateStatus(dataSourceId, dsStatus);
        }
    }
}
