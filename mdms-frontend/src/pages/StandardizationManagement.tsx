import React, { useState, useEffect } from 'react';
import { request } from '../services/api';
import { useTranslation } from '../context/i18n';
import {
  Plus,
  Trash2,
  CheckCircle,
  CheckCircle2,
  Download,
  Upload,
  Grid
} from 'lucide-react';

interface Domain {
  id?: string;
  domainGroup: string;
  domainClassification: string;
  name: string;
  dataType?: string;
  dataLength?: number;
  decimalLength?: number;
  storageFormat?: string;
  expressionFormat?: string;
  unit?: string;
  allowedValues?: string;
  description?: string;
  enactmentOrder?: string;
  revisionClassification?: string;
  revisionItem?: string;
  revisionReason?: string;
}

interface ForbiddenWord {
  id?: string;
  word: string;
  replacement?: string;
  isUsed?: boolean;
  description?: string;
}

interface StandardWord {
  id?: string;
  logicalName: string;
  physicalName: string;
  englishName?: string;
  domainId: string;
  domainName?: string;
  isFormatWord?: string;
  synonyms?: string;
  forbiddenWords?: string;
  description?: string;
  enactmentOrder?: string;
  revisionClassification?: string;
  revisionItem?: string;
  revisionReason?: string;
}

interface StandardTerm {
  id?: string;
  logicalName: string;
  physicalName: string;
  description?: string;
  wordIds?: string;
  commonDomainName?: string;
  allowedValues?: string;
  storageFormat?: string;
  expressionFormat?: string;
  adminCodeName?: string;
  adminAgencyName?: string;
  forbiddenWords?: string;
  enactmentOrder?: string;
  revisionClassification?: string;
  revisionItem?: string;
  revisionReason?: string;
}

interface ImportReport {
  totalRows: number;
  successCount: number;
  failCount: number;
  logs: string[];
}

interface ComplianceReport {
  totalColumns: number;
  compliantColumns: number;
  fullyCompliantColumns: number;
  complianceRate: number;
  fullComplianceRate: number;
  nonCompliantColumns: any[];
}

