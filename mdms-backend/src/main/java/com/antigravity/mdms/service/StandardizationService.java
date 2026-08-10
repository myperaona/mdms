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

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.*;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

@Service
public class StandardizationService {

    private static final Logger log = LoggerFactory.getLogger(StandardizationService.class);
    private final StandardizationMapper mapper;

    public StandardizationService(StandardizationMapper mapper) {
        this.mapper = mapper;
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
        domain.setTenantId(UUID.fromString(TenantContext.getCurrentTenantId()));
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
        word.setTenantId(UUID.fromString(TenantContext.getCurrentTenantId()));
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
        
        if (Boolean.TRUE.equals(word.getIsFormatWord()) && word.getDomainId() == null) {
            throw new IllegalArgumentException("Linked Domain Classification is required when Is Format Word is true");
        }
        
        if (mapper.findStandardWordByLogicalName(word.getLogicalName()) != null) {
            throw new IllegalArgumentException("Standard logical word already exists: " + word.getLogicalName());
        }
        if (mapper.findStandardWordByPhysicalName(word.getPhysicalName()) != null) {
            throw new IllegalArgumentException("Standard physical abbreviation already exists: " + word.getPhysicalName());
        }
        
        word.setId(UUID.randomUUID());
        word.setTenantId(UUID.fromString(TenantContext.getCurrentTenantId()));
        mapper.insertStandardWord(word);
        return word;
    }

