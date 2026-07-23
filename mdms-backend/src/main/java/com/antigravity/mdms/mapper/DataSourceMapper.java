package com.antigravity.mdms.mapper;

import com.antigravity.mdms.model.DataSource;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.UUID;

@Mapper
public interface DataSourceMapper {
    DataSource findById(@Param("id") UUID id);
    List<DataSource> findAll();
    void insert(DataSource dataSource);
    void update(DataSource dataSource);
    void updateStatus(@Param("id") UUID id, @Param("status") String status);
    void delete(@Param("id") UUID id);
}