export default function StandardizationManagement() {
  const { locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<'domains' | 'forbidden' | 'words' | 'terms' | 'import' | 'report'>('domains');

  // List states
  const [domains, setDomains] = useState<Domain[]>([]);
  const [forbiddenWords, setForbiddenWords] = useState<ForbiddenWord[]>([]);
  const [words, setWords] = useState<StandardWord[]>([]);
  const [terms, setTerms] = useState<StandardTerm[]>([]);

  // Loading & feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [wordSelectorSearch, setWordSelectorSearch] = useState('');

  // Form inputs
  const [domainForm, setDomainForm] = useState<Domain>({
    domainGroup: '',
    domainClassification: '',
    name: '',
    dataType: 'VARCHAR',
    dataLength: 100,
    decimalLength: 0,
    storageFormat: '',
    expressionFormat: '',
    unit: '',
    allowedValues: '',
    description: '',
    enactmentOrder: '',
    revisionClassification: '',
    revisionItem: '',
    revisionReason: ''
  });
  const [forbiddenForm, setForbiddenForm] = useState<ForbiddenWord>({ word: '', replacement: '', isUsed: true, description: '' });
  const [wordForm, setWordForm] = useState<StandardWord>({
    logicalName: '',
    physicalName: '',
    englishName: '',
    domainId: '',
    isFormatWord: 'N',
    synonyms: '',
    forbiddenWords: '',
    description: '',
    enactmentOrder: '',
    revisionClassification: '',
    revisionItem: '',
    revisionReason: ''
  });
  const [termForm, setTermForm] = useState<StandardTerm>({
    logicalName: '',
    physicalName: '',
    description: '',
    wordIds: '',
    commonDomainName: '',
    allowedValues: '',
    storageFormat: '',
    expressionFormat: '',
    adminCodeName: '',
    adminAgencyName: '',
    forbiddenWords: '',
    enactmentOrder: '',
    revisionClassification: '',
    revisionItem: '',
    revisionReason: ''
  });

  // Wizard state for Terms
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);

  // CSV Import state
  const [importType, setImportType] = useState<'domains' | 'forbidden-words' | 'words' | 'terms'>('domains');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(10);
  const [domainPage, setDomainPage] = useState<number>(1);
  const [forbiddenPage, setForbiddenPage] = useState<number>(1);
  const [wordPage, setWordPage] = useState<number>(1);
  const [termPage, setTermPage] = useState<number>(1);

  // Compliance report state
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [reportDataSources, setReportDataSources] = useState<any[]>([]);
  const [reportSchemas, setReportSchemas] = useState<any[]>([]);
  const [selectedReportDsId, setSelectedReportDsId] = useState<string>('');
  const [selectedReportSchemaId, setSelectedReportSchemaId] = useState<string>('');

  const fetchReportDataSources = async () => {
    try {
      const dsList = await request('/datasources');
      setReportDataSources(dsList);
    } catch (e) {
      console.error('Failed to load data sources for report', e);
    }
  };

  useEffect(() => {
    if (activeTab !== 'report') return;
    if (!selectedReportDsId) {
      setReportSchemas([]);
      setSelectedReportSchemaId('');
      return;
    }
    const fetchSchemas = async () => {
      try {
        const schemasList = await request(`/catalog/datasources/${selectedReportDsId}/schemas`);
        setReportSchemas(schemasList);
        setSelectedReportSchemaId('');
      } catch (e) {
        console.error('Failed to load schemas for report', e);
      }
    };
    fetchSchemas();
  }, [selectedReportDsId, activeTab]);

  const fetchComplianceReport = async (dsId: string, schemaId: string) => {
    setLoading(true);
    try {
      let query = '';
      if (dsId) query += `?dataSourceId=${dsId}`;
      if (schemaId) query += `${query ? '&' : '?'}schemaId=${schemaId}`;
      const res = await request(`/standardization/report${query}`);
      setComplianceReport(res);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load compliance report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'report') {
      fetchReportDataSources();
      fetchComplianceReport(selectedReportDsId, selectedReportSchemaId);
    } else {
      fetchData();
    }
  }, [activeTab, selectedReportDsId, selectedReportSchemaId]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (activeTab === 'domains') {
        const res = await request('/standardization/domains');
        setDomains(res);
      } else if (activeTab === 'forbidden') {
        const res = await request('/standardization/forbidden-words');
        setForbiddenWords(res);
      } else if (activeTab === 'words') {
        const res = await request('/standardization/words');
        setWords(res);
        const domRes = await request('/standardization/domains');
        setDomains(domRes);
      } else if (activeTab === 'terms') {
        const res = await request('/standardization/terms');
        setTerms(res);
        const wRes = await request('/standardization/words');
        setWords(wRes);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load registry elements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (activeTab === 'domains') {
        const payload = { ...domainForm, id: editingId || undefined };
        await request('/standardization/domains', { method: 'POST', body: JSON.stringify(payload) });
        setSuccessMsg(locale === 'ko' ? '도메인이 성공적으로 저장되었습니다.' : 'Domain saved successfully.');
      } else if (activeTab === 'forbidden') {
        const payload = { ...forbiddenForm, id: editingId || undefined };
        await request('/standardization/forbidden-words', { method: 'POST', body: JSON.stringify(payload) });
        setSuccessMsg(locale === 'ko' ? '금칙어가 성공적으로 저장되었습니다.' : 'Forbidden word saved successfully.');
      } else if (activeTab === 'words') {
        const payload = { 
          ...wordForm, 
          id: editingId || undefined,
          domainId: wordForm.domainId || undefined
        };
        await request('/standardization/words', { method: 'POST', body: JSON.stringify(payload) });
        setSuccessMsg(locale === 'ko' ? '표준단어가 성공적으로 저장되었습니다.' : 'Standard word saved successfully.');
      } else if (activeTab === 'terms') {
        const payload = { ...termForm, id: editingId || undefined };
        await request('/standardization/terms', { method: 'POST', body: JSON.stringify(payload) });
        setSuccessMsg(locale === 'ko' ? '표준용어가 성공적으로 저장되었습니다.' : 'Standard term saved successfully.');
      }
      setShowForm(false);
      resetForms();
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving item.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === 'ko' ? '삭제하시겠습니까?' : 'Are you sure you want to delete this item?')) return;
    setErrorMsg('');
    try {
      if (activeTab === 'domains') {
        await request(`/standardization/domains/${id}`, { method: 'DELETE' });
      } else if (activeTab === 'forbidden') {
        await request(`/standardization/forbidden-words/${id}`, { method: 'DELETE' });
      } else if (activeTab === 'words') {
        await request(`/standardization/words/${id}`, { method: 'DELETE' });
      } else if (activeTab === 'terms') {
        await request(`/standardization/terms/${id}`, { method: 'DELETE' });
      }
      setSuccessMsg(locale === 'ko' ? '삭제되었습니다.' : 'Deleted successfully.');
      fetchData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to delete item.');
    }
  };

  const resetForms = () => {
    setEditingId(null);
    setDomainForm({
      domainGroup: '',
      domainClassification: '',
      name: '',
      dataType: 'VARCHAR',
      dataLength: 100,
      decimalLength: 0,
      storageFormat: '',
      expressionFormat: '',
      unit: '',
      allowedValues: '',
      description: '',
      enactmentOrder: '',
      revisionClassification: '',
      revisionItem: '',
      revisionReason: ''
    });
    setForbiddenForm({ word: '', replacement: '', isUsed: true, description: '' });
    setWordForm({
      logicalName: '',
      physicalName: '',
      englishName: '',
      domainId: '',
      isFormatWord: 'N',
      synonyms: '',
      forbiddenWords: '',
      description: '',
      enactmentOrder: '',
      revisionClassification: '',
      revisionItem: '',
      revisionReason: ''
    });
    setTermForm({
      logicalName: '',
      physicalName: '',
      description: '',
      wordIds: '',
      commonDomainName: '',
      allowedValues: '',
      storageFormat: '',
      expressionFormat: '',
      adminCodeName: '',
      adminAgencyName: '',
      forbiddenWords: '',
      enactmentOrder: '',
      revisionClassification: '',
      revisionItem: '',
      revisionReason: ''
    });
    setSelectedWordIds([]);
    setSearchQuery('');
    setWordSelectorSearch('');
  };

  const startEditDomain = (d: Domain) => {
    setDomainForm({
      domainGroup: d.domainGroup || '',
      domainClassification: d.domainClassification || '',
      name: d.name,
      dataType: d.dataType || 'VARCHAR',
      dataLength: d.dataLength !== undefined ? d.dataLength : 100,
      decimalLength: d.decimalLength !== undefined ? d.decimalLength : 0,
      storageFormat: d.storageFormat || '',
      expressionFormat: d.expressionFormat || '',
      unit: d.unit || '',
      allowedValues: d.allowedValues || '',
      description: d.description || '',
      enactmentOrder: d.enactmentOrder || '',
      revisionClassification: d.revisionClassification || '',
      revisionItem: d.revisionItem || '',
      revisionReason: d.revisionReason || ''
    });
    setEditingId(d.id || null);
    setShowForm(true);
  };

  const startEditForbidden = (fw: ForbiddenWord) => {
    setForbiddenForm({
      word: fw.word,
      replacement: fw.replacement || '',
      isUsed: fw.isUsed !== false,
      description: fw.description || ''
    });
    setEditingId(fw.id || null);
    setShowForm(true);
  };

  const startEditWord = (w: StandardWord) => {
    setWordForm({
      logicalName: w.logicalName,
      physicalName: w.physicalName,
      englishName: w.englishName || '',
      domainId: w.domainId || '',
      isFormatWord: w.isFormatWord === 'Y' ? 'Y' : 'N',
      synonyms: w.synonyms || '',
      forbiddenWords: w.forbiddenWords || '',
      description: w.description || '',
      enactmentOrder: w.enactmentOrder || '',
      revisionClassification: w.revisionClassification || '',
      revisionItem: w.revisionItem || '',
      revisionReason: w.revisionReason || ''
    });
    setEditingId(w.id || null);
    setShowForm(true);
  };

  const startEditTerm = (t: StandardTerm) => {
    setTermForm({
      logicalName: t.logicalName,
      physicalName: t.physicalName,
      description: t.description || '',
      wordIds: t.wordIds || '',
      commonDomainName: t.commonDomainName || '',
      allowedValues: t.allowedValues || '',
      storageFormat: t.storageFormat || '',
      expressionFormat: t.expressionFormat || '',
      adminCodeName: t.adminCodeName || '',
      adminAgencyName: t.adminAgencyName || '',
      forbiddenWords: t.forbiddenWords || '',
      enactmentOrder: t.enactmentOrder || '',
      revisionClassification: t.revisionClassification || '',
      revisionItem: t.revisionItem || '',
      revisionReason: t.revisionReason || ''
    });
    setEditingId(t.id || null);
    setSelectedWordIds(t.wordIds ? t.wordIds.split(',') : []);
    setShowForm(true);
  };

  // Trigger Term auto assembler wizard
  const handleWordSelect = async (wordId: string, checked: boolean) => {
    let updatedWordIds = [...selectedWordIds];
    if (checked) {
      updatedWordIds.push(wordId);
    } else {
      updatedWordIds = updatedWordIds.filter(id => id !== wordId);
    }
    setSelectedWordIds(updatedWordIds);

    if (updatedWordIds.length === 0) {
      setTermForm(prev => ({ ...prev, logicalName: '', physicalName: '', wordIds: '', storageFormat: '' }));
      return;
    }

    try {
      const res = await request('/standardization/terms/assemble', {
        method: 'POST',
        body: JSON.stringify(updatedWordIds)
      });
      setTermForm(prev => ({
        ...prev,
        logicalName: res.logicalName,
        physicalName: res.physicalName,
        wordIds: updatedWordIds.join(','),
        storageFormat: res.dataType
      }));
    } catch (e: any) {
      setErrorMsg(locale === 'ko' ? `조합 오류: ${e.message}` : `Assembly error: ${e.message}`);
    }
  };

  // Bulk CSV file uploader
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    setImportReport(null);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const token = localStorage.getItem('mdms_token');
      const apiBase = `${window.location.protocol}//${window.location.hostname}:8080/api`;
      const response = await fetch(`${apiBase}/standardization/import/${importType}`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to import CSV file');
      }

      const res = await response.json();
      setImportReport(res);
      setSuccessMsg(locale === 'ko' ? 'CSV 파일 처리가 완료되었습니다.' : 'CSV file processed successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'CSV Import failed');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const triggerExport = (type: string) => {
    const token = localStorage.getItem('mdms_token');
    const apiBase = `${window.location.protocol}//${window.location.hostname}:8080/api`;
    const url = `${apiBase}/standardization/export/${type}`;
    
    // Create a virtual anchor tag to download stream
    const a = document.createElement('a');
    a.href = url;
    // Set Auth header is not directly possible via href redirect, so we pass it or rely on cookies, 
    // OR we trigger a fetch and create an ObjectURL. Let's do fetch for secure authentication headers!
    fetch(url, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
      .then(res => res.blob())
      .then(blob => {
        const fileUrl = window.URL.createObjectURL(blob);
        a.href = fileUrl;
        a.download = `${type}_registry_export.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileUrl);
      })
      .catch(err => alert(locale === 'ko' ? `반출 실패: ${err.message}` : `Export failed: ${err.message}`));
  };

  // Client-side filtering for Search
  const filteredDomains = domains.filter(d => 
    d.domainGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.domainClassification.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.storageFormat && d.storageFormat.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.expressionFormat && d.expressionFormat.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.unit && d.unit.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.allowedValues && d.allowedValues.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredForbidden = forbiddenWords.filter(fw => 
    fw.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (fw.replacement && fw.replacement.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (fw.description && fw.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredWords = words.filter(w => 
    w.logicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.physicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.domainName && w.domainName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (w.synonyms && w.synonyms.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (w.forbiddenWords && w.forbiddenWords.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTerms = terms.filter(t => 
    t.logicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.physicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.commonDomainName && t.commonDomainName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.allowedValues && t.allowedValues.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.storageFormat && t.storageFormat.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.expressionFormat && t.expressionFormat.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.adminCodeName && t.adminCodeName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSelectorWords = words.filter(w =>
    w.logicalName.toLowerCase().includes(wordSelectorSearch.toLowerCase()) ||
    w.physicalName.toLowerCase().includes(wordSelectorSearch.toLowerCase())
  );

  // Pagination calculation
  const totalDomainPages = Math.ceil(filteredDomains.length / pageSize);
  const totalForbiddenPages = Math.ceil(filteredForbidden.length / pageSize);
  const totalWordPages = Math.ceil(filteredWords.length / pageSize);
  const totalTermPages = Math.ceil(filteredTerms.length / pageSize);

  const activeDomainPage = Math.max(1, Math.min(domainPage, totalDomainPages));
  const activeForbiddenPage = Math.max(1, Math.min(forbiddenPage, totalForbiddenPages));
  const activeWordPage = Math.max(1, Math.min(wordPage, totalWordPages));
  const activeTermPage = Math.max(1, Math.min(termPage, totalTermPages));

  const paginatedDomains = filteredDomains.slice((activeDomainPage - 1) * pageSize, activeDomainPage * pageSize);
  const paginatedForbidden = filteredForbidden.slice((activeForbiddenPage - 1) * pageSize, activeForbiddenPage * pageSize);
  const paginatedWords = filteredWords.slice((activeWordPage - 1) * pageSize, activeWordPage * pageSize);
  const paginatedTerms = filteredTerms.slice((activeTermPage - 1) * pageSize, activeTermPage * pageSize);

  const renderPaginationControls = (currentPage: number, totalPages: number, setPage: (p: number) => void) => {
    if (totalPages <= 1) return null;

    const pageRange = 2; // Show 2 pages before and after current page
    const pages: (number | string)[] = [];

    // Always include page 1
    pages.push(1);

    const start = Math.max(2, currentPage - pageRange);
    const end = Math.min(totalPages - 1, currentPage + pageRange);

    if (start > 2) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push('...');
    }

    // Always include the last page if it's more than 1
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return (
      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', marginTop: '1.5rem', alignItems: 'center' }}>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} 
          disabled={currentPage === 1} 
          onClick={() => setPage(currentPage - 1)}
        >
          &lt;
        </button>
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} style={{ padding: '0.25rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ...
              </span>
            );
          }
          return (
            <button 
              key={`page-${p}`} 
              className={`btn ${currentPage === p ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', minWidth: '2rem' }}
              onClick={() => setPage(p as number)}
            >
              {p}
            </button>
          );
        })}
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} 
          disabled={currentPage === totalPages} 
          onClick={() => setPage(currentPage + 1)}
        >
          &gt;
        </button>
      </div>
    );
  };

  const renderPageSizeSelector = () => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {locale === 'ko' ? '목록 개수 설정:' : 'Items per page:'}
        </span>
        <input 
          type="number" 
          className="form-control" 
          style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} 
          value={pageSize} 
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val > 0) {
              setPageSize(val);
              setDomainPage(1);
              setForbiddenPage(1);
              setWordPage(1);
              setTermPage(1);
            }
          }}
          min={1}
        />
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>{locale === 'ko' ? '데이터 표준화 관리' : 'Data Standardization Registry'}</h1>
          <p>{locale === 'ko' ? '전사 데이터 도메인, 표준단어, 표준용어 및 금칙어 규격 체계를 수립합니다.' : 'Establish corporate data domains, standard words, standard terms, and forbidden vocabularies.'}</p>
        </div>
      </div>

      {/* Tabs - Styled identical to Database Design module */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'domains', label: locale === 'ko' ? '도메인 관리' : 'Domain Registry' },
          { id: 'forbidden', label: locale === 'ko' ? '금칙어(이음동어) 관리' : 'Forbidden Words(Synonyms)' },
          { id: 'words', label: locale === 'ko' ? '표준단어 관리' : 'Standard Words' },
          { id: 'terms', label: locale === 'ko' ? '표준용어 관리' : 'Standard Terms' },
          { id: 'import', label: locale === 'ko' ? '일괄 등록/반출' : 'Bulk CSV' },
          { id: 'report', label: locale === 'ko' ? '준수율 리포트' : 'Compliance Stats' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); resetForms(); setShowForm(false); }}
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.825rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === tab.id ? '#ffffff' : 'rgba(255,255,255,0.06)',
              color: activeTab === tab.id ? '#0f172a' : '#cbd5e1',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Alerts */}
      {errorMsg && <div className="badge badge-danger" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>{errorMsg}</div>}
      {successMsg && <div className="badge badge-success" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>{successMsg}</div>}

      {/* Main Panel views */}
      {!showForm && activeTab !== 'import' && activeTab !== 'report' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <button className="btn btn-primary" onClick={() => { resetForms(); setShowForm(true); }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Plus size={16} /> {locale === 'ko' ? '신규 규격 추가' : 'Add Registry Entry'}
          </button>
        </div>
      )}

      {/* Domain Panel */}
      {activeTab === 'domains' && (
        showForm ? (
          <div className="glass-card" style={{ maxWidth: '600px' }}>
            <h2>{editingId ? (locale === 'ko' ? '도메인 수정' : 'Edit Domain') : (locale === 'ko' ? '도메인 등록' : 'Register Domain')}</h2>
            <form onSubmit={handleCreateOrUpdate} style={{ marginTop: '1.5rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '도메인 그룹 *' : 'Domain Group *'}</label>
                  <input type="text" className="form-control" value={domainForm.domainGroup || ''} onChange={(e) => setDomainForm({ ...domainForm, domainGroup: e.target.value })} required placeholder="e.g. 코드, 수량, 금액" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '도메인 분류 *' : 'Domain Classification *'}</label>
                  <input type="text" className="form-control" value={domainForm.domainClassification || ''} onChange={(e) => setDomainForm({ ...domainForm, domainClassification: e.target.value })} required placeholder="e.g. 여부코드, 금액통화, 비율" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '도메인명 *' : 'Domain Name *'}</label>
                <input type="text" className="form-control" value={domainForm.name || ''} onChange={(e) => setDomainForm({ ...domainForm, name: e.target.value })} required placeholder="e.g. 등록여부코드, 거래금액, 부가세율" />
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '데이터 타입 *' : 'Data Type *'}</label>
                  <select className="form-control" value={domainForm.dataType || 'VARCHAR'} onChange={(e) => setDomainForm({ ...domainForm, dataType: e.target.value })} required>
                    <option value="VARCHAR">VARCHAR</option>
                    <option value="CHAR">CHAR</option>
                    <option value="NUMERIC">NUMERIC</option>
                    <option value="DATETIME">DATETIME</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '데이터 길이' : 'Data Length'}</label>
                  <input type="number" className="form-control" value={domainForm.dataLength !== undefined ? domainForm.dataLength : ''} onChange={(e) => setDomainForm({ ...domainForm, dataLength: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="e.g. 100" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '소수점 길이' : 'Decimal Length'}</label>
                  <input type="number" className="form-control" value={domainForm.decimalLength !== undefined ? domainForm.decimalLength : ''} onChange={(e) => setDomainForm({ ...domainForm, decimalLength: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="e.g. 0" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '저장형식' : 'Storage Format'}</label>
                  <input type="text" className="form-control" value={domainForm.storageFormat || ''} onChange={(e) => setDomainForm({ ...domainForm, storageFormat: e.target.value })} placeholder="e.g. VARCHAR(100), NUMERIC(10,2)" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '표현형식' : 'Expression Format'}</label>
                  <input type="text" className="form-control" value={domainForm.expressionFormat || ''} onChange={(e) => setDomainForm({ ...domainForm, expressionFormat: e.target.value })} placeholder="e.g. YYYY-MM-DD, XXX-XX" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '단위' : 'Unit'}</label>
                  <input type="text" className="form-control" value={domainForm.unit || ''} onChange={(e) => setDomainForm({ ...domainForm, unit: e.target.value })} placeholder="e.g. 원, kg, %" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '허용값' : 'Allowed Values'}</label>
                  <input type="text" className="form-control" value={domainForm.allowedValues || ''} onChange={(e) => setDomainForm({ ...domainForm, allowedValues: e.target.value })} placeholder="e.g. Y/N, 1-100" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '설명' : 'Description'}</label>
                <textarea className="form-control" rows={3} value={domainForm.description || ''} onChange={(e) => setDomainForm({ ...domainForm, description: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '제정차수' : 'Enactment Order'}</label>
                  <input type="text" className="form-control" value={domainForm.enactmentOrder || ''} onChange={(e) => setDomainForm({ ...domainForm, enactmentOrder: e.target.value })} placeholder="e.g. 1차" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '개정구분' : 'Revision Classification'}</label>
                  <input type="text" className="form-control" value={domainForm.revisionClassification || ''} onChange={(e) => setDomainForm({ ...domainForm, revisionClassification: e.target.value })} placeholder="e.g. 제정, 개정" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '개정항목' : 'Revision Item'}</label>
                  <input type="text" className="form-control" value={domainForm.revisionItem || ''} onChange={(e) => setDomainForm({ ...domainForm, revisionItem: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '개정사유' : 'Revision Reason'}</label>
                  <input type="text" className="form-control" value={domainForm.revisionReason || ''} onChange={(e) => setDomainForm({ ...domainForm, revisionReason: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary">{locale === 'ko' ? '저장' : 'Save'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{locale === 'ko' ? '취소' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: '300px' }}
                placeholder={locale === 'ko' ? '도메인 검색...' : 'Search domains...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {renderPageSizeSelector()}
            </div>
             {loading ? <p>Loading...</p> : (
              <>
                <div style={{ overflowX: 'auto', width: '100%', marginBottom: '1rem' }}>
                  <table className="table" style={{ fontSize: '0.9rem', minWidth: '1200px' }}>
                    <thead>
                      <tr>
                        <th>{locale === 'ko' ? '도메인 그룹' : 'Domain Group'}</th>
                        <th>{locale === 'ko' ? '도메인 분류' : 'Domain Classification'}</th>
                        <th>{locale === 'ko' ? '도메인명' : 'Domain Name'}</th>
                        <th>{locale === 'ko' ? '데이터 타입' : 'Data Type'}</th>
                        <th>{locale === 'ko' ? '데이터 길이' : 'Data Length'}</th>
                        <th>{locale === 'ko' ? '소수점 길이' : 'Decimal Length'}</th>
                        <th>{locale === 'ko' ? '저장형식' : 'Storage Format'}</th>
                        <th>{locale === 'ko' ? '표현형식' : 'Expression Format'}</th>
                        <th>{locale === 'ko' ? '단위' : 'Unit'}</th>
                        <th>{locale === 'ko' ? '허용값' : 'Allowed Values'}</th>
                        <th>{locale === 'ko' ? '설명' : 'Description'}</th>
                        <th>{locale === 'ko' ? '제정차수' : 'Enactment Order'}</th>
                        <th>{locale === 'ko' ? '개정구분' : 'Revision Classification'}</th>
                        <th>{locale === 'ko' ? '개정항목' : 'Revision Item'}</th>
                        <th>{locale === 'ko' ? '개정사유' : 'Revision Reason'}</th>
                        <th style={{ textAlign: 'right' }}>{locale === 'ko' ? '관리' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDomains.length === 0 ? (
                        <tr>
                          <td colSpan={16} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{locale === 'ko' ? '검색 결과가 없거나 등록된 도메인이 없습니다.' : 'No domains found.'}</td>
                        </tr>
                      ) : (
                        paginatedDomains.map((d) => (
                          <tr key={d.id}>
                            <td><span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)' }}>{d.domainGroup}</span></td>
                            <td><strong>{d.domainClassification}</strong></td>
                            <td>{d.name}</td>
                            <td>{d.dataType ? <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>{d.dataType}</span> : '-'}</td>
                            <td>{d.dataLength !== undefined && d.dataLength !== null ? d.dataLength : '-'}</td>
                            <td>{d.decimalLength !== undefined && d.decimalLength !== null ? d.decimalLength : '-'}</td>
                            <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{d.storageFormat || '-'}</span></td>
                            <td>{d.expressionFormat || '-'}</td>
                            <td>{d.unit || '-'}</td>
                            <td>{d.allowedValues || '-'}</td>
                            <td>{d.description || '-'}</td>
                            <td>{d.enactmentOrder || '-'}</td>
                            <td>{d.revisionClassification || '-'}</td>
                            <td>{d.revisionItem || '-'}</td>
                            <td>{d.revisionReason || '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.8rem' }} onClick={() => startEditDomain(d)}>{locale === 'ko' ? '수정' : 'Edit'}</button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)', fontSize: '0.8rem' }} onClick={() => handleDelete(d.id!)}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationControls(activeDomainPage, totalDomainPages, setDomainPage)}
              </>
            )}
          </div>
        )
      )}

      {/* Forbidden Words Panel */}
      {activeTab === 'forbidden' && (
        showForm ? (
          <div className="glass-card" style={{ maxWidth: '600px' }}>
            <h2>{editingId ? (locale === 'ko' ? '금칙어 수정' : 'Edit Forbidden Word') : (locale === 'ko' ? '금칙어 등록' : 'Register Forbidden Word')}</h2>
            <form onSubmit={handleCreateOrUpdate} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '차단 단어(금칙어)' : 'Forbidden Word'}</label>
                <input type="text" className="form-control" value={forbiddenForm.word} onChange={(e) => setForbiddenForm({ ...forbiddenForm, word: e.target.value })} required placeholder="e.g. PASS, SSN, ADDR" />
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '권장 대체어' : 'Recommended Word'}</label>
                <input type="text" className="form-control" value={forbiddenForm.replacement || ''} onChange={(e) => setForbiddenForm({ ...forbiddenForm, replacement: e.target.value })} placeholder="e.g. PWD, IDENT, LOC" />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1.5rem 0' }}>
                <input type="checkbox" id="forbiddenIsUsed" checked={forbiddenForm.isUsed !== false} onChange={(e) => setForbiddenForm({ ...forbiddenForm, isUsed: e.target.checked })} />
                <label htmlFor="forbiddenIsUsed" style={{ cursor: 'pointer', fontWeight: 'bold' }}>{locale === 'ko' ? '사용 여부' : 'Is Used'}</label>
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '설명' : 'Description'}</label>
                <textarea className="form-control" rows={3} value={forbiddenForm.description || ''} onChange={(e) => setForbiddenForm({ ...forbiddenForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary">{locale === 'ko' ? '저장' : 'Save'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{locale === 'ko' ? '취소' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: '300px' }}
                placeholder={locale === 'ko' ? '금칙어 검색...' : 'Search forbidden words...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {renderPageSizeSelector()}
            </div>
            {loading ? <p>Loading...</p> : (
              <>
                <div style={{ overflowX: 'auto', width: '100%', marginBottom: '1rem' }}>
                  <table className="table" style={{ minWidth: '800px' }}>
                    <thead>
                      <tr>
                        <th>{locale === 'ko' ? '차단 단어' : 'Forbidden Word'}</th>
                        <th>{locale === 'ko' ? '대체 추천어' : 'Recommended Word'}</th>
                        <th>{locale === 'ko' ? '사용 여부' : 'Is Used'}</th>
                        <th>{locale === 'ko' ? '설명' : 'Description'}</th>
                        <th style={{ textAlign: 'right' }}>{locale === 'ko' ? '관리' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedForbidden.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{locale === 'ko' ? '검색 결과가 없거나 등록된 금칙어가 없습니다.' : 'No forbidden words found.'}</td>
                        </tr>
                      ) : (
                        paginatedForbidden.map((fw) => (
                          <tr key={fw.id}>
                            <td><span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{fw.word}</span></td>
                            <td>{fw.replacement ? <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>{fw.replacement}</span> : '-'}</td>
                            <td>
                              <span className="badge" style={{ background: fw.isUsed !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: fw.isUsed !== false ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {fw.isUsed !== false ? (locale === 'ko' ? '사용' : 'Active') : (locale === 'ko' ? '미사용' : 'Inactive')}
                              </span>
                            </td>
                            <td>{fw.description || '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.8rem' }} onClick={() => startEditForbidden(fw)}>{locale === 'ko' ? '수정' : 'Edit'}</button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)', fontSize: '0.8rem' }} onClick={() => handleDelete(fw.id!)}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationControls(activeForbiddenPage, totalForbiddenPages, setForbiddenPage)}
              </>
            )}
          </div>
        )
      )}

      {/* Standard Words Panel */}
      {activeTab === 'words' && (
        showForm ? (
          <div className="glass-card" style={{ maxWidth: '600px' }}>
            <h2>{editingId ? (locale === 'ko' ? '표준단어 수정' : 'Edit Standard Word') : (locale === 'ko' ? '표준단어 등록' : 'Register Standard Word')}</h2>
            <form onSubmit={handleCreateOrUpdate} style={{ marginTop: '1.5rem' }}>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '논리 명칭 *' : 'Logical Word *'}</label>
                  <input type="text" className="form-control" value={wordForm.logicalName} onChange={(e) => setWordForm({ ...wordForm, logicalName: e.target.value })} required placeholder="e.g. 고객, 주문, 번호" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '물리 명칭 (약어) *' : 'Physical Abbreviation *'}</label>
                  <input type="text" className="form-control" value={wordForm.physicalName} onChange={(e) => setWordForm({ ...wordForm, physicalName: e.target.value.toUpperCase() })} required placeholder="e.g. CUST, ORD, NO" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '영문명' : 'English Name'}</label>
                  <input type="text" className="form-control" value={wordForm.englishName || ''} onChange={(e) => setWordForm({ ...wordForm, englishName: e.target.value })} placeholder="e.g. Customer, Order, Number" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {locale === 'ko' 
                    ? `연계 도메인 분류${wordForm.isFormatWord === 'Y' ? ' *' : ''}` 
                    : `Linked Domain Classification${wordForm.isFormatWord === 'Y' ? ' *' : ''}`}
                </label>
                <select className="form-control" value={wordForm.domainId} onChange={(e) => setWordForm({ ...wordForm, domainId: e.target.value })} required={wordForm.isFormatWord === 'Y'}>
                  <option value="">{locale === 'ko' ? '-- 선택하세요 --' : '-- Select Domain --'}</option>
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>{d.domainClassification} (Group: {d.domainGroup}, Name: {d.name})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1.5rem 0' }}>
                <input type="checkbox" id="isFormatWord" checked={wordForm.isFormatWord === 'Y'} onChange={(e) => setWordForm({ ...wordForm, isFormatWord: e.target.checked ? 'Y' : 'N' })} />
                <label htmlFor="isFormatWord" style={{ cursor: 'pointer', fontWeight: 'bold' }}>{locale === 'ko' ? '형식단어 여부' : 'Is Format Word'}</label>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '이음동의어' : 'Synonyms'}</label>
                  <input type="text" className="form-control" value={wordForm.synonyms || ''} onChange={(e) => setWordForm({ ...wordForm, synonyms: e.target.value })} placeholder="e.g. 고객명, 회원명" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '연관 금칙어' : 'Associated Forbidden Words'}</label>
                  <input type="text" className="form-control" value={wordForm.forbiddenWords || ''} onChange={(e) => setWordForm({ ...wordForm, forbiddenWords: e.target.value })} placeholder="e.g. CUST_NM, MEMBER" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '설명' : 'Description'}</label>
                <textarea className="form-control" rows={3} value={wordForm.description || ''} onChange={(e) => setWordForm({ ...wordForm, description: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '제정차수' : 'Enactment Order'}</label>
                  <input type="text" className="form-control" value={wordForm.enactmentOrder || ''} onChange={(e) => setWordForm({ ...wordForm, enactmentOrder: e.target.value })} placeholder="e.g. 1차" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '개정구분' : 'Revision Classification'}</label>
                  <input type="text" className="form-control" value={wordForm.revisionClassification || ''} onChange={(e) => setWordForm({ ...wordForm, revisionClassification: e.target.value })} placeholder="e.g. 제정, 개정" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '개정항목' : 'Revision Item'}</label>
                  <input type="text" className="form-control" value={wordForm.revisionItem || ''} onChange={(e) => setWordForm({ ...wordForm, revisionItem: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '개정사유' : 'Revision Reason'}</label>
                  <input type="text" className="form-control" value={wordForm.revisionReason || ''} onChange={(e) => setWordForm({ ...wordForm, revisionReason: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary">{locale === 'ko' ? '저장' : 'Save'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{locale === 'ko' ? '취소' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: '300px' }}
                placeholder={locale === 'ko' ? '표준단어 검색...' : 'Search standard words...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {renderPageSizeSelector()}
            </div>
            {loading ? <p>Loading...</p> : (
              <>
                <div style={{ overflowX: 'auto', width: '100%', marginBottom: '1rem' }}>
                  <table className="table" style={{ fontSize: '0.9rem', minWidth: '1200px' }}>
                    <thead>
                      <tr>
                        <th>{locale === 'ko' ? '논리명 (한글)' : 'Logical Name'}</th>
                        <th>{locale === 'ko' ? '물리명 (영문약어)' : 'Physical Abbreviation'}</th>
                        <th>{locale === 'ko' ? '영문명' : 'English Name'}</th>
                        <th>{locale === 'ko' ? '연계 도메인 분류' : 'Linked Domain Classification'}</th>
                        <th>{locale === 'ko' ? '형식단어' : 'Format Word'}</th>
                        <th>{locale === 'ko' ? '이음동의어' : 'Synonyms'}</th>
                        <th>{locale === 'ko' ? '연관 금칙어' : 'Forbidden Words'}</th>
                        <th>{locale === 'ko' ? '설명' : 'Description'}</th>
                        <th>{locale === 'ko' ? '제정차수' : 'Enactment Order'}</th>
                        <th>{locale === 'ko' ? '개정구분' : 'Revision Classification'}</th>
                        <th>{locale === 'ko' ? '개정항목' : 'Revision Item'}</th>
                        <th>{locale === 'ko' ? '개정사유' : 'Revision Reason'}</th>
                        <th style={{ textAlign: 'right' }}>{locale === 'ko' ? '관리' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedWords.length === 0 ? (
                        <tr>
                          <td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{locale === 'ko' ? '검색 결과가 없거나 등록된 표준단어가 없습니다.' : 'No standard words found.'}</td>
                        </tr>
                      ) : (
                        paginatedWords.map((w) => (
                          <tr key={w.id}>
                            <td><strong>{w.logicalName}</strong></td>
                            <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{w.physicalName}</span></td>
                            <td>{w.englishName || '-'}</td>
                            <td><span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>{w.domainName || 'No Domain'}</span></td>
                            <td>
                              <span className="badge" style={{ 
                                background: w.isFormatWord === 'Y' ? 'rgba(59,130,246,0.1)' : 'rgba(107,114,128,0.1)', 
                                color: w.isFormatWord === 'Y' ? 'var(--color-primary)' : 'var(--text-muted)' 
                              }}>
                                {w.isFormatWord === 'Y' ? (locale === 'ko' ? 'Y (형식)' : 'Y') : 'N'}
                              </span>
                            </td>
                            <td>{w.synonyms || '-'}</td>
                            <td>{w.forbiddenWords ? <span style={{ color: 'var(--color-danger)' }}>{w.forbiddenWords}</span> : '-'}</td>
                            <td>{w.description || '-'}</td>
                            <td>{w.enactmentOrder || '-'}</td>
                            <td>{w.revisionClassification || '-'}</td>
                            <td>{w.revisionItem || '-'}</td>
                            <td>{w.revisionReason || '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.8rem' }} onClick={() => startEditWord(w)}>{locale === 'ko' ? '수정' : 'Edit'}</button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)', fontSize: '0.8rem' }} onClick={() => handleDelete(w.id!)}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationControls(activeWordPage, totalWordPages, setWordPage)}
              </>
            )}
          </div>
        )
      )}

      {/* Standard Terms Panel & wizard assembler */}
      {activeTab === 'terms' && (
        showForm ? (
          <div className="grid-2" style={{ gap: '2rem', alignItems: 'flex-start' }}>
            <div className="glass-card">
              <h2>{locale === 'ko' ? '단어 선택기 (Term Assembler)' : 'Select Words to Combine'}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {locale === 'ko' ? '선택한 표준단어들의 조합 순서에 따라 물리명(예: CUST_NO)과 도메인 타입이 자동 계산됩니다.' : 'Logical/Physical names and data types are automatically generated based on word combination order.'}
              </p>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder={locale === 'ko' ? '표준단어 찾기...' : 'Search standard words...'}
                  value={wordSelectorSearch}
                  onChange={(e) => setWordSelectorSearch(e.target.value)}
                />
              </div>
              <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
                {filteredSelectorWords.map(w => (
                  <label key={w.id} className="glass-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={selectedWordIds.includes(w.id!)}
                      onChange={(e) => handleWordSelect(w.id!, e.target.checked)}
                    />
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{w.logicalName}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({w.physicalName})</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="glass-card">
              <h2>{editingId ? (locale === 'ko' ? '표준용어 수정' : 'Edit Standard Term') : (locale === 'ko' ? '표준용어 등록' : 'Register Standard Term')}</h2>
              <form onSubmit={handleCreateOrUpdate} style={{ marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '용어 한글명 (논리명)' : 'Logical Name'}</label>
                  <input type="text" className="form-control" value={termForm.logicalName} onChange={(e) => setTermForm({ ...termForm, logicalName: e.target.value })} required placeholder="e.g. 고객번호, 주문일자" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '용어 영문명 (물리명)' : 'Physical Column Name'}</label>
                  <input type="text" className="form-control" value={termForm.physicalName} onChange={(e) => setTermForm({ ...termForm, physicalName: e.target.value.toUpperCase() })} required placeholder="e.g. CUST_NO, ORD_DT" />
                </div>
                
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '공통표준도메인명' : 'Common Domain Name'}</label>
                    <select 
                      className="form-control" 
                      value={termForm.commonDomainName || ''} 
                      onChange={(e) => setTermForm({ ...termForm, commonDomainName: e.target.value })}
                    >
                      <option value="">{locale === 'ko' ? '-- 선택하세요 --' : '-- Select Domain --'}</option>
                      {domains.map(d => (
                        <option key={d.id} value={d.name}>{d.name} ({d.domainClassification})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '허용값' : 'Allowed Values'}</label>
                    <input type="text" className="form-control" value={termForm.allowedValues || ''} onChange={(e) => setTermForm({ ...termForm, allowedValues: e.target.value })} placeholder="e.g. Y/N, 1-100" />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '저장형식' : 'Storage Format'}</label>
                    <input type="text" className="form-control" value={termForm.storageFormat || ''} onChange={(e) => setTermForm({ ...termForm, storageFormat: e.target.value })} placeholder="e.g. VARCHAR(100), NUMERIC(10,2)" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '표현형식' : 'Expression Format'}</label>
                    <input type="text" className="form-control" value={termForm.expressionFormat || ''} onChange={(e) => setTermForm({ ...termForm, expressionFormat: e.target.value })} placeholder="e.g. YYYY-MM-DD, XXX-XX-XXXX" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '행정코드명' : 'Admin Code Name'}</label>
                  <input type="text" className="form-control" value={termForm.adminCodeName || ''} onChange={(e) => setTermForm({ ...termForm, adminCodeName: e.target.value })} placeholder="e.g. 행정동코드" />
                </div>

                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '설명' : 'Description'}</label>
                  <textarea className="form-control" rows={3} value={termForm.description || ''} onChange={(e) => setTermForm({ ...termForm, description: e.target.value })} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '소관기관명' : 'Admin Agency Name'}</label>
                    <input type="text" className="form-control" value={termForm.adminAgencyName || ''} onChange={(e) => setTermForm({ ...termForm, adminAgencyName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '연관금칙어' : 'Associated Forbidden Words'}</label>
                    <input type="text" className="form-control" value={termForm.forbiddenWords || ''} onChange={(e) => setTermForm({ ...termForm, forbiddenWords: e.target.value })} placeholder="e.g. ADDR" />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '제정차수' : 'Enactment Order'}</label>
                    <input type="text" className="form-control" value={termForm.enactmentOrder || ''} onChange={(e) => setTermForm({ ...termForm, enactmentOrder: e.target.value })} placeholder="e.g. 1차" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '개정구분' : 'Revision Classification'}</label>
                    <input type="text" className="form-control" value={termForm.revisionClassification || ''} onChange={(e) => setTermForm({ ...termForm, revisionClassification: e.target.value })} placeholder="e.g. 제정, 개정" />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '개정항목' : 'Revision Item'}</label>
                    <input type="text" className="form-control" value={termForm.revisionItem || ''} onChange={(e) => setTermForm({ ...termForm, revisionItem: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{locale === 'ko' ? '개정사유' : 'Revision Reason'}</label>
                    <input type="text" className="form-control" value={termForm.revisionReason || ''} onChange={(e) => setTermForm({ ...termForm, revisionReason: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="submit" className="btn btn-primary">{locale === 'ko' ? '저장' : 'Save'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{locale === 'ko' ? '취소' : 'Cancel'}</button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: '300px' }}
                placeholder={locale === 'ko' ? '표준용어 검색...' : 'Search standard terms...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {renderPageSizeSelector()}
            </div>
            {loading ? <p>Loading...</p> : (
              <>
                <div style={{ overflowX: 'auto', width: '100%', marginBottom: '1rem' }}>
                  <table className="table" style={{ fontSize: '0.9rem', minWidth: '1200px' }}>
                    <thead>
                      <tr>
                        <th>{locale === 'ko' ? '용어 논리명' : 'Logical Term'}</th>
                        <th>{locale === 'ko' ? '용어 물리명' : 'Physical Column Name'}</th>
                        <th>{locale === 'ko' ? '공통표준도메인명' : 'Common Domain'}</th>
                        <th>{locale === 'ko' ? '허용값' : 'Allowed Values'}</th>
                        <th>{locale === 'ko' ? '저장형식' : 'Storage Format'}</th>
                        <th>{locale === 'ko' ? '표현형식' : 'Expression Format'}</th>
                        <th>{locale === 'ko' ? '행정코드명' : 'Admin Code'}</th>
                        <th>{locale === 'ko' ? '설명' : 'Description'}</th>
                        <th>{locale === 'ko' ? '소관기관명' : 'Admin Agency'}</th>
                        <th>{locale === 'ko' ? '연관금칙어' : 'Forbidden Words'}</th>
                        <th>{locale === 'ko' ? '제정차수' : 'Enactment Order'}</th>
                        <th>{locale === 'ko' ? '개정구분' : 'Revision Classification'}</th>
                        <th>{locale === 'ko' ? '개정항목' : 'Revision Item'}</th>
                        <th>{locale === 'ko' ? '개정사유' : 'Revision Reason'}</th>
                        <th style={{ textAlign: 'right' }}>{locale === 'ko' ? '관리' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTerms.length === 0 ? (
                        <tr>
                          <td colSpan={15} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{locale === 'ko' ? '검색 결과가 없거나 등록된 표준용어가 없습니다.' : 'No standard terms found.'}</td>
                        </tr>
                      ) : (
                        paginatedTerms.map((t) => (
                          <tr key={t.id}>
                            <td><strong>{t.logicalName}</strong></td>
                            <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)' }}>{t.physicalName}</span></td>
                            <td>{t.commonDomainName || '-'}</td>
                            <td>{t.allowedValues || '-'}</td>
                            <td>{t.storageFormat || '-'}</td>
                            <td>{t.expressionFormat || '-'}</td>
                            <td>{t.adminCodeName || '-'}</td>
                            <td>{t.description || '-'}</td>
                            <td>{t.adminAgencyName || '-'}</td>
                            <td>{t.forbiddenWords ? <span style={{ color: 'var(--color-danger)' }}>{t.forbiddenWords}</span> : '-'}</td>
                            <td>{t.enactmentOrder || '-'}</td>
                            <td>{t.revisionClassification || '-'}</td>
                            <td>{t.revisionItem || '-'}</td>
                            <td>{t.revisionReason || '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.8rem' }} onClick={() => startEditTerm(t)}>{locale === 'ko' ? '수정' : 'Edit'}</button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)', fontSize: '0.8rem' }} onClick={() => handleDelete(t.id!)}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationControls(activeTermPage, totalTermPages, setTermPage)}
              </>
            )}
          </div>
        )
      )}

      {/* CSV Bulk Panel */}
      {activeTab === 'import' && (
        <div className="grid-2" style={{ gap: '2.5rem' }}>
          <div className="glass-card">
            <h2>{locale === 'ko' ? '표준체계 일괄 다운로드 (Export)' : 'Export Standardization Registries'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              {locale === 'ko' ? '현재 테넌트에 등록된 표준화 메타데이터를 CSV 형식 파일로 다운로드합니다.' : 'Download current standard metadata as CSV format files.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => triggerExport('domains')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{locale === 'ko' ? '1. 도메인 메타데이터 반출' : '1. Export Domains'}</span>
                <Download size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => triggerExport('forbidden-words')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{locale === 'ko' ? '2. 금칙어 사전 반출' : '2. Export Forbidden Words'}</span>
                <Download size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => triggerExport('words')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{locale === 'ko' ? '3. 표준단어 사전 반출' : '3. Export Standard Words'}</span>
                <Download size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => triggerExport('terms')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{locale === 'ko' ? '4. 표준용어 사전 반출' : '4. Export Standard Terms'}</span>
                <Download size={16} />
              </button>
            </div>
          </div>

          <div className="glass-card">
            <h2>{locale === 'ko' ? '표준체계 일괄 업로드 (Import)' : 'Import Standardization CSV'}</h2>
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">{locale === 'ko' ? '업로드 대상 선택' : 'Choose Import Target'}</label>
              <select className="form-control" value={importType} onChange={(e) => { setImportType(e.target.value as any); setImportReport(null); }}>
                <option value="domains">{locale === 'ko' ? '도메인 (Domains)' : 'Domains'}</option>
                <option value="forbidden-words">{locale === 'ko' ? '금칙어 (Forbidden Words)' : 'Forbidden Words'}</option>
                <option value="words">{locale === 'ko' ? '표준단어 (Standard Words)' : 'Standard Words'}</option>
                <option value="terms">{locale === 'ko' ? '표준용어 (Standard Terms)' : 'Standard Terms'}</option>
              </select>
            </div>

            <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                {locale === 'ko' ? '📌 선택된 대상의 CSV 헤더/컬럼 규격' : '📌 Expected CSV Header Columns'}
              </strong>
              <code style={{ fontSize: '0.8rem', color: 'var(--color-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {importType === 'domains' && 'domainGroup,domainClassification,name,description,dataType,dataLength,decimalLength,storageFormat,expressionFormat,unit,allowedValues,enactmentOrder,revisionClassification,revisionItem,revisionReason'}
                {importType === 'forbidden-words' && 'word,replacement,isUsed,description'}
                {importType === 'words' && 'logicalName,physicalName,englishName,description,isFormatWord,domainClassification,synonyms,forbiddenWords,enactmentOrder,revisionClassification,revisionItem,revisionReason'}
                {importType === 'terms' && 'logicalName,description,physicalName,commonDomainName,allowedValues,storageFormat,expressionFormat,adminCodeName,adminAgencyName,forbiddenWords,enactmentOrder,revisionClassification,revisionItem,revisionReason'}
              </code>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => document.getElementById('csvBulkFileInput')?.click()}
                disabled={loading}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', padding: '1rem' }}
              >
                <Upload size={18} /> {loading ? (locale === 'ko' ? '처리 중...' : 'Processing...') : (locale === 'ko' ? 'CSV 파일 선택 및 등록' : 'Select CSV & Load')}
              </button>
              <input
                type="file"
                id="csvBulkFileInput"
                accept=".csv"
                onChange={handleCsvUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Validation Logs */}
            {importReport && (
              <div className="glass-card" style={{ marginTop: '2rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span>{locale === 'ko' ? '검증 처리 내역 리포트' : 'Import Execution Log'}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {importReport.successCount} / {importReport.totalRows} {locale === 'ko' ? '성공' : 'Success'}
                  </span>
                </h3>
                <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'monospace' }}>
                  {importReport.logs.map((logStr, idx) => (
                    <div key={idx} style={{ color: logStr.includes('FAILED') ? '#ef4444' : '#10b981' }}>
                      {logStr}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compliance Stats Dashboard */}
      {activeTab === 'report' && complianceReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Filters Bar */}
          <div className="glass-card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '1rem 1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{locale === 'ko' ? '데이터소스 필터:' : 'Connection Filter:'}</span>
              <select
                className="form-control"
                value={selectedReportDsId}
                onChange={(e) => setSelectedReportDsId(e.target.value)}
                style={{ width: 'auto', minWidth: '200px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              >
                <option value="">{locale === 'ko' ? '-- 전체 데이터소스 --' : '-- All Data Sources --'}</option>
                {reportDataSources.map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{locale === 'ko' ? '스키마 필터:' : 'Schema Filter:'}</span>
              <select
                className="form-control"
                value={selectedReportSchemaId}
                onChange={(e) => setSelectedReportSchemaId(e.target.value)}
                disabled={!selectedReportDsId}
                style={{ width: 'auto', minWidth: '200px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              >
                <option value="">{locale === 'ko' ? '-- 전체 스키마 --' : '-- All Schemas --'}</option>
                {reportSchemas.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid-3">
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <Grid size={24} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{complianceReport.totalColumns}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{locale === 'ko' ? '전체 컬럼 수' : 'Total Schema Columns'}</div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <CheckCircle size={24} style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{complianceReport.compliantColumns}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{locale === 'ko' ? '명칭 준수 컬럼' : 'Name Compliant'}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>({complianceReport.complianceRate}%)</div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <CheckCircle2 size={24} style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>{complianceReport.fullyCompliantColumns}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{locale === 'ko' ? '완전 준수 컬럼 (명칭+타입)' : 'Fully Compliant'}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>({complianceReport.fullComplianceRate}%)</div>
            </div>
          </div>

          {/* Progress Chart */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>{locale === 'ko' ? '데이터 표준 준수 진척도' : 'Standard Compliance Progress'}</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span>{locale === 'ko' ? '물리 명칭 준수율 (Name Compliance)' : 'Name Compliance'}</span>
                <strong>{complianceReport.complianceRate}%</strong>
              </div>
              <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${complianceReport.complianceRate}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-success))', height: '100%', borderRadius: '8px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span>{locale === 'ko' ? '완전 정합 준수율 (Name + Type Compliance)' : 'Name + Type Compliance'}</span>
                <strong>{complianceReport.fullComplianceRate}%</strong>
              </div>
              <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${complianceReport.fullComplianceRate}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))', height: '100%', borderRadius: '8px' }} />
              </div>
            </div>
          </div>

          {/* Non-compliant Columns Details Table */}
          <div className="glass-card">
            <h2>{locale === 'ko' ? '⚠️ 미준수 및 정밀 분석 대상 컬럼 목록 (최대 50개)' : '⚠️ Non-compliant Columns (Top 50)'}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {locale === 'ko' 
                ? '물리명이 표준 용어 사전에 없거나, 금칙어가 포함되었거나, 혹은 등록된 도메인 타입 규격과 상이한 물리 컬럼 목록입니다.' 
                : 'Columns that do not match standard terminology, contain forbidden words, or mismatch domain datatypes.'}
            </p>

            <div className="table-responsive" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{locale === 'ko' ? '데이터소스' : 'Source'}</th>
                    <th>{locale === 'ko' ? '스키마' : 'Schema'}</th>
                    <th>{locale === 'ko' ? '테이블' : 'Table'}</th>
                    <th>{locale === 'ko' ? '컬럼명' : 'Column'}</th>
                    <th>{locale === 'ko' ? '데이터 타입' : 'Data Type'}</th>
                    <th>{locale === 'ko' ? '진단 위반 사유' : 'Violation Reason'}</th>
                    <th>{locale === 'ko' ? '추천 표준 물리명/용어' : 'Recommended Term'}</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceReport.nonCompliantColumns.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-success)', padding: '2rem' }}>
                        {locale === 'ko' ? '🎉 모든 컬럼이 완벽하게 표준 지침을 준수하고 있습니다!' : 'All columns are perfectly compliant!'}
                      </td>
                    </tr>
                  ) : (
                    complianceReport.nonCompliantColumns.map((col, idx) => (
                      <tr key={idx}>
                        <td>{col.datasourceName}</td>
                        <td>{col.schemaName}</td>
                        <td>{col.tableName}</td>
                        <td style={{ fontWeight: 600 }}>{col.columnName}</td>
                        <td><code style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{col.columnDataType}</code></td>
                        <td>
                          <span className={`badge ${
                            col.violationType === 'FORBIDDEN_WORD_DETECTED' ? 'badge-danger' : col.violationType === 'TYPE_MISMATCH' ? 'badge-warning' : 'badge-secondary'
                          }`} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                            {col.violationMessage}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.85rem' }}>{col.suggestedPhysicalName}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({col.suggestedLogicalName})</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