    @Transactional
    public StandardWord updateStandardWord(StandardWord word) {
        validateForbiddenWords(word.getLogicalName(), word.getPhysicalName());
        
        if (Boolean.TRUE.equals(word.getIsFormatWord()) && word.getDomainId() == null) {
            throw new IllegalArgumentException("Linked Domain Classification is required when Is Format Word is true");
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
        term.setTenantId(UUID.fromString(TenantContext.getCurrentTenantId()));
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
        if (!wordIds.isEmpty()) {
            StandardWord lastWord = mapper.findStandardWordById(wordIds.get(wordIds.size() - 1));
            if (lastWord != null && lastWord.getDomainId() != null) {
                Domain domain = mapper.findDomainById(lastWord.getDomainId());
                if (domain != null && domain.getStorageFormat() != null && !domain.getStorageFormat().trim().isEmpty()) {
                    dataType = domain.getStorageFormat();
                }
            }
        }

        Map<String, String> preview = new HashMap<>();
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
        CSVFormat format = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreSurroundingSpaces(true)
            .setAllowMissingColumnNames(true)
            .build();
        
        try (CSVParser parser = new CSVParser(new StringReader(csvData), format)) {
            int rowIndex = 1;
            for (CSVRecord record : parser) {
                rowIndex++;
                report.totalRows++;
                try {
                    if (record.size() < 3) {
                        report.logFail(rowIndex, "Insufficient columns. Expected: domainGroup,domainClassification,name,[dataType],[dataLength],[decimalLength],[storageFormat],[expressionFormat],[unit],[allowedValues],[description]");
                        continue;
                    }
                    String domainGroup = record.get(0).trim();
                    String domainClassification = record.get(1).trim();
                    String name = record.get(2).trim();
                    
                    String dataType = (record.size() > 3) ? record.get(3).trim() : "";
                    Integer dataLength = null;
                    if (record.size() > 4 && !record.get(4).trim().isEmpty()) {
                        try {
                            dataLength = Integer.parseInt(record.get(4).trim());
                        } catch (NumberFormatException ignored) {}
                    }
                    Integer decimalLength = null;
                    if (record.size() > 5 && !record.get(5).trim().isEmpty()) {
                        try {
                            decimalLength = Integer.parseInt(record.get(5).trim());
                        } catch (NumberFormatException ignored) {}
                    }
                    String storageFormat = (record.size() > 6) ? record.get(6).trim() : "";
                    String expressionFormat = (record.size() > 7) ? record.get(7).trim() : "";
                    String unit = (record.size() > 8) ? record.get(8).trim() : "";
                    String allowedValues = (record.size() > 9) ? record.get(9).trim() : "";
                    String desc = (record.size() > 10) ? record.get(10).trim() : "";

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
                    d.setTenantId(UUID.fromString(TenantContext.getCurrentTenantId()));
                    d.setDomainGroup(domainGroup);
                    d.setDomainClassification(domainClassification);
                    d.setName(name);
                    d.setDataType(dataType.isEmpty() ? null : dataType.toUpperCase());
                    d.setDataLength(dataLength);
                    d.setDecimalLength(decimalLength);
                    d.setStorageFormat(storageFormat.isEmpty() ? null : storageFormat);
                    d.setExpressionFormat(expressionFormat.isEmpty() ? null : expressionFormat);
                    d.setUnit(unit.isEmpty() ? null : unit);
                    d.setAllowedValues(allowedValues.isEmpty() ? null : allowedValues);
                    d.setDescription(desc);
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
        CSVFormat format = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreSurroundingSpaces(true)
            .setAllowMissingColumnNames(true)
            .build();
        
        try (CSVParser parser = new CSVParser(new StringReader(csvData), format)) {
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
                    String replacement = (record.size() > 1) ? record.get(1).trim() : "";
                    Boolean isUsed = true;
                    if (record.size() > 2 && !record.get(2).trim().isEmpty()) {
                        String isUsedStr = record.get(2).trim().toLowerCase();
                        isUsed = "true".equals(isUsedStr) || "y".equals(isUsedStr) || "1".equals(isUsedStr);
                    }
                    String desc = (record.size() > 3) ? record.get(3).trim() : "";

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
                    fw.setTenantId(UUID.fromString(TenantContext.getCurrentTenantId()));
                    fw.setWord(word);
                    fw.setReplacement(replacement.isEmpty() ? null : replacement);
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
        CSVFormat format = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreSurroundingSpaces(true)
            .setAllowMissingColumnNames(true)
            .build();
        
        try (CSVParser parser = new CSVParser(new StringReader(csvData), format)) {
            int rowIndex = 1;
            for (CSVRecord record : parser) {
                rowIndex++;
                report.totalRows++;
                try {
                    if (record.size() < 3) {
                        report.logFail(rowIndex, "Insufficient columns. Expected: logicalName,physicalName,englishName,[domainClassification],[isFormatWord],[synonyms],[forbiddenWords],[description]");
                        continue;
                    }
                    String logical = record.get(0).trim();
                    String physical = record.get(1).trim();
                    String englishName = record.get(2).trim();
                    
                    String domainClassification = (record.size() > 3) ? record.get(3).trim() : "";
                    Boolean isFormatWord = false;
                    if (record.size() > 4 && !record.get(4).trim().isEmpty()) {
                        String isFormatStr = record.get(4).trim().toLowerCase();
                        isFormatWord = "true".equals(isFormatStr) || "y".equals(isFormatStr) || "1".equals(isFormatStr);
                    }
                    String synonyms = (record.size() > 5) ? record.get(5).trim() : "";
                    String forbiddenWords = (record.size() > 6) ? record.get(6).trim() : "";
                    String desc = (record.size() > 7) ? record.get(7).trim() : "";

                    if (logical.isEmpty() || physical.isEmpty()) {
                        report.logFail(rowIndex, "Logical name and physical abbreviation cannot be empty");
                        continue;
                    }
                    if (Boolean.TRUE.equals(isFormatWord) && domainClassification.isEmpty()) {
                        report.logFail(rowIndex, "Linked domain classification reference cannot be empty when isFormatWord is true");
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
                    sw.setTenantId(UUID.fromString(TenantContext.getCurrentTenantId()));
                    sw.setLogicalName(logical);
                    sw.setPhysicalName(physical.toUpperCase());
                    sw.setEnglishName(englishName.isEmpty() ? null : englishName);
                    sw.setDomainId(domainId);
                    sw.setIsFormatWord(isFormatWord);
                    sw.setSynonyms(synonyms.isEmpty() ? null : synonyms);
                    sw.setForbiddenWords(forbiddenWords.isEmpty() ? null : forbiddenWords);
                    sw.setDescription(desc.isEmpty() ? null : desc);
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
        CSVFormat format = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreSurroundingSpaces(true)
            .setAllowMissingColumnNames(true)
            .build();
        
        try (CSVParser parser = new CSVParser(new StringReader(csvData), format)) {
            int rowIndex = 1;
            for (CSVRecord record : parser) {
                rowIndex++;
                report.totalRows++;
                try {
                    if (record.size() < 2) {
                        report.logFail(rowIndex, "Insufficient columns. Expected: logicalName,physicalName,[description],[semicolon_separated_word_logicals]");
                        continue;
                    }
                    String logical = record.get(0).trim();
                    String physical = record.get(1).trim();
                    String desc = (record.size() > 2) ? record.get(2).trim() : "";
                    String wordLogicals = (record.size() > 3) ? record.get(3).trim() : "";

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

                    List<String> ids = new ArrayList<>();
                    if (!wordLogicals.isEmpty()) {
                        String[] wordNames = wordLogicals.split(";");
                        boolean allWordsFound = true;
                        for (String wName : wordNames) {
                            StandardWord w = mapper.findStandardWordByLogicalName(wName.trim());
                            if (w != null) {
                                ids.add(w.getId().toString());
                            } else {
                                report.logFail(rowIndex, "Linked standard word logical element '" + wName + "' not found");
                                allWordsFound = false;
                                break;
                            }
                        }
                        if (!allWordsFound) continue;
                    }

                    StandardTerm st = new StandardTerm();
                    st.setId(UUID.randomUUID());
                    st.setTenantId(UUID.fromString(TenantContext.getCurrentTenantId()));
                    st.setLogicalName(logical);
                    st.setPhysicalName(physical.toUpperCase());
                    st.setDescription(desc);
                    st.setWordIds(String.join(",", ids));
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
        StringBuilder sb = new StringBuilder("domainGroup,domainClassification,name,dataType,dataLength,decimalLength,storageFormat,expressionFormat,unit,allowedValues,description\n");
        List<Domain> list = mapper.findAllDomains();
        for (Domain d : list) {
            sb.append(escapeCsv(d.getDomainGroup())).append(",")
              .append(escapeCsv(d.getDomainClassification())).append(",")
              .append(escapeCsv(d.getName())).append(",")
              .append(escapeCsv(d.getDataType())).append(",")
              .append(d.getDataLength() != null ? d.getDataLength() : "").append(",")
              .append(d.getDecimalLength() != null ? d.getDecimalLength() : "").append(",")
              .append(escapeCsv(d.getStorageFormat())).append(",")
              .append(escapeCsv(d.getExpressionFormat())).append(",")
              .append(escapeCsv(d.getUnit())).append(",")
              .append(escapeCsv(d.getAllowedValues())).append(",")
              .append(escapeCsv(d.getDescription())).append("\n");
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
        StringBuilder sb = new StringBuilder("logicalName,physicalName,englishName,domainClassification,isFormatWord,synonyms,forbiddenWords,description\n");
        List<StandardWord> list = mapper.findAllStandardWords();
        for (StandardWord sw : list) {
            sb.append(escapeCsv(sw.getLogicalName())).append(",")
              .append(escapeCsv(sw.getPhysicalName())).append(",")
              .append(escapeCsv(sw.getEnglishName())).append(",")
              .append(escapeCsv(sw.getDomainName())).append(",") // sw.domainName holds domainClassification retrieved from join
              .append(sw.getIsFormatWord() != null ? sw.getIsFormatWord() : "false").append(",")
              .append(escapeCsv(sw.getSynonyms())).append(",")
              .append(escapeCsv(sw.getForbiddenWords())).append(",")
              .append(escapeCsv(sw.getDescription())).append("\n");
        }
        return sb.toString();
    }

    public String exportStandardTermsToCsv() {
        StringBuilder sb = new StringBuilder("logicalName,physicalName,description,wordLogicalNames\n");
        List<StandardTerm> list = mapper.findAllStandardTerms();
        for (StandardTerm st : list) {
            List<String> wNames = new ArrayList<>();
            if (st.getWordIds() != null && !st.getWordIds().trim().isEmpty()) {
                String[] wordIds = st.getWordIds().split(",");
                for (String wId : wordIds) {
                    try {
                        StandardWord sw = mapper.findStandardWordById(UUID.fromString(wId.trim()));
                        if (sw != null) {
                            wNames.add(sw.getLogicalName());
                        }
                    } catch (Exception ignored) {}
                }
            }
            sb.append(escapeCsv(st.getLogicalName())).append(",")
              .append(escapeCsv(st.getPhysicalName())).append(",")
              .append(escapeCsv(st.getDescription())).append(",")
              .append(escapeCsv(String.join(";", wNames))).append("\n");
        }
        return sb.toString();
    }

    public Map<String, Object> getStandardizationReport() {
        int total = mapper.countTotalColumns();
        int compliant = mapper.countCompliantColumns();
        double rate = total == 0 ? 0.0 : ((double) compliant / total) * 100.0;

        Map<String, Object> report = new HashMap<>();
        report.put("totalColumns", total);
        report.put("compliantColumns", compliant);
        report.put("complianceRate", Math.round(rate * 100.0) / 100.0);
        return report;
    }

    private String escapeCsv(String s) {
        if (s == null) return "";
        s = s.replace("\"", "\"\"");
        if (s.contains(",") || s.contains("\n") || s.contains("\"")) {
            return "\"" + s + "\"";
        }
        return s;
    }

    /**
     * 양 끝의 큰따옴표를 제거해주는 유틸 (값이 "..."인 경우 → ...).
     * CSV에서 필드를 "..."로 감싸는 경우가 많으니 방어적으로 처리.
     */
    private String stripQuotes(String s) {
        if (s != null && s.length() >= 2 && s.startsWith("\"") && s.endsWith("\"")) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }

}
