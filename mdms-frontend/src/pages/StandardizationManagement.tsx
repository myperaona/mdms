import React, { useState, useEffect } from 'react';
import { request } from '../services/api';
import { useTranslation } from '../context/i18n';
import {
  Plus,
  Trash2,
  CheckCircle,
  Download,
  Upload,
  BarChart,
  Grid
} from 'lucide-react';

interface Domain {
  id?: string;
  name: string;
  dataType: string;
  length?: number;
  precisionVal?: number;
  formatPattern?: string;
  description?: string;
}

interface ForbiddenWord {
  id?: string;
  word: string;
  replacement?: string;
  description?: string;
}

interface StandardWord {
  id?: string;
  logicalName: string;
  physicalName: string;
  domainId: string;
  domainName?: string;
  description?: string;
}

interface StandardTerm {
  id?: string;
  logicalName: string;
  physicalName: string;
  description?: string;
  wordIds?: string;
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
  complianceRate: number;
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

  // Form inputs
  const [domainForm, setDomainForm] = useState<Domain>({ name: '', dataType: 'VARCHAR', length: 100, precisionVal: 0, formatPattern: '', description: '' });
  const [forbiddenForm, setForbiddenForm] = useState<ForbiddenWord>({ word: '', replacement: '', description: '' });
  const [wordForm, setWordForm] = useState<StandardWord>({ logicalName: '', physicalName: '', domainId: '', description: '' });
  const [termForm, setTermForm] = useState<StandardTerm>({ logicalName: '', physicalName: '', description: '', wordIds: '' });

