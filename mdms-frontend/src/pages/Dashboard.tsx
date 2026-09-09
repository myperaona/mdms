import { useState, useEffect } from 'react';
import { request, parseJwt } from '../services/api';
import { Database, Folder, Table, FileText, CheckCircle2, XCircle, RefreshCw, KeyRound, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../context/i18n';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ sources: 0, schemas: 0, tables: 0, columns: 0 });
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [mfaSecret, setMfaSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t, locale } = useTranslation();

  const token = localStorage.getItem('mdms_token');
  const claims = token ? parseJwt(token) : null;
  const isMfaRegistered = !!(claims?.mfaEnabled || mfaSuccess);

  const fetchDashboardData = async () => {
    try {
      const sourcesList = await request('/datasources');
      setDataSources(sourcesList);

      let totalSchemas = 0;
      let totalTables = 0;
      let totalColumns = 0;
      const recentJobs: any[] = [];

      for (const ds of sourcesList) {
        try {
          const schemas = await request(`/catalog/datasources/${ds.id}/schemas`);
          totalSchemas += schemas.length;

          for (const s of schemas) {
            const tables = await request(`/catalog/schemas/${s.id}/tables`);
            totalTables += tables.length;

            for (const t of tables) {
              const columns = await request(`/catalog/tables/${t.id}/columns`);
              totalColumns += columns.length;
            }
          }

          const dsJobs = await request(`/catalog/datasources/${ds.id}/ingestion-jobs`);
          recentJobs.push(...dsJobs.map((j: any) => ({ ...j, dataSourceName: ds.name })));
        } catch (e) {
          console.error('Failed to load metadata for source', ds.id, e);
        }
      }

      setMetrics({
        sources: sourcesList.length,
        schemas: totalSchemas,
        tables: totalTables,
        columns: totalColumns,
      });

      // Sort jobs by start date descending
      recentJobs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      setJobs(recentJobs.slice(0, 5));
    } catch (e) {
      console.error('Failed to load dashboard statistics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const [mfaPassword, setMfaPassword] = useState('');
  const [showMfaPassModal, setShowMfaPassModal] = useState(false);
  const [mfaRecoveryCode, setMfaRecoveryCode] = useState('');

  const handleSetupMfaWithPassword = async () => {
    if (!mfaPassword) {
      alert(locale === 'ko' ? '현재 비밀번호를 입력해주세요.' : 'Please enter your current password.');
      return;
    }
    try {
      const res = await request('/auth/mfa/setup', {
        method: 'POST',
        body: JSON.stringify({ password: mfaPassword }),
      });
      setMfaSecret(res.secret);
      setQrUrl(`https://quickchart.io/qr?text=${encodeURIComponent(res.qrCodeUrl)}&size=200&dark=0a0f26`);
      setShowMfaPassModal(false);
      setMfaPassword('');
    } catch (e: any) {
      alert(e.message || 'MFA setup failed');
    }
  };

  const handleVerifyMfaConfirm = async (code: string) => {
    try {
      const res = await request('/auth/mfa/confirm', {
        method: 'POST',
        body: JSON.stringify({ secret: mfaSecret, code }),
      });
      if (res && res.recoveryCode) {
        setMfaRecoveryCode(res.recoveryCode);
      }
      setMfaSuccess(true);
      setMfaSecret('');
    } catch (e: any) {
      alert(e.message || 'MFA validation failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{t('dashboard')}</h1>
          <p>{locale === 'ko' ? '메타데이터 카탈로그 집계 및 시스템 진단 실시간 모니터링' : 'Real-time technical catalog aggregates and system diagnostics.'}</p>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', marginTop: '0.25rem' }}>
            {locale === 'ko' ? '최종 집계일시: 2026-09-07 16:00 (스냅샷 ID: SNAP-LIVE-01)' : 'Last Aggregate Snapshot: 2026-09-07 16:00 (Snapshot ID: SNAP-LIVE-01)'}
          </div>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <RefreshCw size={16} /> {locale === 'ko' ? '새로고침' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="badge badge-info" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            {locale === 'ko' ? '카탈로그 지표 조회중...' : 'Retrieving Catalog aggregates...'}
          </div>
        </div>
      ) : (
        <>
          {/* Dashboard Metric Summary Row */}
          <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: 'hsla(250, 89%, 65%, 0.15)', color: 'var(--color-primary)' }}>
                <Database size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{locale === 'ko' ? '연결된 DB 수' : 'Connections'}</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{metrics.sources}</h3>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: 'hsla(186, 100%, 45%, 0.15)', color: 'var(--color-accent)' }}>
                <Folder size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{locale === 'ko' ? '스키마 수' : 'Schemas'}</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{metrics.schemas}</h3>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)' }}>
                <Table size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{locale === 'ko' ? '테이블 수' : 'Tables'}</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{metrics.tables}</h3>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' }}>
                <FileText size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{locale === 'ko' ? '컬럼 수' : 'Columns'}</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{metrics.columns}</h3>
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '2.5rem' }}>
            {/* Connection Status Panel */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {locale === 'ko' ? '활성 데이터 소스 목록' : 'Active Data Sources'}
              </h2>
              {dataSources.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>{locale === 'ko' ? '설정된 연결이 없습니다. 데이터베이스를 먼저 등록해 주세요.' : 'No connections configured. Register a database to start cataloging.'}</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>{locale === 'ko' ? '연결 프로필명' : 'Connection'}</th>
                        <th>{locale === 'ko' ? '종류' : 'Type'}</th>
                        <th>{locale === 'ko' ? '상태' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataSources.map((ds) => (
                        <tr key={ds.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ds.name}</td>
                          <td><span className="badge badge-info">{ds.dbType}</span></td>
                          <td>
                            {ds.status === 'CONNECTED' ? (
                              <span className="badge badge-success" style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                                <CheckCircle2 size={12} /> {locale === 'ko' ? '연결 성공' : 'Connected'}
                              </span>
                            ) : ds.status === 'ERROR' ? (
                              <span className="badge badge-danger" style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                                <XCircle size={12} /> {locale === 'ko' ? '오류' : 'Error'}
                              </span>
                            ) : (
                              <span className="badge badge-warning" style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                                <AlertTriangle size={12} /> {locale === 'ko' ? '상태 미확인' : 'Unverified'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ingestion Console Status Panel */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>
                {t('recentActivity')}
              </h2>
              {jobs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>{locale === 'ko' ? '수집 기록이 존재하지 않습니다.' : 'No recent ingestion runs logged.'}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {jobs.map((job) => (
                    <div key={job.id} style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{job.dataSourceName}</span>
                        <span className={`badge ${
                          job.status === 'SUCCESS' ? 'badge-success' : job.status === 'RUNNING' ? 'badge-info' : 'badge-danger'
                        }`}>
                          {job.status === 'SUCCESS' ? (locale === 'ko' ? '수집 성공' : 'Success') :
                           job.status === 'RUNNING' ? (locale === 'ko' ? '수집 중' : 'Running') :
                           (locale === 'ko' ? '수집 실패' : 'Failed')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {locale === 'ko' ? '실행 일시: ' : 'Ran at: '}{new Date(job.startedAt).toLocaleString()}
                      </div>
                      {job.logMessage && (
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          color: job.status === 'SUCCESS' ? 'var(--color-success)' : 'var(--color-danger)',
                          wordBreak: 'break-all'
                        }}>
                          {job.logMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MFA Settings Panel */}
          {!isMfaRegistered && (
            <div className="glass-card" style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} style={{ color: 'var(--color-accent)' }} /> {t('mfaStatus')}
              </h2>
              <p style={{ marginBottom: '1.5rem' }}>
                {locale === 'ko' ? 'Google Authenticator 등을 이용하여 계정의 이중 인증(TOTP) 보안 수단을 활성화합니다.' : 'Configure second verification factor (TOTP) using tools like Google Authenticator.'}
              </p>

              {mfaSuccess && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="badge badge-success" style={{ padding: '0.5rem 1rem' }}>
                    {t('mfaEnabledMsg')}
                  </div>
                  {mfaRecoveryCode && (
                    <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-warning)' }}>1회용 복구 코드: {mfaRecoveryCode}</span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>안전한 곳에 기록해 두세요.</p>
                    </div>
                  )}
                </div>
              )}

              {!mfaSecret && !mfaSuccess && (
                <button onClick={() => setShowMfaPassModal(true)} className="btn btn-secondary">
                  {t('mfaSetupBtn')}
                </button>
              )}

              {/* Password Modal for MFA Setup */}
              {showMfaPassModal && (
                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <label htmlFor="mfaPasswordInput" className="form-label">{locale === 'ko' ? '현재 비밀번호 확인' : 'Confirm Password'}</label>
                  <input
                    id="mfaPasswordInput"
                    type="password"
                    className="form-control"
                    placeholder="비밀번호 입력"
                    value={mfaPassword}
                    onChange={(e) => setMfaPassword(e.target.value)}
                    style={{ marginBottom: '1rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleSetupMfaWithPassword} className="btn btn-accent">{locale === 'ko' ? '비밀키 발급' : 'Generate Key'}</button>
                    <button onClick={() => setShowMfaPassModal(false)} className="btn btn-secondary">{locale === 'ko' ? '취소' : 'Cancel'}</button>
                  </div>
                </div>
              )}

              {mfaSecret && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img src={qrUrl} alt="MFA QR Code" style={{ width: '160px', height: '160px' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Secret Key:</span>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: 'var(--color-accent)', fontWeight: 700, margin: '0.25rem 0' }}>
                        {mfaSecret}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {locale === 'ko' ? '위 QR 코드를 스캔하거나 비밀 키를 입력하여 인증을 완료하세요.' : 'Scan code or enter key to verify.'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="000000"
                        maxLength={6}
                        id="mfaVerifyInput"
                        style={{ maxWidth: '120px', textAlign: 'center', letterSpacing: '0.1em' }}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById('mfaVerifyInput') as HTMLInputElement;
                          if (input) handleVerifyMfaConfirm(input.value);
                        }}
                        className="btn btn-accent"
                      >
                        {locale === 'ko' ? '코드 확인' : 'Confirm Code'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
