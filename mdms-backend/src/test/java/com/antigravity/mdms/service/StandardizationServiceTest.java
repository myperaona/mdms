package com.antigravity.mdms.service;

import com.antigravity.mdms.mapper.StandardizationMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StandardizationServiceTest {

    private StandardizationService service;

    @BeforeEach
    void setUp() {
        StandardizationMapper mapper = Mockito.mock(StandardizationMapper.class);
        service = new StandardizationService(mapper);
    }

    @Test
    @DisplayName("표준 저장형식이 한국어 문자 설명이고 물리 컬럼이 VARCHAR인 경우 정합(true)으로 판정해야 한다")
    void testKoreanStringFormatWithVarchar() {
        assertTrue(service.checkDataTypeCompliance("20자리 이내 문자", "VARCHAR"));
        assertTrue(service.checkDataTypeCompliance("100자리 이내 문자", "VARCHAR"));
        assertTrue(service.checkDataTypeCompliance("50자 이내 문자", "VARCHAR(50)"));
        assertTrue(service.checkDataTypeCompliance("문자", "CHAR"));
    }

    @Test
    @DisplayName("표준 저장형식이 날짜/시간 포맷이고 물리 컬럼이 TIMESTAMP, DATE인 경우 정합(true)으로 판정해야 한다")
    void testDateFormatWithTimestampAndDate() {
        assertTrue(service.checkDataTypeCompliance("YYYYMMDDHH24MISS", "TIMESTAMP"));
        assertTrue(service.checkDataTypeCompliance("YYYYMMDD", "DATE"));
        assertTrue(service.checkDataTypeCompliance("YYYY-MM-DD HH:MI:SS", "TIMESTAMP WITH TIME ZONE"));
        assertTrue(service.checkDataTypeCompliance("YYYYMMDDHH24MISS", "VARCHAR"));
    }

    @Test
    @DisplayName("표준 저장형식이 한국어 숫자 설명이고 물리 컬럼이 NUMERIC, INT인 경우 정합(true)으로 판정해야 한다")
    void testKoreanNumericFormatWithNumericAndInt() {
        assertTrue(service.checkDataTypeCompliance("10자리 이내 숫자", "NUMERIC"));
        assertTrue(service.checkDataTypeCompliance("숫자", "INT4"));
        assertTrue(service.checkDataTypeCompliance("정수", "BIGINT"));
    }

    @Test
    @DisplayName("실제 타입 불일치 케이스(문자 vs 숫자, 날짜 vs 숫자)는 비정합(false)으로 판정해야 한다")
    void testTypeMismatchCases() {
        assertFalse(service.checkDataTypeCompliance("20자리 이내 문자", "INT4"));
        assertFalse(service.checkDataTypeCompliance("YYYYMMDD", "INT8"));
        assertFalse(service.checkDataTypeCompliance("10자리 이내 숫자", "TIMESTAMP"));
    }
}
