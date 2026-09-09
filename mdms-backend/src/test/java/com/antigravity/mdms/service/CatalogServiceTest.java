package com.antigravity.mdms.service;

import com.antigravity.mdms.mapper.MetadataCatalogMapper;
import com.antigravity.mdms.model.MetadataColumn;
import com.antigravity.mdms.model.MetadataTable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CatalogServiceTest {

    private MetadataCatalogMapper catalogMapper;
    private CatalogService catalogService;

    @BeforeEach
    void setUp() {
        catalogMapper = Mockito.mock(MetadataCatalogMapper.class);
        catalogService = new CatalogService(catalogMapper);
    }

    @Test
    @DisplayName("테이블 ID로 컬럼 목록 조회 시 업무 용어(logicalName)와 한글 설명(description)이 포함되어야 한다")
    void testGetColumnsByTableIdWithLogicalNameAndDescription() {
        UUID tableId = UUID.randomUUID();
        MetadataColumn col = new MetadataColumn();
        col.setId(UUID.randomUUID());
        col.setTableId(tableId);
        col.setName("USER_ID");
        col.setLogicalName("사용자ID");
        col.setDescription("시스템 이용 사용자의 고유 식별자 코멘트");
        col.setDataType("VARCHAR");

        when(catalogMapper.findColumnsByTableId(tableId)).thenReturn(List.of(col));

        List<MetadataColumn> result = catalogService.getColumnsByTableId(tableId);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("사용자ID", result.get(0).getLogicalName());
        assertEquals("시스템 이용 사용자의 고유 식별자 코멘트", result.get(0).getDescription());
    }

    @Test
    @DisplayName("컬럼 정보 수정 시 업무 용어와 한글 설명 업데이트 매퍼가 정상 호출되어야 한다")
    void testUpdateColumnWithLogicalName() {
        MetadataColumn col = new MetadataColumn();
        col.setId(UUID.randomUUID());
        col.setName("USER_NM");
        col.setLogicalName("사용자명");
        col.setDescription("사용자 이름 한글 코멘트");

        catalogService.updateColumn(col);

        verify(catalogMapper).updateColumn(col);
    }
}