  // Wizard state for Terms
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);

  // CSV Import state
  const [importType, setImportType] = useState<'domains' | 'forbidden-words' | 'words' | 'terms'>('domains');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  // Compliance report state
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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
      } else if (activeTab === 'report') {
        const res = await request('/standardization/report');
        setComplianceReport(res);
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
        const payload = { ...wordForm, id: editingId || undefined };
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
    setDomainForm({ name: '', dataType: 'VARCHAR', length: 100, precisionVal: 0, formatPattern: '', description: '' });
    setForbiddenForm({ word: '', replacement: '', description: '' });
    setWordForm({ logicalName: '', physicalName: '', domainId: '', description: '' });
    setTermForm({ logicalName: '', physicalName: '', description: '', wordIds: '' });
    setSelectedWordIds([]);
  };

  const startEditDomain = (d: Domain) => {
    setDomainForm({ ...d });
    setEditingId(d.id || null);
    setShowForm(true);
  };

  const startEditForbidden = (fw: ForbiddenWord) => {
    setForbiddenForm({ ...fw });
    setEditingId(fw.id || null);
    setShowForm(true);
  };

  const startEditWord = (w: StandardWord) => {
    setWordForm({ ...w });
    setEditingId(w.id || null);
    setShowForm(true);
  };

  const startEditTerm = (t: StandardTerm) => {
    setTermForm({ ...t });
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
      setTermForm(prev => ({ ...prev, logicalName: '', physicalName: '', wordIds: '' }));
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
        wordIds: updatedWordIds.join(',')
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>{locale === 'ko' ? '데이터 표준화 관리' : 'Data Standardization Registry'}</h1>
          <p>{locale === 'ko' ? '전사 데이터 도메인, 표준단어, 표준용어 및 금칙어 규격 체계를 수립합니다.' : 'Establish corporate data domains, standard words, standard terms, and forbidden vocabularies.'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-menu" style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        <button className={`tab-item ${activeTab === 'domains' ? 'active' : ''}`} onClick={() => { setActiveTab('domains'); resetForms(); setShowForm(false); }}>
          {locale === 'ko' ? '도메인 관리' : 'Domain Registry'}
        </button>
        <button className={`tab-item ${activeTab === 'forbidden' ? 'active' : ''}`} onClick={() => { setActiveTab('forbidden'); resetForms(); setShowForm(false); }}>
          {locale === 'ko' ? '금칙어 관리' : 'Forbidden Words'}
        </button>
        <button className={`tab-item ${activeTab === 'words' ? 'active' : ''}`} onClick={() => { setActiveTab('words'); resetForms(); setShowForm(false); }}>
          {locale === 'ko' ? '표준단어 관리' : 'Standard Words'}
        </button>
        <button className={`tab-item ${activeTab === 'terms' ? 'active' : ''}`} onClick={() => { setActiveTab('terms'); resetForms(); setShowForm(false); }}>
          {locale === 'ko' ? '표준용어 관리' : 'Standard Terms'}
        </button>
        <button className={`tab-item ${activeTab === 'import' ? 'active' : ''}`} onClick={() => { setActiveTab('import'); resetForms(); setShowForm(false); }}>
          {locale === 'ko' ? '일괄 등록/반출' : 'Bulk CSV'}
        </button>
        <button className={`tab-item ${activeTab === 'report' ? 'active' : ''}`} onClick={() => { setActiveTab('report'); resetForms(); setShowForm(false); }}>
          {locale === 'ko' ? '준수율 리포트' : 'Compliance Stats'}
        </button>
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
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '도메인명' : 'Domain Name'}</label>
                <input type="text" className="form-control" value={domainForm.name} onChange={(e) => setDomainForm({ ...domainForm, name: e.target.value })} required placeholder="e.g. 금액, 수량, 일자" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '데이터 타입' : 'Data Type'}</label>
                  <select className="form-control" value={domainForm.dataType} onChange={(e) => setDomainForm({ ...domainForm, dataType: e.target.value })} required>
                    <option value="VARCHAR">VARCHAR</option>
                    <option value="CHAR">CHAR</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="NUMERIC">NUMERIC</option>
                    <option value="DATE">DATE</option>
                    <option value="TIMESTAMP">TIMESTAMP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '길이' : 'Length'}</label>
                  <input type="number" className="form-control" value={domainForm.length || ''} onChange={(e) => setDomainForm({ ...domainForm, length: parseInt(e.target.value) || undefined })} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '소수점 정밀도' : 'Precision'}</label>
                  <input type="number" className="form-control" value={domainForm.precisionVal || ''} onChange={(e) => setDomainForm({ ...domainForm, precisionVal: parseInt(e.target.value) || undefined })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '포맷 패턴' : 'Format Pattern'}</label>
                  <input type="text" className="form-control" value={domainForm.formatPattern || ''} onChange={(e) => setDomainForm({ ...domainForm, formatPattern: e.target.value })} placeholder="e.g. YYYYMMDD" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '설명' : 'Description'}</label>
                <textarea className="form-control" rows={3} value={domainForm.description || ''} onChange={(e) => setDomainForm({ ...domainForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary">{locale === 'ko' ? '저장' : 'Save'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{locale === 'ko' ? '취소' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="glass-card">
            {loading ? <p>Loading...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{locale === 'ko' ? '도메인명' : 'Domain Name'}</th>
                    <th>{locale === 'ko' ? '물리 타입' : 'Physical Type'}</th>
                    <th>{locale === 'ko' ? '길이' : 'Length'}</th>
                    <th>{locale === 'ko' ? '정밀도' : 'Precision'}</th>
                    <th>{locale === 'ko' ? '패턴' : 'Pattern'}</th>
                    <th>{locale === 'ko' ? '설명' : 'Description'}</th>
                    <th style={{ textAlign: 'right' }}>{locale === 'ko' ? '관리' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{locale === 'ko' ? '등록된 도메인이 없습니다.' : 'No domains registered.'}</td>
                    </tr>
                  ) : (
                    domains.map((d) => (
                      <tr key={d.id}>
                        <td><strong>{d.name}</strong></td>
                        <td><span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)' }}>{d.dataType}</span></td>
                        <td>{d.length || '-'}</td>
                        <td>{d.precisionVal || '-'}</td>
                        <td>{d.formatPattern || '-'}</td>
                        <td>{d.description || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.8rem' }} onClick={() => startEditDomain(d)}>{locale === 'ko' ? '수정' : 'Edit'}</button>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)', fontSize: '0.8rem' }} onClick={() => handleDelete(d.id!)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
            {loading ? <p>Loading...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{locale === 'ko' ? '차단 단어' : 'Forbidden Word'}</th>
                    <th>{locale === 'ko' ? '대체 추천어' : 'Recommended Word'}</th>
                    <th>{locale === 'ko' ? '설명' : 'Description'}</th>
                    <th style={{ textAlign: 'right' }}>{locale === 'ko' ? '관리' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {forbiddenWords.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{locale === 'ko' ? '등록된 금칙어가 없습니다.' : 'No forbidden words registered.'}</td>
                    </tr>
                  ) : (
                    forbiddenWords.map((fw) => (
                      <tr key={fw.id}>
                        <td><span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{fw.word}</span></td>
                        <td>{fw.replacement ? <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>{fw.replacement}</span> : '-'}</td>
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
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '논리 명칭' : 'Logical Word'}</label>
                  <input type="text" className="form-control" value={wordForm.logicalName} onChange={(e) => setWordForm({ ...wordForm, logicalName: e.target.value })} required placeholder="e.g. 고객, 주문, 번호" />
                </div>
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '물리 명칭 (약어)' : 'Physical Abbreviation'}</label>
                  <input type="text" className="form-control" value={wordForm.physicalName} onChange={(e) => setWordForm({ ...wordForm, physicalName: e.target.value.toUpperCase() })} required placeholder="e.g. CUST, ORD, NO" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '연계 도메인' : 'Linked Domain'}</label>
                <select className="form-control" value={wordForm.domainId} onChange={(e) => setWordForm({ ...wordForm, domainId: e.target.value })} required>
                  <option value="">{locale === 'ko' ? '-- 선택하세요 --' : '-- Select Domain --'}</option>
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.dataType}{d.length ? `(${d.length})` : ''})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '설명' : 'Description'}</label>
                <textarea className="form-control" rows={3} value={wordForm.description || ''} onChange={(e) => setWordForm({ ...wordForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary">{locale === 'ko' ? '저장' : 'Save'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{locale === 'ko' ? '취소' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="glass-card">
            {loading ? <p>Loading...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{locale === 'ko' ? '논리명 (한글)' : 'Logical Name'}</th>
                    <th>{locale === 'ko' ? '물리명 (영문약어)' : 'Physical Abbreviation'}</th>
                    <th>{locale === 'ko' ? '참조 도메인' : 'Referenced Domain'}</th>
                    <th>{locale === 'ko' ? '설명' : 'Description'}</th>
                    <th style={{ textAlign: 'right' }}>{locale === 'ko' ? '관리' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {words.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{locale === 'ko' ? '등록된 표준단어가 없습니다.' : 'No standard words registered.'}</td>
                    </tr>
                  ) : (
                    words.map((w) => (
                      <tr key={w.id}>
                        <td><strong>{w.logicalName}</strong></td>
                        <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{w.physicalName}</span></td>
                        <td><span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>{w.domainName || 'No Domain'}</span></td>
                        <td>{w.description || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.8rem' }} onClick={() => startEditWord(w)}>{locale === 'ko' ? '수정' : 'Edit'}</button>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)', fontSize: '0.8rem' }} onClick={() => handleDelete(w.id!)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
              <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
                {words.map(w => (
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
                <div className="form-group">
                  <label className="form-label">{locale === 'ko' ? '설명' : 'Description'}</label>
                  <textarea className="form-control" rows={3} value={termForm.description || ''} onChange={(e) => setTermForm({ ...termForm, description: e.target.value })} />
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
            {loading ? <p>Loading...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{locale === 'ko' ? '용어 논리명' : 'Logical Term'}</th>
                    <th>{locale === 'ko' ? '용어 물리명' : 'Physical Column Name'}</th>
                    <th>{locale === 'ko' ? '설명' : 'Description'}</th>
                    <th style={{ textAlign: 'right' }}>{locale === 'ko' ? '관리' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{locale === 'ko' ? '등록된 표준용어가 없습니다.' : 'No standard terms registered.'}</td>
                    </tr>
                  ) : (
                    terms.map((t) => (
                      <tr key={t.id}>
                        <td><strong>{t.logicalName}</strong></td>
                        <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)' }}>{t.physicalName}</span></td>
                        <td>{t.description || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.8rem' }} onClick={() => startEditTerm(t)}>{locale === 'ko' ? '수정' : 'Edit'}</button>
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)', fontSize: '0.8rem' }} onClick={() => handleDelete(t.id!)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
          <div className="grid-3">
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <Grid size={24} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{complianceReport.totalColumns}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{locale === 'ko' ? '전체 컬럼 수' : 'Total Schema Columns'}</div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <CheckCircle size={24} style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{complianceReport.compliantColumns}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{locale === 'ko' ? '표준 준수 컬럼 수' : 'Compliant Columns'}</div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <BarChart size={24} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{complianceReport.complianceRate}%</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{locale === 'ko' ? '전사 데이터 표준 준수율' : 'Standard Compliance Rate'}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{locale === 'ko' ? '전사 데이터 표준 준수 실적 분석' : 'Standardization Compliance Analysis'}</h2>
            <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', display: 'flex', marginBottom: '1rem' }}>
              <div
                style={{
                  width: `${complianceReport.complianceRate}%`,
                  background: 'linear-gradient(90deg, var(--color-primary), #10b981)',
                  height: '100%',
                  borderRadius: '12px',
                  transition: 'width 1s ease-in-out'
                }}
              />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {locale === 'ko'
                ? `현재 전체 ${complianceReport.totalColumns}개 메타데이터 컬럼 중 ${complianceReport.compliantColumns}개 컬럼이 표준 등록된 물리 용어를 따르고 있습니다.`
                : `Out of ${complianceReport.totalColumns} schema columns registered in the catalog, ${complianceReport.compliantColumns} columns comply with the standard terms.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
