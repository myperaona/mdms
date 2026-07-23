import React, { useState, useEffect } from 'react';
import { request } from '../services/api';
import { Folder, Table, FileCode2, Key, Link2, Search, Edit2, Check, X, Info } from 'lucide-react';
import { useTranslation } from '../context/i18n';

export default function DataCatalog() {
  const { t, locale } = useTranslation();
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [selectedDsId, setSelectedDsId] = useState('');
  const [schemas, setSchemas] = useState<any[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [columns, setColumns] = useState<any[]>([]);
  
  // Tab and Lineage states
  const [activeTab, setActiveTab] = useState<'columns' | 'lineage'>('columns');
  const [lineage, setLineage] = useState<{ upstream: any[], downstream: any[] }>({ upstream: [], downstream: [] });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Edit states
  const [editingTableDesc, setEditingTableDesc] = useState(false);
  const [tableDescText, setTableDescText] = useState('');
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [colDescText, setColDescText] = useState('');
  const [colNameText, setColNameText] = useState('');
  const [colDataTypeText, setColDataTypeText] = useState('');
  const [standardTerms, setStandardTerms] = useState<any[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  const loadDataSources = async () => {
    try {
      const data = await request('/datasources');
      setDataSources(data);
      if (data.length > 0) {
        setSelectedDsId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load data sources', e);
    }
  };

  const loadStandardTerms = async () => {
    try {
      const res = await request('/standardization/terms');
      setStandardTerms(res);
    } catch (e) {
      console.error('Failed to load standard terms for mapping', e);
    }
  };

  useEffect(() => {
    loadDataSources();
    loadStandardTerms();
  }, []);

  useEffect(() => {
    if (!selectedDsId) return;
    const loadSchemas = async () => {
      try {
        const data = await request(`/catalog/datasources/${selectedDsId}/schemas`);
        setSchemas(data);
        if (data.length > 0) {
          setSelectedSchemaId(data[0].id);
        } else {
          setSchemas([]);
          setSelectedSchemaId('');
          setTables([]);
          setSelectedTable(null);
        }
      } catch (e) {
        console.error('Failed to load schemas', e);
      }
    };
    loadSchemas();
  }, [selectedDsId]);

  useEffect(() => {
    if (!selectedSchemaId) return;
    const loadTables = async () => {
      try {
        const data = await request(`/catalog/schemas/${selectedSchemaId}/tables`);
        setTables(data);
        if (data.length > 0) {
          handleSelectTable(data[0]);
        } else {
          setTables([]);
          setSelectedTable(null);
        }
      } catch (e) {
        console.error('Failed to load tables', e);
      }
    };
    loadTables();
  }, [selectedSchemaId]);

  const handleSelectTable = async (table: any) => {
    setSelectedTable(table);
    setTableDescText(table.description || '');
    setEditingTableDesc(false);
    setEditingColId(null);
    setActiveTab('columns');

    try {
      const data = await request(`/catalog/tables/${table.id}/columns`);
      setColumns(data);
      const linData = await request(`/catalog/tables/${table.id}/lineage`);
      setLineage(linData);
    } catch (e) {
      console.error('Failed to load columns/lineage', e);
    }
  };

  const handleSaveTableDesc = async () => {
    if (!selectedTable) return;
    try {
      await request(`/catalog/tables/${selectedTable.id}/description`, {
        method: 'PUT',
        body: JSON.stringify({ description: tableDescText }),
      });
      setSelectedTable({ ...selectedTable, description: tableDescText });
      setEditingTableDesc(false);
      // Refresh tables list to show description if needed
      const data = await request(`/catalog/schemas/${selectedSchemaId}/tables`);
      setTables(data);
    } catch (e: any) {
      alert(e.message || 'Failed to update table description');
    }
  };

  const handleSaveColumn = async (colId: string) => {
    try {
      const col = columns.find(c => c.id === colId);
      const payload = {
        ...col,
        name: colNameText,
        dataType: colDataTypeText,
        description: colDescText
      };
      
      const token = localStorage.getItem('mdms_token');
      const apiBase = `${window.location.protocol}//${window.location.hostname}:8080/api`;
      const response = await fetch(`${apiBase}/catalog/columns/${colId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update column metadata');
      }

      setColumns(columns.map(c => c.id === colId ? { ...c, name: colNameText, dataType: colDataTypeText, description: colDescText } : c));
      setEditingColId(null);
    } catch (e: any) {
      alert(e.message || 'Failed to update column metadata');
    }
  };

  const handleSelectTermForMapping = (termId: string) => {
    setSelectedTermId(termId);
    if (!termId) return;
    const term = standardTerms.find(t => t.id === termId);
    if (term) {
      setColNameText(term.physicalName);
      setColDescText(term.logicalName);
      
      if (term.wordIds) {
        request('/standardization/terms/assemble', {
          method: 'POST',
          body: term.wordIds.split(',')
        }).then(preview => {
          if (preview && preview.dataType) {
            setColDataTypeText(preview.dataType);
          }
        }).catch(err => {
          console.warn('Failed to resolve data type for standard term', err);
        });
      }
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await request(`/catalog/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data);
    } catch (e) {
      console.error('Search failed', e);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1>{t('dataCatalog')}</h1>
          <p>{locale === 'ko' ? '데이터베이스 스키마 디렉터리를 탐색하고, 테이블 간의 연계 관계 및 컬럼 정의 사전을 검사/편집합니다.' : 'Explore schema catalog directories, inspect lineage mapping, and manage definitions.'}</p>
        </div>
        
        {/* Simple Connection Selector */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{locale === 'ko' ? '활성 데이터베이스 연결:' : 'Active Connection:'}</span>
          <select
            className="form-control"
            value={selectedDsId}
            onChange={(e) => setSelectedDsId(e.target.value)}
            style={{ width: 'auto', minWidth: '200px' }}
          >
            {dataSources.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '640px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value) setSearchResults([]);
            }}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <button type="submit" className="btn btn-secondary">{locale === 'ko' ? '검색' : 'Search'}</button>
      </form>

      {/* Search results banner */}
      {searchResults.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-accent)' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {locale === 'ko' ? '검색 결과' : 'Search Results'} ({searchResults.length})
            <button onClick={() => { setSearchResults([]); setSearchQuery(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {searchResults.map(t => (
              <div
                key={t.id}
                onClick={async () => {
                  const parentSchemaId = t.schemaId;
                  setSelectedSchemaId(parentSchemaId);
                  handleSelectTable(t);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all var(--transition-fast)'
                }}
                className="search-item"
              >
                <Table size={16} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{locale === 'ko' ? '선택하여 상세 보기' : 'Click to view details'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {schemas.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>{locale === 'ko' ? '수집된 메타데이터 카탈로그가 없습니다. 데이터 소스 연결 등록 후 수집(Ingest)을 실행해 주세요.' : 'No catalog metadata found. Register a connection profile and trigger metadata ingestion.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          
          {/* Side Tree Navigation Panel */}
          <div className="glass-card" style={{ width: '280px', flexShrink: 0, padding: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, padding: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Folder size={16} style={{ color: 'var(--color-accent)' }} /> {locale === 'ko' ? '스키마 및 테이블 구조' : 'Schemas & Tables'}
            </h2>
            
            {/* Schema Selector list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {schemas.map(s => (
                <div key={s.id}>
                  <div
                    onClick={() => setSelectedSchemaId(s.id)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: selectedSchemaId === s.id ? 700 : 500,
                      color: selectedSchemaId === s.id ? 'var(--color-accent)' : 'var(--text-primary)',
                      backgroundColor: selectedSchemaId === s.id ? 'var(--bg-tertiary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.9rem'
                    }}
                  >
                    <Folder size={14} /> {s.name}
                  </div>

                  {/* Table nested list */}
                  {selectedSchemaId === s.id && (
                    <div style={{ paddingLeft: '1.25rem', borderLeft: '1px solid var(--border-color)', marginTop: '0.25rem', marginLeft: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {tables.map(t => (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTable(t)}
                          style={{
                            padding: '0.4rem 0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: selectedTable?.id === t.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: selectedTable?.id === t.id ? 600 : 400,
                            backgroundColor: selectedTable?.id === t.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <Table size={12} /> {t.name}
                        </div>
                      ))}
                      {tables.length === 0 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.25rem' }}>{locale === 'ko' ? '스캔된 테이블 없음' : 'No tables parsed'}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Inspection View Area */}
          <div style={{ flex: 1 }}>
            {selectedTable ? (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Table Header Section */}
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Table size={24} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                      {schemas.find(s => s.id === selectedSchemaId)?.name || 'schema'}.
                    </span>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{selectedTable.name}</h2>
                    <span className="badge badge-info" style={{ marginLeft: 'auto' }}>
                      {columns.length} {locale === 'ko' ? '개 컬럼 정의됨' : 'columns'}
                    </span>
                  </div>

                  {/* Business Description Editor */}
                  <div style={{ marginTop: '0.75rem' }}>
                    <span className="form-label" style={{ fontSize: '0.75rem' }}>{locale === 'ko' ? '테이블 설명 및 비즈니스 명세' : 'Business Description / Documentation'}</span>
                    {editingTableDesc ? (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={tableDescText}
                          onChange={(e) => setTableDescText(e.target.value)}
                          placeholder={locale === 'ko' ? '테이블 업무 상세 정보를 기술하세요' : 'Provide table business definition'}
                        />
                        <button onClick={handleSaveTableDesc} className="btn btn-accent" style={{ padding: '0.5rem' }}><Check size={16} /></button>
                        <button onClick={() => setEditingTableDesc(false)} className="btn btn-secondary" style={{ padding: '0.5rem' }}><X size={16} /></button>
                      </div>
                    ) : (
                      <div
                        onClick={() => { setTableDescText(selectedTable.description || ''); setEditingTableDesc(true); }}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: selectedTable.description ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}
                      >
                        <span style={{ flex: 1 }}>{selectedTable.description || (locale === 'ko' ? '테이블 한글 정의 또는 업무적 의미를 추가하세요...' : 'Add table business details...')}</span>
                        <Edit2 size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabs Selection Bar */}
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <button
                    onClick={() => setActiveTab('columns')}
                    className="btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'columns' ? '2px solid var(--color-primary)' : 'none',
                      color: activeTab === 'columns' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      borderRadius: 0,
                      padding: '0.5rem 1rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {locale === 'ko' ? '컬럼 상세 정의' : 'Technical Columns'}
                  </button>
                  <button
                    onClick={() => setActiveTab('lineage')}
                    className="btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'lineage' ? '2px solid var(--color-primary)' : 'none',
                      color: activeTab === 'lineage' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      borderRadius: 0,
                      padding: '0.5rem 1rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t('dataLineage')}
                  </button>
                </div>

                {/* Columns Definition Detail Grid */}
                {activeTab === 'columns' && (
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileCode2 size={18} style={{ color: 'var(--color-accent)' }} /> {locale === 'ko' ? '기술 컬럼 속성 명세' : 'Technical Column Definitions'}
                    </h3>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>{locale === 'ko' ? '식별 키' : 'Keys'}</th>
                            <th>{t('colName')}</th>
                            <th>{t('colType')}</th>
                            <th>{t('colNull')}</th>
                            <th>{t('colRef')}</th>
                            <th>{t('colDesc')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columns.map(c => (
                            <tr key={c.id}>
                              <td style={{ textAlign: 'center' }}>
                                 {c.primaryKey && (
                                   <span title={locale === 'ko' ? '기본키 (PK)' : 'Primary Key'}><Key size={14} style={{ color: 'hsl(38, 92%, 50%)' }} /></span>
                                 )}
                                 {c.foreignKey && (
                                   <span title={locale === 'ko' ? '외래키 (FK)' : 'Foreign Key Reference'}><Link2 size={14} style={{ color: 'var(--color-accent)' }} /></span>
                                 )}
                                 {!c.primaryKey && !c.foreignKey && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                              </td>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {editingColId === c.id ? (
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={colNameText}
                                    onChange={(e) => setColNameText(e.target.value.toUpperCase())}
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '100%' }}
                                  />
                                ) : c.name}
                              </td>
                              <td>
                                {editingColId === c.id ? (
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={colDataTypeText}
                                    onChange={(e) => setColDataTypeText(e.target.value)}
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', fontFamily: 'monospace', width: '100%' }}
                                  />
                                ) : (
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{c.dataType}</span>
                                )}
                              </td>
                              <td>
                                <span style={{ fontSize: '0.8rem', color: c.nullable ? 'var(--text-muted)' : 'var(--color-danger)' }}>
                                  {c.nullable ? 'NULLABLE' : 'NOT NULL'}
                                </span>
                              </td>
                              <td>
                                {c.foreignKey ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--color-accent)' }}>
                                    <Link2 size={12} />
                                    <span>{c.referencedTable}.{c.referencedColumn}</span>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                                )}
                              </td>
                              <td>
                                {editingColId === c.id ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <div style={{ display: 'flex', gap: '0.25rem', width: '100%' }}>
                                      <input
                                        type="text"
                                        className="form-control"
                                        value={colDescText}
                                        onChange={(e) => setColDescText(e.target.value)}
                                        placeholder={locale === 'ko' ? '컬럼 사전 정의를 기술하세요' : 'Column definition'}
                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', flex: 1 }}
                                      />
                                      <button onClick={() => handleSaveColumn(c.id)} className="btn btn-accent" style={{ padding: '0.4rem' }}><Check size={14} /></button>
                                      <button onClick={() => setEditingColId(null)} className="btn btn-secondary" style={{ padding: '0.4rem' }}><X size={14} /></button>
                                    </div>
                                    <select
                                      value={selectedTermId}
                                      onChange={(e) => handleSelectTermForMapping(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', width: '100%', maxWidth: '280px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                                    >
                                      <option value="">{locale === 'ko' ? '🔍 표준용어 매핑 (자동 완성)' : '🔍 Map Standard Term (Auto-fill)'}</option>
                                      {standardTerms.map(term => (
                                        <option key={term.id} value={term.id}>{term.logicalName} ({term.physicalName})</option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => {
                                      setColNameText(c.name || '');
                                      setColDataTypeText(c.dataType || '');
                                      setColDescText(c.description || '');
                                      setSelectedTermId('');
                                      setEditingColId(c.id);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      cursor: 'pointer',
                                      fontSize: '0.9rem',
                                      color: c.description ? 'var(--text-primary)' : 'var(--text-muted)'
                                    }}
                                  >
                                    <span style={{ flex: 1 }}>{c.description || t('addDetails')}</span>
                                    <Edit2 size={12} style={{ opacity: 0.5 }} />
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Visual Lineage Graph View */}
                {activeTab === 'lineage' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Link2 size={18} style={{ color: 'var(--color-accent)' }} /> {locale === 'ko' ? '데이터 연계 및 계보 그래프' : 'Data Lineage & Relations'}
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 1.2fr 80px 1fr',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '2rem 1rem',
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      overflowX: 'auto'
                    }}>
                      
                      {/* Left: Upstream Parents */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.5rem' }}>
                          {t('upstream')}
                        </div>
                        {lineage.upstream.length === 0 ? (
                          <div style={{
                            padding: '1rem',
                            textAlign: 'center',
                            borderRadius: '8px',
                            border: '1px dashed var(--border-color)',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem'
                          }}>
                            {t('noParents')}
                          </div>
                        ) : (
                          Array.from(new Set(lineage.upstream.map(u => u.SOURCE_TABLE || u.source_table))).map((pName: any) => {
                            const cols = lineage.upstream.filter(u => (u.SOURCE_TABLE || u.source_table) === pName);
                            return (
                              <div key={pName} style={{
                                padding: '1rem',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                boxShadow: 'var(--shadow-sm)'
                              }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-primary)', display: 'flex', gap: '0.25rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <Table size={12} /> {pName}
                                </div>
                                {cols.map((c, idx) => (
                                  <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                                    <span>{c.SOURCE_COLUMN || c.source_column}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>➔ {c.TARGET_COLUMN || c.target_column}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Connection Arrows 1 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {lineage.upstream.length > 0 && (
                          <div style={{
                            width: '40px',
                            height: '2px',
                            background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
                            position: 'relative'
                          }}>
                            <div style={{
                              position: 'absolute',
                              right: '-2px',
                              top: '-4px',
                              width: '0',
                              height: '0',
                              borderTop: '5px solid transparent',
                              borderBottom: '5px solid transparent',
                              borderLeft: '7px solid var(--color-accent)'
                            }} />
                          </div>
                        )}
                      </div>

                      {/* Center: Selected Table */}
                      <div style={{
                        padding: '1.5rem',
                        borderRadius: '12px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '2px solid var(--color-accent)',
                        boxShadow: '0 0 15px hsla(186, 100%, 45%, 0.15)',
                        textAlign: 'center',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '-10px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'var(--color-accent)',
                          color: 'var(--bg-primary)',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          textTransform: 'uppercase'
                        }}>
                          {locale === 'ko' ? '조회 대상' : 'Selected'}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                          <Table size={16} style={{ color: 'var(--color-accent)' }} />
                          {selectedTable.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {columns.length} {locale === 'ko' ? '개 컬럼 카탈로그 완료' : 'Fields Cataloged'}
                        </div>
                      </div>

                      {/* Connection Arrows 2 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {lineage.downstream.length > 0 && (
                          <div style={{
                            width: '40px',
                            height: '2px',
                            background: 'linear-gradient(90deg, var(--color-accent), var(--color-primary))',
                            position: 'relative'
                          }}>
                            <div style={{
                              position: 'absolute',
                              right: '-2px',
                              top: '-4px',
                              width: '0',
                              height: '0',
                              borderTop: '5px solid transparent',
                              borderBottom: '5px solid transparent',
                              borderLeft: '7px solid var(--color-primary)'
                            }} />
                          </div>
                        )}
                      </div>

                      {/* Right: Downstream Children */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.5rem' }}>
                          {t('downstream')}
                        </div>
                        {lineage.downstream.length === 0 ? (
                          <div style={{
                            padding: '1rem',
                            textAlign: 'center',
                            borderRadius: '8px',
                            border: '1px dashed var(--border-color)',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem'
                          }}>
                            {t('noChildren')}
                          </div>
                        ) : (
                          Array.from(new Set(lineage.downstream.map(d => d.TARGET_TABLE || d.target_table))).map((cName: any) => {
                            const cols = lineage.downstream.filter(d => (d.TARGET_TABLE || d.target_table) === cName);
                            return (
                              <div key={cName} style={{
                                padding: '1rem',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                boxShadow: 'var(--shadow-sm)'
                              }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-primary)', display: 'flex', gap: '0.25rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <Table size={12} /> {cName}
                                </div>
                                {cols.map((c, idx) => (
                                  <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                                    <span>{c.SOURCE_COLUMN || c.source_column}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>➔ {c.TARGET_COLUMN || c.target_column}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Info size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>{t('selectDbToInspect')}</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
