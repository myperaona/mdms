import React, { useState, useEffect } from 'react';
import { request } from '../services/api';
import { Plus, Trash2, Play, CheckCircle2, XCircle, AlertTriangle, Database, UploadCloud } from 'lucide-react';
import { useTranslation } from '../context/i18n';

export default function DataSourceManagement() {
  const { t, locale } = useTranslation();
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [dbType, setDbType] = useState('POSTGRESQL');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(5432);
  const [databaseName, setDatabaseName] = useState('mdms_db');
  const [username, setUsername] = useState('postgres');
  const [password, setPassword] = useState('');

  // Driver Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const fetchDataSources = async () => {
    try {
      const data = await request('/datasources');
      setDataSources(data);
    } catch (e) {
      console.error('Failed to load connections', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const list = await request('/drivers');
      setDrivers(list);
    } catch (e) {
      console.error('Failed to load JDBC drivers', e);
    }
  };

  useEffect(() => {
    fetchDataSources();
    fetchDrivers();
  }, []);

  const handleDbTypeChange = (type: string) => {
    setDbType(type);
    let defaultPort = 5432;
    let defaultDb = 'mdms_db';
    let defaultUser = 'postgres';

    switch (type) {
      case 'POSTGRESQL':
        defaultPort = 5432;
        defaultDb = 'mdms_db';
        defaultUser = 'postgres';
        break;
      case 'MYSQL':
        defaultPort = 3306;
        defaultDb = 'mdms_db';
        defaultUser = 'root';
        break;
      case 'ORACLE':
        defaultPort = 1521;
        defaultDb = 'ORCL';
        defaultUser = 'system';
        break;
      case 'MSSQL':
        defaultPort = 1433;
        defaultDb = 'master';
        defaultUser = 'sa';
        break;
      case 'TIBERO':
        defaultPort = 8629;
        defaultDb = 'tibero';
        defaultUser = 'sys';
        break;
    }
    setPort(defaultPort);
    setDatabaseName(defaultDb);
    setUsername(defaultUser);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await request('/datasources', {
        method: 'POST',
        body: JSON.stringify({
          name,
          dbType,
          host,
          port: Number(port),
          databaseName,
          username,
          passwordEncrypted: password,
        }),
      });

      // Reset form
      setName('');
      setPassword('');
      setShowAddForm(false);
      fetchDataSources();
    } catch (e: any) {
      alert(e.message || t('connectionFail'));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmMsg = locale === 'ko' 
      ? '이 연결 프로필을 삭제하시겠습니까? 연결된 모든 카탈로그 정보도 함께 삭제됩니다.' 
      : 'Are you sure you want to delete this connection profile? This will remove all associated metadata logs.';
    if (!confirm(confirmMsg)) return;

    try {
      await request(`/datasources/${id}`, { method: 'DELETE' });
      // Immediately remove deleted item from local state so UI updates instantly
      setDataSources(prev => prev.filter(ds => ds.id !== id));
      await fetchDataSources();
    } catch (e: any) {
      alert(e.message || 'Failed to delete connection profile');
    }
  };

  const handleTest = async (id: string) => {
    setTestResult(null);
    try {
      const res = await request(`/datasources/${id}/test`, { method: 'POST' });
      setTestResult({ id, success: res.success, msg: res.message });
      fetchDataSources();
    } catch (e: any) {
      setTestResult({ id, success: false, msg: e.message || t('connectionFail') });
    }
  };

  const handleIngest = async (id: string) => {
    try {
      const res = await request(`/catalog/datasources/${id}/ingest`, { method: 'POST' });
      alert(res.message);
    } catch (e: any) {
      alert(e.message || 'Failed to trigger ingestion job');
    }
  };

  const handleClearDrivers = async () => {
    const confirmMsg = locale === 'ko' 
      ? '등록된 모든 JDBC 드라이버 파일을 서버에서 삭제하고 초기화하시겠습니까?' 
      : 'Are you sure you want to clear and delete all registered JDBC driver jars from the server?';
    if (!confirm(confirmMsg)) return;

    try {
      await request('/drivers', { method: 'DELETE' });
      setUploadSuccess(locale === 'ko' ? '드라이버 목록이 초기화되었습니다.' : 'All driver jars cleared.');
      fetchDrivers();
    } catch (e: any) {
      setUploadError(e.message || 'Failed to clear driver jars');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const token = localStorage.getItem('mdms_token');
      const apiBase = `${window.location.protocol}//${window.location.hostname}:8080/api`;
      const response = await fetch(`${apiBase}/drivers/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!response.ok) {
        let errMsg = 'Failed to upload driver jar';
        try {
          const errRes = await response.json();
          errMsg = errRes.error || errMsg;
        } catch (_) {
          errMsg = locale === 'ko' 
            ? `서버 업로드 실패 (상태 코드: ${response.status})` 
            : `Server upload failed (Status: ${response.status})`;
        }
        throw new Error(errMsg);
      }

      const res = await response.json();

      setUploadSuccess(locale === 'ko' ? `${res.fileName} 드라이버가 등록되었습니다!` : `Driver ${res.fileName} registered successfully!`);
      fetchDrivers();
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1>{t('dataSources')}</h1>
          <p>{locale === 'ko' ? '메타데이터 카탈로그를 수집할 대상 데이터베이스 연결을 설정하고 검증합니다.' : 'Register target databases to parse and ingest schema catalogs.'}</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <Plus size={18} /> {showAddForm ? t('cancel') : t('addDb')}
        </button>
      </div>

      {showAddForm && (
        <div className="glass-card" style={{ marginBottom: '2.5rem', maxWidth: '640px', border: '1px solid var(--color-primary)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Database size={20} style={{ color: 'var(--color-primary)' }} /> {locale === 'ko' ? '신규 데이터베이스 연결 설정' : 'Register Target Connection'}
          </h2>
          <form onSubmit={handleCreate}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '연결 프로필명' : 'Connection Profile Name'}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dev PostgreSQL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('dbType')}</label>
                <select
                  className="form-control"
                  value={dbType}
                  onChange={(e) => handleDbTypeChange(e.target.value)}
                  required
                >
                  <option value="POSTGRESQL">PostgreSQL (Built-in)</option>
                  <option value="MYSQL">MySQL (Built-in)</option>
                  <option value="ORACLE">Oracle (Built-in)</option>
                  <option value="MSSQL">Microsoft SQL Server (Built-in)</option>
                  <option value="TIBERO">
                    {drivers.length > 0
                      ? `Tibero (Build-in - ${drivers.find(d => d.toLowerCase().includes('tibero')) || drivers[0]})`
                      : 'Tibero (Requires external Jar upload)'}
                  </option>
                </select>
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '호스트 IP / 도메인' : 'Host IP / Domain'}</label>
                <input
                  type="text"
                  className="form-control"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '포트' : 'Port'}</label>
                <input
                  type="number"
                  className="form-control"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '데이터베이스명 / SID' : 'Database Name / SID'}</label>
                <input
                  type="text"
                  className="form-control"
                  value={databaseName}
                  onChange={(e) => setDatabaseName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '계정 ID' : 'DB User Username'}</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ko' ? '계정 비밀번호' : 'DB User Password'}</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              {locale === 'ko' ? '접속 프로필 저장' : 'Save Connection Profile'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="badge badge-info" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            {locale === 'ko' ? '연결 정보를 불러오는 중...' : 'Loading database credentials and statuses...'}
          </div>
        </div>
      ) : dataSources.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{locale === 'ko' ? '등록된 데이터베이스 연결이 없습니다. 프로필을 추가해 주세요.' : 'No connections configured. Start by creating a connection profile.'}</p>
          <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
            {t('addDb')}
          </button>
        </div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: '3rem' }}>
          <table>
            <thead>
              <tr>
                <th>{locale === 'ko' ? '프로필명' : 'Profile Name'}</th>
                <th>{t('dbType')}</th>
                <th>{locale === 'ko' ? '엔드포인트 주소' : 'Endpoint'}</th>
                <th>{locale === 'ko' ? '데이터베이스명' : 'Database'}</th>
                <th>{locale === 'ko' ? '연결 상태' : 'Status'}</th>
                <th style={{ textAlign: 'center' }}>{locale === 'ko' ? '상태 진단 및 동기화' : 'Diagnostics'}</th>
                <th style={{ textAlign: 'right' }}>{locale === 'ko' ? '관리' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {dataSources.map((ds) => (
                <tr key={ds.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ds.name}</td>
                  <td>
                    <span className="badge badge-info">{ds.dbType}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {ds.host}:{ds.port}
                  </td>
                  <td>{ds.databaseName}</td>
                  <td>
                    {ds.status === 'CONNECTED' ? (
                      <span className="badge badge-success" style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                        <CheckCircle2 size={12} /> {t('connectionSuccess')}
                      </span>
                    ) : ds.status === 'ERROR' ? (
                      <span className="badge badge-danger" style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                        <XCircle size={12} /> {t('connectionFail')}
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                        <AlertTriangle size={12} /> {locale === 'ko' ? '대기' : 'Idle'}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleTest(ds.id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        {t('testConn')}
                      </button>
                      <button
                        onClick={() => handleIngest(ds.id)}
                        className="btn btn-accent"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                      >
                        <Play size={12} /> {t('ingest')}
                      </button>
                    </div>
                    {testResult && testResult.id === ds.id && (
                      <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        color: testResult.success ? 'var(--color-success)' : 'var(--color-danger)',
                        fontWeight: 600
                      }}>
                        {testResult.msg}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(ds.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem', borderRadius: '6px', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Custom JDBC Drivers Upload Panel */}
      <div className="glass-card" style={{ maxWidth: '640px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UploadCloud size={20} style={{ color: 'var(--color-accent)' }} /> {t('jdbcDrivers')}
        </h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {locale === 'ko' 
            ? '티베로(Tibero) 등 내장되지 않은 DBMS의 연결을 위해 필요한 JDBC 드라이버 .jar 파일을 동적으로 업로드하여 추가 등록합니다.'
            : 'Dynamically register and load custom database JDBC driver jars (e.g. Tibero tbjdbc.jar) to enable target schema connections.'}
        </p>

        {uploadError && (
          <div className="badge badge-danger" style={{ padding: '0.5rem 1rem', marginBottom: '1rem', display: 'block' }}>
            {uploadError}
          </div>
        )}

        {uploadSuccess && (
          <div className="badge badge-success" style={{ padding: '0.5rem 1rem', marginBottom: '1rem', display: 'block' }}>
            {uploadSuccess}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
          <button
            onClick={() => document.getElementById('driverJarFileInput')?.click()}
            className="btn btn-secondary"
            disabled={uploading}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <UploadCloud size={16} /> {uploading ? (locale === 'ko' ? '업로드 중...' : 'Uploading...') : t('uploadJar')}
          </button>
          <input
            type="file"
            id="driverJarFileInput"
            accept=".jar"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{t('driverList')}</h3>
            {drivers.length > 0 && (
              <button
                type="button"
                onClick={handleClearDrivers}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }}
              >
                {locale === 'ko' ? '목록 초기화' : 'Clear List'}
              </button>
            )}
          </div>
          {drivers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('noDrivers')}</p>
          ) : (
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
              {drivers.map((drv, idx) => (
                <li key={idx} style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {drv} <span style={{ color: 'var(--color-success)', fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: 700 }}>[LOADED / ACTIVE]</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
