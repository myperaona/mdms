package com.antigravity.mdms.mapper;

import com.antigravity.mdms.model.Domain;
import com.antigravity.mdms.model.ForbiddenWord;
import com.antigravity.mdms.model.StandardTerm;
import com.antigravity.mdms.model.StandardWord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.UUID;

@Mapper
public interface StandardizationMapper {

    // --- Domain CRUD ---
    List<Domain> findAllDomains();
    Domain findDomainById(@Param("id") UUID id);
    Domain findDomainByName(@Param("name") String name);
    void insertDomain(Domain domain);
    void updateDomain(Domain domain);
    void deleteDomain(@Param("id") UUID id);

    // --- Forbidden Word CRUD ---
    List<ForbiddenWord> findAllForbiddenWords();
    ForbiddenWord findForbiddenWordById(@Param("id") UUID id);
    ForbiddenWord findForbiddenWordByWord(@Param("word") String word);
    void insertForbiddenWord(ForbiddenWord word);
    void updateForbiddenWord(ForbiddenWord word);
    void deleteForbiddenWord(@Param("id") UUID id);

    // --- Standard Word CRUD ---
    List<StandardWord> findAllStandardWords();
    StandardWord findStandardWordById(@Param("id") UUID id);
    StandardWord findStandardWordByLogicalName(@Param("logicalName") String logicalName);
    StandardWord findStandardWordByPhysicalName(@Param("physicalName") String physicalName);
    void insertStandardWord(StandardWord word);
    void updateStandardWord(StandardWord word);
    void deleteStandardWord(@Param("id") UUID id);

    // --- Standard Term CRUD ---
    List<StandardTerm> findAllStandardTerms();
    StandardTerm findStandardTermById(@Param("id") UUID id);
    StandardTerm findStandardTermByLogicalName(@Param("logicalName") String logicalName);
    StandardTerm findStandardTermByPhysicalName(@Param("physicalName") String physicalName);
    void insertStandardTerm(StandardTerm term);
    void updateStandardTerm(StandardTerm term);
    void deleteStandardTerm(@Param("id") UUID id);

    int countTotalColumns();
    int countCompliantColumns();
}
