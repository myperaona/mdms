package com.antigravity.mdms.controller;

import com.antigravity.mdms.model.DataSource;
import com.antigravity.mdms.service.DataSourceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/datasources")
public class DataSourceController {

    private final DataSourceService dataSourceService;

    public DataSourceController(DataSourceService dataSourceService) {
        this.dataSourceService = dataSourceService;
    }

    @GetMapping
    public List<DataSource> getAll() {
        List<DataSource> list = dataSourceService.getAllDataSources();
        for (DataSource ds : list) {
            ds.setPasswordEncrypted(null); // Clear password hash before returning payload
        }
        return list;
    }

    @GetMapping("/{id}")
    public ResponseEntity<DataSource> getById(@PathVariable UUID id) {
        DataSource ds = dataSourceService.getDataSourceById(id);
        if (ds == null) {
            return ResponseEntity.notFound().build();
        }
        ds.setPasswordEncrypted(null);
        return ResponseEntity.ok(ds);
    }

    @PostMapping
    public DataSource create(@RequestBody DataSource dataSource) {
        return dataSourceService.createDataSource(dataSource);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> update(@PathVariable UUID id, @RequestBody DataSource dataSource) {
        dataSource.setId(id);
        dataSourceService.updateDataSource(dataSource);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        dataSourceService.deleteDataSource(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<?> testConnection(@PathVariable UUID id) {
        boolean success = dataSourceService.testConnection(id);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", success);
        resp.put("message", success ? "Connection successful" : "Failed to connect to database");
        return ResponseEntity.ok(resp);
    }
}
