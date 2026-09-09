package com.antigravity.mdms.service;

import com.antigravity.mdms.config.TenantContext;
import com.antigravity.mdms.mapper.StandardizationMapper;
import com.antigravity.mdms.model.Domain;
import com.antigravity.mdms.model.ForbiddenWord;
import com.antigravity.mdms.model.StandardTerm;
import com.antigravity.mdms.model.StandardWord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringReader;
import java.util.*;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayOutputStream;

@Service
public class StandardizationService {

    private static final Logger log = LoggerFactory.getLogger(StandardizationService.class);

    /** Maximum allowed CSV upload size in bytes (10 MB) */
    public static final long MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024;

    private static final CSVFormat CSV_IMPORT_FORMAT = CSVFormat.DEFAULT.builder()
        .setHeader()
        .setSkipHeaderRecord(true)
        .setIgnoreSurroundingSpaces(true)
        .setAllowMissingColumnNames(true)
        .build();

    private final StandardizationMapper mapper;

    public StandardizationService(StandardizationMapper mapper) {
        this.mapper = mapper;
    }

    // ==========================================
    // Internal Utility Methods
    // ==========================================

    /**
     * Safely retrieves the current tenant's UUID from thread-local context.
     * @throws IllegalStateException if tenant context is not set (e.g. unauthenticated)
     */
    private UUID requireCurrentTenantId() {
        String tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalStateException("Tenant context is not set. Authentication may be missing.");
        }
        return UUID.fromString(tenantId);
    }

    /**
     * Reads a trimmed optional CSV field by column index, returning empty string if absent.
     */
    private static String csvField(CSVRecord record, int index) {
        return (record.size() > index) ? record.get(index).trim() : "";
    }

    /**
     * Converts an optional, non-empty string to null-or-value for DB storage.
     */
    private static String nullIfEmpty(String s) {
        return (s == null || s.isEmpty()) ? null : s;
    }

    // ==========================================
    // Core Validation Methods
    // ==========================================

    public void validateForbiddenWords(String logicalName, String physicalName) {
        List<ForbiddenWord> forbiddenWords = mapper.findAllForbiddenWords();
        for (ForbiddenWord fw : forbiddenWords) {
            if (Boolean.FALSE.equals(fw.getIsUsed())) {
                continue;
            }
            String word = fw.getWord().toLowerCase();
            if ((logicalName != null && logicalName.toLowerCase().contains(word)) ||
                (physicalName != null && physicalName.toLowerCase().contains(word))) {
                String replacementMsg = fw.getReplacement() != null ? " (Recommended replacement: " + fw.getReplacement() + ")" : "";
                throw new IllegalArgumentException("Name contains forbidden word: '" + fw.getWord() + "'" + replacementMsg);
            }
        }
    }

    // ==========================================
    // Domain CRUD
    // ==========================================

    public List<Domain> getAllDomains() {
        return mapper.findAllDomains();
    }

    public Domain getDomainById(UUID id) {
        return mapper.findDomainById(id);
    }

    @Transactional
    public Domain createDomain(Domain domain) {
        if (mapper.findDomainByHierarchicalKey(domain.getDomainGroup(), domain.getDomainClassification(), domain.getName()) != null) {
            throw new IllegalArgumentException("Domain key already exists: Group=" + domain.getDomainGroup() + ", Classification=" + domain.getDomainClassification() + ", Name=" + domain.getName());
        }
        domain.setId(UUID.randomUUID());
        domain.setTenantId(requireCurrentTenantId());
        mapper.insertDomain(domain);
        return domain;
    }

    @Transactional
    public Domain updateDomain(Domain domain) {
        Domain existing = mapper.findDomainById(domain.getId());
        if (existing == null) {
            throw new IllegalArgumentException("Domain not found");
        }
        Domain duplicate = mapper.findDomainByHierarchicalKey(domain.getDomainGroup(), domain.getDomainClassification(), domain.getName());
        if (duplicate != null && !duplicate.getId().equals(domain.getId())) {
            throw new IllegalArgumentException("Domain key already exists: Group=" + domain.getDomainGroup() + ", Classification=" + domain.getDomainClassification() + ", Name=" + domain.getName());
        }
        mapper.updateDomain(domain);
        return domain;
    }

    @Transactional
    public void deleteDomain(UUID id) {
        mapper.deleteDomain(id);
    }

    // ==========================================
    // Forbidden Word CRUD
    // ==========================================

    public List<ForbiddenWord> getAllForbiddenWords() {
        return mapper.findAllForbiddenWords();
    }

    public ForbiddenWord getForbiddenWordById(UUID id) {
        return mapper.findForbiddenWordById(id);
    }

    @Transactional
    public ForbiddenWord createForbiddenWord(ForbiddenWord word) {
        if (mapper.findForbiddenWordByWord(word.getWord()) != null) {
            throw new IllegalArgumentException("Forbidden word already exists: " + word.getWord());
        }
        word.setId(UUID.randomUUID());
        word.setTenantId(requireCurrentTenantId());
        mapper.insertForbiddenWord(word);
        return word;
    }

    @Transactional
    public ForbiddenWord updateForbiddenWord(ForbiddenWord word) {
        ForbiddenWord existing = mapper.findForbiddenWordById(word.getId());
        if (existing == null) {
            throw new IllegalArgumentException("Forbidden word not found");
        }
        ForbiddenWord duplicate = mapper.findForbiddenWordByWord(word.getWord());
        if (duplicate != null && !duplicate.getId().equals(word.getId())) {
            throw new IllegalArgumentException("Forbidden word already exists: " + word.getWord());
        }
        mapper.updateForbiddenWord(word);
        return word;
    }

    @Transactional
    public void deleteForbiddenWord(UUID id) {
        mapper.deleteForbiddenWord(id);
    }

    // ==========================================
    // Standard Word CRUD
    // ==========================================

    public List<StandardWord> getAllStandardWords() {
        return mapper.findAllStandardWords();
    }

    public StandardWord getStandardWordById(UUID id) {
        return mapper.findStandardWordById(id);
    }

    @Transactional
    public StandardWord createStandardWord(StandardWord word) {
        validateForbiddenWords(word.getLogicalName(), word.getPhysicalName());
        
        if ("Y".equals(word.getIsFormatWord()) && word.getDomainId() == null) {
            throw new IllegalArgumentException("Linked Domain Classification is required when Is Format Word is Y");
        }
        
        if (mapper.findStandardWordByLogicalName(word.getLogicalName()) != null) {
            throw new IllegalArgumentException("Standard logical word already exists: " + word.getLogicalName());
        }
        if (mapper.findStandardWordByPhysicalName(word.getPhysicalName()) != null) {
            throw new IllegalArgumentException("Standard physical abbreviation already exists: " + word.getPhysicalName());
        }
        
        word.setId(UUID.randomUUID());
        word.setTenantId(requireCurrentTenantId());
        mapper.insertStandardWord(word);
        return word;
    }

    @Transactional
    public StandardWord updateStandardWord(StandardWord word) {
        validateForbiddenWords(word.getLogicalName(), word.getPhysicalName());
        
        if ("Y".equals(word.getIsFormatWord()) && word.getDomainId() == null) {
            throw new IllegalArgumentException("Linked Domain Classification is required when Is Format Word is Y");
        }
        
        StandardWord existing = mapper.findStandardWordById(word.getId());
        if (existing == null) {
            throw new IllegalArgumentException("Standard word not found");
        }
        
        StandardWord duplicateLogic = mapper.findStandardWordByLogicalName(word.getLogicalName());
        if (duplicateLogic != null && !duplicateLogic.getId().equals(word.getId())) {
            throw new IllegalArgumentException("Standard logical word already exists: " + word.getLogicalName());
        }
        
        StandardWord duplicatePhys = mapper.findStandardWordByPhysicalName(word.getPhysicalName());
        if (duplicatePhys != null && !duplicatePhys.getId().equals(word.getId())) {
            throw new IllegalArgumentException("Standard physical abbreviation already exists: " + word.getPhysicalName());
        }
        
        mapper.updateStandardWord(word);
        return word;
    }

    @Transactional
    public void deleteStandardWord(UUID id) {
        mapper.deleteStandardWord(id);
    }

    // ==========================================
    // Standard Term CRUD
    // ==========================================

    public List<StandardTerm> getAllStandardTerms() {
        return mapper.findAllStandardTerms();
    }

    public StandardTerm getStandardTermById(UUID id) {
        return mapper.findStandardTermById(id);
    }

    @Transactional
    public StandardTerm createStandardTerm(StandardTerm term) {
        validateForbiddenWords(term.getLogicalName(), term.getPhysicalName());
        
        if (mapper.findStandardTermByLogicalName(term.getLogicalName()) != null) {
            throw new IllegalArgumentException("Standard term already exists: " + term.getLogicalName());
        }
        if (mapper.findStandardTermByPhysicalName(term.getPhysicalName()) != null) {
            throw new IllegalArgumentException("Standard term physical name already exists: " + term.getPhysicalName());
        }
        
        term.setId(UUID.randomUUID());
        term.setTenantId(requireCurrentTenantId());
        mapper.insertStandardTerm(term);
        return term;
    }

    @Transactional
    public StandardTerm updateStandardTerm(StandardTerm term) {
        validateForbiddenWords(term.getLogicalName(), term.getPhysicalName());
        
        StandardTerm existing = mapper.findStandardTermById(term.getId());
        if (existing == null) {
            throw new IllegalArgumentException("Standard term not found");
        }
        
        StandardTerm duplicateLogic = mapper.findStandardTermByLogicalName(term.getLogicalName());
        if (duplicateLogic != null && !duplicateLogic.getId().equals(term.getId())) {
            throw new IllegalArgumentException("Standard term logical name already exists: " + term.getLogicalName());
        }
        
        StandardTerm duplicatePhys = mapper.findStandardTermByPhysicalName(term.getPhysicalName());
        if (duplicatePhys != null && !duplicatePhys.getId().equals(term.getId())) {
            throw new IllegalArgumentException("Standard term physical name already exists: " + term.getPhysicalName());
        }
        
        mapper.updateStandardTerm(term);
        return term;
    }

    @Transactional
    public void deleteStandardTerm(UUID id) {
        mapper.deleteStandardTerm(id);
    }

    // ==========================================
    // Term Automatic Assembly Preview Builder
    // ==========================================

    public Map<String, String> assembleTerm(List<UUID> wordIds) {
        if (wordIds == null || wordIds.isEmpty()) {
            throw new IllegalArgumentException("At least one word must be selected");
        }

        StringBuilder logicalNameBuilder = new StringBuilder();
        StringBuilder physicalNameBuilder = new StringBuilder();
        
        for (int i = 0; i < wordIds.size(); i++) {
            StandardWord word = mapper.findStandardWordById(wordIds.get(i));
            if (word == null) {
                throw new IllegalArgumentException("One or more selected standard words are invalid");
            }
            
            logicalNameBuilder.append(word.getLogicalName());
            physicalNameBuilder.append(word.getPhysicalName());
            
            // Add underscore separator for physical names (e.g. CUST_NO)
            if (i < wordIds.size() - 1) {
                physicalNameBuilder.append("_");
            }
        }
        
        // Find matching domain from last word (common practice: the last word of a term like 고객'번호' or 주문'일자' represents the domain)
        String dataType = "VARCHAR(255)";
        StandardWord lastWord = mapper.findStandardWordById(wordIds.get(wordIds.size() - 1));
        if (lastWord != null && lastWord.getDomainId() != null) {
            Domain domain = mapper.findDomainById(lastWord.getDomainId());
            if (domain != null && domain.getStorageFormat() != null && !domain.getStorageFormat().trim().isEmpty()) {
                dataType = domain.getStorageFormat();
            }
        }

        Map<String, String> preview = new LinkedHashMap<>();
        preview.put("logicalName", logicalNameBuilder.toString());
        preview.put("physicalName", physicalNameBuilder.toString().toUpperCase());
        preview.put("dataType", dataType);
        return preview;
    }

    // ==========================================
    // Bulk Import / Export CSV Processing
    // ==========================================

    public static class ImportReport {
        public int totalRows = 0;
        public int successCount = 0;
        public int failCount = 0;
        public List<String> logs = new ArrayList<>();

        public void logSuccess(int row, String msg) {
            successCount++;
            logs.add("Row " + row + ": SUCCESS - " + msg);
        }
        public void logFail(int row, String msg) {
            failCount++;
            logs.add("Row " + row + ": FAILED - " + msg);
        }
    }

    @Transactional
    public ImportReport importDomains(String csvData) {
        ImportReport report = new ImportReport();
        try (CSVParser parser = new CSVParser(new StringReader(csvData), CSV_IMPORT_FORMAT)) {
            int rowIndex = 1;
            for (CSVRecord record : parser) {
                rowIndex++;
                report.totalRows++;
                try {
                    if (record.size() < 3) {
                        report.logFail(rowIndex, "Insufficient columns. Expected at least: domainGroup,domainClassification,name");
                        continue;
                    }
                    String domainGroup = record.get(0).trim();
                    String domainClassification = record.get(1).trim();
                    String name = record.get(2).trim();
                    String desc = csvField(record, 3);
                    String dataType = csvField(record, 4);
                    
                    Integer dataLength = null;
                    String dataLengthStr = csvField(record, 5);
                    if (!dataLengthStr.isEmpty()) {
                        try { dataLength = Integer.parseInt(dataLengthStr); } catch (NumberFormatException ignored) {}
                    }
                    Integer decimalLength = null;
                    String decimalLengthStr = csvField(record, 6);
                    if (!decimalLengthStr.isEmpty()) {
                        try { decimalLength = Integer.parseInt(decimalLengthStr); } catch (NumberFormatException ignored) {}
                    }
                    String storageFormat = csvField(record, 7);
                    String expressionFormat = csvField(record, 8);
                    String unit = csvField(record, 9);
                    String allowedValues = csvField(record, 10);
                    String enactmentOrder = csvField(record, 11);
                    String revisionClassification = csvField(record, 12);
                    String revisionItem = csvField(record, 13);
                    String revisionReason = csvField(record, 14);

                    if (domainGroup.isEmpty() || domainClassification.isEmpty() || name.isEmpty()) {
                        report.logFail(rowIndex, "Domain Group, Classification, and Name cannot be empty");
                        continue;
                    }

                    Domain duplicate = mapper.findDomainByHierarchicalKey(domainGroup, domainClassification, name);
                    if (duplicate != null) {
                        report.logFail(rowIndex, "Domain already exists for hierarchical key: " + domainGroup + " > " + domainClassification + " > " + name);
                        continue;
                    }

                    Domain d = new Domain();
                    d.setId(UUID.randomUUID());
                    d.setTenantId(requireCurrentTenantId());
                    d.setDomainGroup(domainGroup);
                    d.setDomainClassification(domainClassification);
                    d.setName(name);
                    d.setDescription(desc);
                    d.setDataType(nullIfEmpty(dataType) != null ? dataType.toUpperCase() : null);
                    d.setDataLength(dataLength);
                    d.setDecimalLength(decimalLength);
                    d.setStorageFormat(nullIfEmpty(storageFormat));
                    d.setExpressionFormat(nullIfEmpty(expressionFormat));
                    d.setUnit(nullIfEmpty(unit));
                    d.setAllowedValues(nullIfEmpty(allowedValues));
                    d.setEnactmentOrder(nullIfEmpty(enactmentOrder));
                    d.setRevisionClassification(nullIfEmpty(revisionClassification));
                    d.setRevisionItem(nullIfEmpty(revisionItem));
                    d.setRevisionReason(nullIfEmpty(revisionReason));
                    mapper.insertDomain(d);
                    report.logSuccess(rowIndex, "Domain '" + name + "' imported successfully");
                } catch (Exception ex) {
                    report.logFail(rowIndex, "Parsing error: " + ex.getMessage());
                }
            }
        } catch (Exception e) {
            report.logFail(0, "Failed to read CSV: " + e.getMessage());
        }
        return report;
    }

    @Transactional
    public ImportReport importForbiddenWords(String csvData) {
        ImportReport report = new ImportReport();
        try (CSVParser parser = new CSVParser(new StringReader(csvData), CSV_IMPORT_FORMAT)) {
            int rowIndex = 1;
            for (CSVRecord record : parser) {
                rowIndex++;
                report.totalRows++;
                try {
                    if (record.size() < 1) {
                        report.logFail(rowIndex, "Insufficient columns. Expected: word,[replacement],[isUsed],[description]");
                        continue;
                    }
                    String word = record.get(0).trim();
                    String replacement = csvField(record, 1);
                    Boolean isUsed = true;
                    String isUsedStr = csvField(record, 2);
                    if (!isUsedStr.isEmpty()) {
                        String lc = isUsedStr.toLowerCase();
                        isUsed = "true".equals(lc) || "y".equals(lc) || "1".equals(lc);
                    }
                    String desc = csvField(record, 3);

                    if (word.isEmpty()) {
                        report.logFail(rowIndex, "Forbidden word cannot be empty");
                        continue;
                    }

                    if (mapper.findForbiddenWordByWord(word) != null) {
                        report.logFail(rowIndex, "Forbidden word already exists: " + word);
                        continue;
                    }

                    ForbiddenWord fw = new ForbiddenWord();
                    fw.setId(UUID.randomUUID());
                    fw.setTenantId(requireCurrentTenantId());
                    fw.setWord(word);
                    fw.setReplacement(nullIfEmpty(replacement));
                    fw.setIsUsed(isUsed);
                    fw.setDescription(desc);
                    mapper.insertForbiddenWord(fw);
                    report.logSuccess(rowIndex, "Forbidden word '" + word + "' imported successfully");
                } catch (Exception ex) {
                    report.logFail(rowIndex, "Parsing error: " + ex.getMessage());
                }
            }
        } catch (Exception e) {
            report.logFail(0, "Failed to read CSV: " + e.getMessage());
        }
        return report;
    }

    @Transactional
    public ImportReport importStandardWords(String csvData) {
        ImportReport report = new ImportReport();
        try (CSVParser parser = new CSVParser(new StringReader(csvData), CSV_IMPORT_FORMAT)) {
            int rowIndex = 1;
            for (CSVRecord record : parser) {
                rowIndex++;
                report.totalRows++;
                try {
                    if (record.size() < 2) {
                        report.logFail(rowIndex, "Insufficient columns. Expected at least: logicalName, physicalName");
                        continue;
                    }
                    String logical = record.get(0).trim();
                    String physical = record.get(1).trim();
                    String englishName = csvField(record, 2);
                    String desc = csvField(record, 3);
                    
                    String isFormatWord = "N";
                    String isFormatStr = csvField(record, 4);
                    if (!isFormatStr.isEmpty()) {
                        String uc = isFormatStr.toUpperCase();
                        isFormatWord = ("Y".equals(uc) || "TRUE".equals(uc) || "1".equals(uc)) ? "Y" : "N";
                    }
                    
                    String domainClassification = csvField(record, 5);
                    String synonyms = csvField(record, 6);
                    String forbiddenWordsVal = csvField(record, 7);
                    String enactmentOrder = csvField(record, 8);
                    String revisionClassification = csvField(record, 9);
                    String revisionItem = csvField(record, 10);
                    String revisionReason = csvField(record, 11);

                    if (logical.isEmpty() || physical.isEmpty()) {
                        report.logFail(rowIndex, "Logical name and physical abbreviation cannot be empty");
                        continue;
                    }
                    if ("Y".equals(isFormatWord) && domainClassification.isEmpty()) {
                        report.logFail(rowIndex, "Linked domain classification reference cannot be empty when isFormatWord is Y");
                        continue;
                    }

                    try {
                        validateForbiddenWords(logical, physical);
                    } catch (IllegalArgumentException fex) {
                        report.logFail(rowIndex, fex.getMessage());
                        continue;
                    }

                    UUID domainId = null;
                    if (!domainClassification.isEmpty()) {
                        Domain d = mapper.findFirstDomainByClassification(domainClassification);
                        if (d == null) {
                            report.logFail(rowIndex, "Linked Domain Classification '" + domainClassification + "' does not exist");
                            continue;
                        }
                        domainId = d.getId();
                    }

                    if (mapper.findStandardWordByLogicalName(logical) != null) {
                        report.logFail(rowIndex, "Standard logical word already exists: " + logical);
                        continue;
                    }
                    if (mapper.findStandardWordByPhysicalName(physical) != null) {
                        report.logFail(rowIndex, "Standard physical abbreviation already exists: " + physical);
                        continue;
                    }

                    StandardWord sw = new StandardWord();
                    sw.setId(UUID.randomUUID());
                    sw.setTenantId(requireCurrentTenantId());
                    sw.setLogicalName(logical);
                    sw.setPhysicalName(physical.toUpperCase());
                    sw.setEnglishName(nullIfEmpty(englishName));
                    sw.setDomainId(domainId);
                    sw.setIsFormatWord(isFormatWord);
                    sw.setSynonyms(nullIfEmpty(synonyms));
                    sw.setForbiddenWords(nullIfEmpty(forbiddenWordsVal));
                    sw.setDescription(nullIfEmpty(desc));
                    sw.setEnactmentOrder(nullIfEmpty(enactmentOrder));
                    sw.setRevisionClassification(nullIfEmpty(revisionClassification));
                    sw.setRevisionItem(nullIfEmpty(revisionItem));
                    sw.setRevisionReason(nullIfEmpty(revisionReason));
                    mapper.insertStandardWord(sw);
                    report.logSuccess(rowIndex, "Standard word '" + logical + "' imported successfully");
                } catch (Exception ex) {
                    report.logFail(rowIndex, "Parsing error: " + ex.getMessage());
                }
            }
        } catch (Exception e) {
            report.logFail(0, "Failed to read CSV: " + e.getMessage());
        }
        return report;
    }

    @Transactional
    public ImportReport importStandardTerms(String csvData) {
        ImportReport report = new ImportReport();
        try (CSVParser parser = new CSVParser(new StringReader(csvData), CSV_IMPORT_FORMAT)) {
            int rowIndex = 1;
            for (CSVRecord record : parser) {
                rowIndex++;
                report.totalRows++;
                try {
                    if (record.size() < 3) {
                        report.logFail(rowIndex, "Insufficient columns. Expected at least: logicalName, description, physicalName");
                        continue;
                    }
                    String logical = record.get(0).trim();
                    String desc = record.get(1).trim();
                    String physical = record.get(2).trim();
                    String commonDomainName = csvField(record, 3);
                    String allowedValues = csvField(record, 4);
                    String storageFormat = csvField(record, 5);
                    String expressionFormat = csvField(record, 6);
                    String adminCodeName = csvField(record, 7);
                    String adminAgencyName = csvField(record, 8);
                    String forbiddenWordsVal = csvField(record, 9);
                    String enactmentOrder = csvField(record, 10);
                    String revisionClassification = csvField(record, 11);
                    String revisionItem = csvField(record, 12);
                    String revisionReason = csvField(record, 13);

                    if (logical.isEmpty() || physical.isEmpty()) {
                        report.logFail(rowIndex, "Logical term name and physical name cannot be empty");
                        continue;
                    }

                    try {
                        validateForbiddenWords(logical, physical);
                    } catch (IllegalArgumentException fex) {
                        report.logFail(rowIndex, fex.getMessage());
                        continue;
                    }

                    if (mapper.findStandardTermByLogicalName(logical) != null) {
                        report.logFail(rowIndex, "Standard term logical name already exists: " + logical);
                        continue;
                    }
                    if (mapper.findStandardTermByPhysicalName(physical) != null) {
                        report.logFail(rowIndex, "Standard term physical name already exists: " + physical);
                        continue;
                    }

                    StandardTerm st = new StandardTerm();
                    st.setId(UUID.randomUUID());
                    st.setTenantId(requireCurrentTenantId());
                    st.setLogicalName(logical);
                    st.setDescription(desc);
                    st.setPhysicalName(physical.toUpperCase());
                    st.setCommonDomainName(nullIfEmpty(commonDomainName));
                    st.setAllowedValues(nullIfEmpty(allowedValues));
                    st.setStorageFormat(nullIfEmpty(storageFormat));
                    st.setExpressionFormat(nullIfEmpty(expressionFormat));
                    st.setAdminCodeName(nullIfEmpty(adminCodeName));
                    st.setAdminAgencyName(nullIfEmpty(adminAgencyName));
                    st.setForbiddenWords(nullIfEmpty(forbiddenWordsVal));
                    st.setEnactmentOrder(nullIfEmpty(enactmentOrder));
                    st.setRevisionClassification(nullIfEmpty(revisionClassification));
                    st.setRevisionItem(nullIfEmpty(revisionItem));
                    st.setRevisionReason(nullIfEmpty(revisionReason));
                    st.setWordIds(null);
                    mapper.insertStandardTerm(st);
                    report.logSuccess(rowIndex, "Standard term '" + logical + "' imported successfully");
                } catch (Exception ex) {
                    report.logFail(rowIndex, "Parsing error: " + ex.getMessage());
                }
            }
        } catch (Exception e) {
            report.logFail(0, "Failed to read CSV: " + e.getMessage());
        }
        return report;
    }

    public String exportDomainsToCsv() {
        StringBuilder sb = new StringBuilder("domainGroup,domainClassification,name,description,dataType,dataLength,decimalLength,storageFormat,expressionFormat,unit,allowedValues,enactmentOrder,revisionClassification,revisionItem,revisionReason\n");
        List<Domain> list = mapper.findAllDomains();
        for (Domain d : list) {
            sb.append(escapeCsv(d.getDomainGroup())).append(",")
              .append(escapeCsv(d.getDomainClassification())).append(",")
              .append(escapeCsv(d.getName())).append(",")
              .append(escapeCsv(d.getDescription())).append(",")
              .append(escapeCsv(d.getDataType())).append(",")
              .append(d.getDataLength() != null ? d.getDataLength() : "").append(",")
              .append(d.getDecimalLength() != null ? d.getDecimalLength() : "").append(",")
              .append(escapeCsv(d.getStorageFormat())).append(",")
              .append(escapeCsv(d.getExpressionFormat())).append(",")
              .append(escapeCsv(d.getUnit())).append(",")
              .append(escapeCsv(d.getAllowedValues())).append(",")
              .append(escapeCsv(d.getEnactmentOrder())).append(",")
              .append(escapeCsv(d.getRevisionClassification())).append(",")
              .append(escapeCsv(d.getRevisionItem())).append(",")
              .append(escapeCsv(d.getRevisionReason())).append("\n");
        }
        return sb.toString();
    }

    public String exportForbiddenWordsToCsv() {
        StringBuilder sb = new StringBuilder("word,replacement,isUsed,description\n");
        List<ForbiddenWord> list = mapper.findAllForbiddenWords();
        for (ForbiddenWord fw : list) {
            sb.append(escapeCsv(fw.getWord())).append(",")
              .append(escapeCsv(fw.getReplacement())).append(",")
              .append(fw.getIsUsed() != null ? fw.getIsUsed() : "true").append(",")
              .append(escapeCsv(fw.getDescription())).append("\n");
        }
        return sb.toString();
    }

    public String exportStandardWordsToCsv() {
        StringBuilder sb = new StringBuilder("logicalName,physicalName,englishName,description,isFormatWord,domainClassification,synonyms,forbiddenWords,enactmentOrder,revisionClassification,revisionItem,revisionReason\n");
        List<StandardWord> list = mapper.findAllStandardWords();
        for (StandardWord sw : list) {
            String formatWordVal = sw.getIsFormatWord();
            if (formatWordVal == null) {
                formatWordVal = "N";
            } else {
                formatWordVal = formatWordVal.toUpperCase();
            }
            sb.append(escapeCsv(sw.getLogicalName())).append(",")
              .append(escapeCsv(sw.getPhysicalName())).append(",")
              .append(escapeCsv(sw.getEnglishName())).append(",")
              .append(escapeCsv(sw.getDescription())).append(",")
              .append(formatWordVal).append(",")
              .append(escapeCsv(sw.getDomainName())).append(",")
              .append(escapeCsv(sw.getSynonyms())).append(",")
              .append(escapeCsv(sw.getForbiddenWords())).append(",")
              .append(escapeCsv(sw.getEnactmentOrder())).append(",")
              .append(escapeCsv(sw.getRevisionClassification())).append(",")
              .append(escapeCsv(sw.getRevisionItem())).append(",")
              .append(escapeCsv(sw.getRevisionReason())).append("\n");
        }
        return sb.toString();
    }

    public String exportStandardTermsToCsv() {
        StringBuilder sb = new StringBuilder("logicalName,description,physicalName,commonDomainName,allowedValues,storageFormat,expressionFormat,adminCodeName,adminAgencyName,forbiddenWords,enactmentOrder,revisionClassification,revisionItem,revisionReason\n");
        List<StandardTerm> list = mapper.findAllStandardTerms();
        for (StandardTerm st : list) {
            sb.append(escapeCsv(st.getLogicalName())).append(",")
              .append(escapeCsv(st.getDescription())).append(",")
              .append(escapeCsv(st.getPhysicalName())).append(",")
              .append(escapeCsv(st.getCommonDomainName())).append(",")
              .append(escapeCsv(st.getAllowedValues())).append(",")
              .append(escapeCsv(st.getStorageFormat())).append(",")
              .append(escapeCsv(st.getExpressionFormat())).append(",")
              .append(escapeCsv(st.getAdminCodeName())).append(",")
              .append(escapeCsv(st.getAdminAgencyName())).append(",")
              .append(escapeCsv(st.getForbiddenWords())).append(",")
              .append(escapeCsv(st.getEnactmentOrder())).append(",")
              .append(escapeCsv(st.getRevisionClassification())).append(",")
              .append(escapeCsv(st.getRevisionItem())).append(",")
              .append(escapeCsv(st.getRevisionReason())).append("\n");
        }
        return sb.toString();
    }

    public Map<String, Object> getStandardizationReport(UUID dataSourceId, UUID schemaId) {
        List<Map<String, Object>> columns = mapper.findReportColumns(dataSourceId, schemaId);
        List<StandardTerm> terms = mapper.findAllStandardTerms();
        List<ForbiddenWord> forbiddenWords = mapper.findAllForbiddenWords();

        int totalColumns = columns.size();
        int compliantColumns = 0; // Name compliant
        int fullyCompliantColumns = 0; // Name + Type compliant

        List<Map<String, Object>> nonCompliantList = new ArrayList<>();

        for (Map<String, Object> col : columns) {
            String colName = (String) col.get("columnName");
            String colDataType = (String) col.get("columnDataType");
            if (colName == null) continue;

            // 1. Check if column name contains any forbidden words (where is_used = true)
            String matchedForbiddenWord = null;
            for (ForbiddenWord fw : forbiddenWords) {
                if (Boolean.TRUE.equals(fw.getIsUsed()) && fw.getWord() != null) {
                    if (colName.toUpperCase().contains(fw.getWord().toUpperCase())) {
                        matchedForbiddenWord = fw.getWord();
                        break;
                    }
                }
            }

            // 2. Check Standard Term match (Case-insensitive)
            StandardTerm matchedTerm = null;
            for (StandardTerm st : terms) {
                if (st.getPhysicalName() != null && st.getPhysicalName().equalsIgnoreCase(colName)) {
                    matchedTerm = st;
                    break;
                }
            }

            boolean isNameCompliant = matchedTerm != null;
            boolean isTypeCompliant = false;
            String violationType = "NOT_REGISTERED";
            String violationMessage = "표준 용어 사전에 등록되지 않은 물리명입니다.";

            if (matchedForbiddenWord != null) {
                violationType = "FORBIDDEN_WORD_DETECTED";
                violationMessage = "금칙어 '" + matchedForbiddenWord + "'가 컬럼명에 포함되어 있습니다.";
            }

            if (isNameCompliant) {
                compliantColumns++;
                
                // Check if datatype matches standard term storage format
                String storageFormat = matchedTerm.getStorageFormat();
                isTypeCompliant = checkDataTypeCompliance(storageFormat, colDataType);

                if (isTypeCompliant) {
                    fullyCompliantColumns++;
                } else {
                    violationType = "TYPE_MISMATCH";
                    violationMessage = "표준 타입(" + matchedTerm.getStorageFormat() + ")과 물리 컬럼 타입(" + colDataType + ")이 정합하지 않습니다.";
                }
            }

            // If not fully compliant (or if contains forbidden word), add to non-compliant list
            if (!isNameCompliant || !isTypeCompliant || matchedForbiddenWord != null) {
                Map<String, Object> ncInfo = new LinkedHashMap<>(col);
                ncInfo.put("violationType", violationType);
                ncInfo.put("violationMessage", violationMessage);
                ncInfo.put("suggestedPhysicalName", matchedTerm != null ? matchedTerm.getPhysicalName() : colName.toUpperCase());
                ncInfo.put("suggestedLogicalName", matchedTerm != null ? matchedTerm.getLogicalName() : "-");
                nonCompliantList.add(ncInfo);
            }
        }

        double complianceRate = totalColumns == 0 ? 0.0 : ((double) compliantColumns / totalColumns) * 100.0;
        double fullComplianceRate = totalColumns == 0 ? 0.0 : ((double) fullyCompliantColumns / totalColumns) * 100.0;

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("totalColumns", totalColumns);
        report.put("compliantColumns", compliantColumns);
        report.put("fullyCompliantColumns", fullyCompliantColumns);
        report.put("complianceRate", Math.round(complianceRate * 100.0) / 100.0);
        report.put("fullComplianceRate", Math.round(fullComplianceRate * 100.0) / 100.0);
        report.put("nonCompliantColumns", nonCompliantList);
        return report;
    }

    public String exportReportToCsv(UUID dataSourceId, UUID schemaId) {
        Map<String, Object> report = getStandardizationReport(dataSourceId, schemaId);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> nonCompliantList = (List<Map<String, Object>>) report.get("nonCompliantColumns");

        StringBuilder sb = new StringBuilder();
        sb.append("데이터소스,스키마,테이블,컬럼명,데이터 타입,데이터 길이,Precision,진단 위반 사유,추천 표준 물리명,추천 표준 용어명\n");

        if (nonCompliantList != null) {
            for (Map<String, Object> nc : nonCompliantList) {
                sb.append(escapeCsv((String) nc.get("datasourceName"))).append(",");
                sb.append(escapeCsv((String) nc.get("schemaName"))).append(",");
                sb.append(escapeCsv((String) nc.get("tableName"))).append(",");
                sb.append(escapeCsv((String) nc.get("columnName"))).append(",");
                sb.append(escapeCsv((String) nc.get("columnDataType"))).append(",");
                sb.append(nc.get("dataLength") != null ? nc.get("dataLength") : "").append(",");
                sb.append(nc.get("precision") != null ? nc.get("precision") : "").append(",");
                sb.append(escapeCsv((String) nc.get("violationMessage"))).append(",");
                sb.append(escapeCsv((String) nc.get("suggestedPhysicalName"))).append(",");
                sb.append(escapeCsv((String) nc.get("suggestedLogicalName"))).append("\n");
            }
        }
        return sb.toString();
    }

    public byte[] exportReportToXlsx(UUID dataSourceId, UUID schemaId) throws java.io.IOException {
        Map<String, Object> report = getStandardizationReport(dataSourceId, schemaId);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> nonCompliantList = (List<Map<String, Object>>) report.get("nonCompliantColumns");

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("미준수 및 정밀 분석 대상 컬럼");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {
                "데이터소스", "스키마", "테이블", "컬럼명", "데이터 타입", 
                "데이터 길이", "Precision", "진단 위반 사유", "추천 표준 물리명", "추천 표준 용어명"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            if (nonCompliantList != null) {
                for (Map<String, Object> nc : nonCompliantList) {
                    Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(nc.get("datasourceName") != null ? (String) nc.get("datasourceName") : "");
                    row.createCell(1).setCellValue(nc.get("schemaName") != null ? (String) nc.get("schemaName") : "");
                    row.createCell(2).setCellValue(nc.get("tableName") != null ? (String) nc.get("tableName") : "");
                    row.createCell(3).setCellValue(nc.get("columnName") != null ? (String) nc.get("columnName") : "");
                    row.createCell(4).setCellValue(nc.get("columnDataType") != null ? (String) nc.get("columnDataType") : "");

                    if (nc.get("dataLength") != null) {
                        row.createCell(5).setCellValue(((Number) nc.get("dataLength")).longValue());
                    } else {
                        row.createCell(5).setCellValue("");
                    }

                    if (nc.get("precision") != null) {
                        row.createCell(6).setCellValue(((Number) nc.get("precision")).longValue());
                    } else {
                        row.createCell(6).setCellValue("");
                    }

                    row.createCell(7).setCellValue(nc.get("violationMessage") != null ? (String) nc.get("violationMessage") : "");
                    row.createCell(8).setCellValue(nc.get("suggestedPhysicalName") != null ? (String) nc.get("suggestedPhysicalName") : "");
                    row.createCell(9).setCellValue(nc.get("suggestedLogicalName") != null ? (String) nc.get("suggestedLogicalName") : "");
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Determines whether the physical column data type matches the standard storage format.
     * Handles physical SQL types (VARCHAR, TIMESTAMP, etc.), Korean descriptive formats
     * (e.g., "20자리 이내 문자", "100자리 이내 문자", "10자리 이내 숫자"), and date/time format patterns
     * (e.g., "YYYYMMDDHH24MISS", "YYYYMMDD").
     */
    public boolean checkDataTypeCompliance(String storageFormat, String colDataType) {
        if (storageFormat == null || storageFormat.trim().isEmpty() || colDataType == null || colDataType.trim().isEmpty()) {
            return true;
        }

        String normStorage = storageFormat.trim().replaceAll("\\s+", "").toUpperCase();
        String normCol = colDataType.trim().replaceAll("\\s+", "").toUpperCase();

        // 1. Direct match or substring containment (e.g., VARCHAR vs VARCHAR(20), TIMESTAMP vs TIMESTAMP)
        if (normStorage.equals(normCol) || normStorage.contains(normCol) || normCol.contains(normStorage)) {
            return true;
        }

        // 2. Identify storage format categories
        boolean storageIsString = normStorage.contains("문자") || normStorage.contains("텍스트") 
                || normStorage.contains("가변") || normStorage.contains("고정")
                || normStorage.startsWith("VARCHAR") || normStorage.startsWith("CHAR") 
                || normStorage.startsWith("TEXT") || normStorage.startsWith("BPCHAR") 
                || normStorage.startsWith("CLOB") || normStorage.startsWith("NVARCHAR") || normStorage.startsWith("STRING");

        boolean storageIsDateTime = normStorage.contains("YYYY") || normStorage.contains("MM") || normStorage.contains("DD")
                || normStorage.contains("HH") || normStorage.contains("SS") || normStorage.contains("MISS")
                || normStorage.contains("일시") || normStorage.contains("날짜") || normStorage.contains("시간")
                || normStorage.startsWith("DATE") || normStorage.startsWith("TIMESTAMP") || normStorage.startsWith("DATETIME") || normStorage.startsWith("TIME");

        boolean storageIsNumeric = normStorage.contains("숫자") || normStorage.contains("정수") || normStorage.contains("실수")
                || normStorage.startsWith("INT") || normStorage.startsWith("NUMERIC") || normStorage.startsWith("NUMBER")
                || normStorage.startsWith("DECIMAL") || normStorage.startsWith("BIGINT") || normStorage.startsWith("SMALLINT")
                || normStorage.startsWith("FLOAT") || normStorage.startsWith("DOUBLE") || normStorage.startsWith("REAL");

        boolean storageIsBoolean = normStorage.contains("여부") || normStorage.contains("불리언") 
                || normStorage.startsWith("BOOL") || normStorage.startsWith("BOOLEAN") || normStorage.equals("Y/N");

        // 3. Identify column data type categories
        boolean colIsString = normCol.startsWith("VARCHAR") || normCol.startsWith("CHAR") 
                || normCol.startsWith("TEXT") || normCol.startsWith("BPCHAR") 
                || normCol.startsWith("CLOB") || normCol.startsWith("NVARCHAR") || normCol.startsWith("STRING");

        boolean colIsDateTime = normCol.startsWith("DATE") || normCol.startsWith("TIMESTAMP") || normCol.startsWith("DATETIME") || normCol.startsWith("TIME");

        boolean colIsNumeric = normCol.startsWith("INT") || normCol.startsWith("NUMERIC") || normCol.startsWith("NUMBER")
                || normCol.startsWith("DECIMAL") || normCol.startsWith("BIGINT") || normCol.startsWith("SMALLINT")
                || normCol.startsWith("FLOAT") || normCol.startsWith("DOUBLE") || normCol.startsWith("REAL")
                || normCol.equals("INT4") || normCol.equals("INT8");

        boolean colIsBoolean = normCol.startsWith("BOOL") || normCol.startsWith("BOOLEAN") 
                || normCol.equals("CHAR") || normCol.startsWith("CHAR") || normCol.startsWith("VARCHAR") || normCol.equals("BIT");

        // 4. Perform category-level cross compliance checks
        if (storageIsString && colIsString) {
            return true;
        }

        if (storageIsDateTime && (colIsDateTime || colIsString)) {
            return true;
        }

        if (storageIsNumeric && colIsNumeric) {
            return true;
        }

        if (storageIsBoolean && colIsBoolean) {
            return true;
        }

        // 5. Alias & DBMS type compatibility fallbacks (e.g. INT4/INT8/BPCHAR vs INT/NUMERIC/CHAR/VARCHAR)
        if ((colIsString || normCol.equals("BPCHAR")) && (storageIsString || normStorage.contains("CHAR") || normStorage.contains("VARCHAR"))) {
            return true;
        }
        if ((colIsNumeric || normCol.startsWith("INT")) && (storageIsNumeric || normStorage.contains("INT") || normStorage.contains("NUMERIC"))) {
            return true;
        }

        return false;
    }

    private String escapeCsv(String s) {
        if (s == null) return "";
        s = s.replace("\"", "\"\"");
        if (s.contains(",") || s.contains("\n") || s.contains("\"")) {
            return "\"" + s + "\"";
        }
        return s;
    }

}
