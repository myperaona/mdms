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
        if (mapper.findDomainByName(domain.getName()) != null) {
            throw new IllegalArgumentException("Domain name already exists: " + domain.getName());
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
        Domain duplicate = mapper.findDomainByName(domain.getName());
        if (duplicate != null && !duplicate.getId().equals(domain.getId())) {
            throw new IllegalArgumentException("Domain name already exists: " + domain.getName());
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
                if (domain != null) {
                    dataType = domain.getDataType();
                    if (domain.getLength() != null) {
                        dataType += "(" + domain.getLength();
                        if (domain.getPrecisionVal() != null) {
                            dataType += "," + domain.getPrecisionVal();
                        }
                        dataType += ")";
                    }
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
                    if (record.size() < 2) {
                        report.logFail(rowIndex, "Insufficient columns. Expected: name,dataType,[length],[precision],[format],[description]");
                        continue;
                    }
                    String name = record.get(0).trim();
                    String dataType = record.get(1).trim();
                    
                    Integer length = null;
                    if (record.size() > 2 && !record.get(2).trim().isEmpty()) {
                        length = Integer.parseInt(record.get(2).trim());
                    }
                    Integer precision = null;
                    if (record.size() > 3 && !record.get(3).trim().isEmpty()) {
                        precision = Integer.parseInt(record.get(3).trim());
                    }
                    String formatPattern = (record.size() > 4) ? record.get(4).trim() : "";
                    String desc = (record.size() > 5) ? record.get(5).trim() : "";

                    if (name.isEmpty() || dataType.isEmpty()) {
                        report.logFail(rowIndex, "Domain name and data type cannot be empty");
                        continue;
                    }

                    Domain duplicate = mapper.findDomainByName(name);
                    if (duplicate != null) {
                        report.logFail(rowIndex, "Domain name already exists: " + name);
                        continue;
                    }

                    Domain d = new Domain();
                    d.setId(UUID.randomUUID());
                    d.setTenantId(UUID.fromString(TenantContext.getCurrentTenantId()));
                    d.setName(name);
                    d.setDataType(dataType);
                    d.setLength(length);
                    d.setPrecisionVal(precision);
                    d.setFormatPattern(formatPattern);
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
                        report.logFail(rowIndex, "Insufficient columns. Expected: word,[replacement],[description]");
                        continue;
                    }
                    String word = record.get(0).trim();
                    String replacement = (record.size() > 1) ? record.get(1).trim() : "";
                    String desc = (record.size() > 2) ? record.get(2).trim() : "";

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
                        report.logFail(rowIndex, "Insufficient columns. Expected: logicalName,physicalName,domainName,[description]");
                        continue;
                    }
                    String logical = record.get(0).trim();
                    String physical = record.get(1).trim();
                    String domainName = record.get(2).trim();
                    String desc = (record.size() > 3) ? record.get(3).trim() : "";

                    if (logical.isEmpty() || physical.isEmpty() || domainName.isEmpty()) {
                        report.logFail(rowIndex, "Logical name, physical name, and domain reference cannot be empty");
                        continue;
                    }

                    try {
                        validateForbiddenWords(logical, physical);
                    } catch (IllegalArgumentException fex) {
                        report.logFail(rowIndex, fex.getMessage());
                        continue;
                    }

                    Domain d = mapper.findDomainByName(domainName);
                    if (d == null) {
                        report.logFail(rowIndex, "Linked Domain '" + domainName + "' does not exist");
                        continue;
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
                    sw.setDomainId(d.getId());
                    sw.setDescription(desc);
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
                        report.logFail(rowIndex, "Insufficient columns. Expected: logicalName,physicalName,[description],[comma_separated_word_logicals]");
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
        StringBuilder sb = new StringBuilder("name,dataType,length,precisionVal,formatPattern,description\n");
        List<Domain> list = mapper.findAllDomains();
        for (Domain d : list) {
            sb.append(escapeCsv(d.getName())).append(",")
              .append(escapeCsv(d.getDataType())).append(",")
              .append(d.getLength() != null ? d.getLength() : "").append(",")
              .append(d.getPrecisionVal() != null ? d.getPrecisionVal() : "").append(",")
              .append(escapeCsv(d.getFormatPattern())).append(",")
              .append(escapeCsv(d.getDescription())).append("\n");
        }
        return sb.toString();
    }

    public String exportForbiddenWordsToCsv() {
        StringBuilder sb = new StringBuilder("word,replacement,description\n");
        List<ForbiddenWord> list = mapper.findAllForbiddenWords();
        for (ForbiddenWord fw : list) {
            sb.append(escapeCsv(fw.getWord())).append(",")
              .append(escapeCsv(fw.getReplacement())).append(",")
              .append(escapeCsv(fw.getDescription())).append("\n");
        }
        return sb.toString();
    }

    public String exportStandardWordsToCsv() {
        StringBuilder sb = new StringBuilder("logicalName,physicalName,domainName,description\n");
        List<StandardWord> list = mapper.findAllStandardWords();
        for (StandardWord sw : list) {
            sb.append(escapeCsv(sw.getLogicalName())).append(",")
              .append(escapeCsv(sw.getPhysicalName())).append(",")
              .append(escapeCsv(sw.getDomainName())).append(",")
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
