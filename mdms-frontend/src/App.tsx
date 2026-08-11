import { useState, useEffect } from 'react';
import { parseJwt } from './services/api';
import Login from './pages/Login';
import MfaVerification from './pages/MfaVerification';
import Dashboard from './pages/Dashboard';
import DataSourceManagement from './pages/DataSourceManagement';
import DataCatalog from './pages/DataCatalog';
import StandardizationManagement from './pages/StandardizationManagement';
import DatabaseDesignManagement from './pages/DatabaseDesignManagement';
import { Database, LayoutDashboard, Settings2, FolderTree, LogOut, User, BookOpen, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from './context/i18n';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('mdms_token'));
  const [username, setUsername] = useState('');
  const [tenantName, setTenantName] = useState('System');
  const [page, setPage] = useState<'login' | 'mfa' | 'dashboard' | 'datasources' | 'catalog' | 'standardization' | 'dbdesign'>('login');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const { locale, setLocale, t } = useTranslation();

  useEffect(() => {
    if (token) {
      const claims = parseJwt(token);
      if (claims) {
        setUsername(claims.sub || '');
        setTenantName(claims.tenantName || 'System');
        
        // Route according to MFA status in JWT
        const mfaEnabled = claims.mfaEnabled;
        const mfaVerified = claims.mfaVerified;
        
        if (mfaEnabled && !mfaVerified) {
          setPage('mfa');
        } else {
          setPage('dashboard');
        }
      } else {
        // Invalid token
        handleLogout();
      }
    } else {
      setPage('login');
    }
  }, [token]);

  const handleLoginSuccess = (userToken: string, user: string, tName: string, mfaRequired: boolean) => {
    localStorage.setItem('mdms_token', userToken);
    setUsername(user);
    if (mfaRequired) {
      setToken(userToken); // triggers useEffect to route to 'mfa'
    } else {
      setTenantName(tName);
      setToken(userToken); // triggers useEffect to route to 'dashboard'
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mdms_token');
    setToken(null);
    setUsername('');
    setTenantName('');
    setPage('login');
  };

  // Render Login and MFA flows outside the main dashboard shell
  if (page === 'login') {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (page === 'mfa') {
    return (
      <MfaVerification
        username={username}
        onVerificationSuccess={(verifiedToken, tName) => handleLoginSuccess(verifiedToken, username, tName, false)}
        onCancel={handleLogout}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Premium Dashboard Slide Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div style={{
          padding: isSidebarCollapsed ? '1.25rem 0.5rem' : '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(180deg, var(--bg-tertiary) 0%, transparent 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              flexShrink: 0
            }}>
              <Database size={18} style={{ color: 'var(--bg-primary)' }} />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 0, whiteSpace: 'nowrap' }}>MDMS</h2>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SaaS Console
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.35rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Sidebar Menu Options */}
        <nav style={{ flex: 1, padding: isSidebarCollapsed ? '1rem 0.5rem' : '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard size={18} /> },
            { id: 'datasources', label: t('dataSources'), icon: <Settings2 size={18} /> },
            { id: 'catalog', label: t('dataCatalog'), icon: <FolderTree size={18} /> },
            { id: 'standardization', label: locale === 'ko' ? '데이터 표준화' : 'Data Standardization', icon: <BookOpen size={18} /> },
            { id: 'dbdesign', label: locale === 'ko' ? '데이터베이스 설계' : 'Database Design', icon: <Layers size={18} /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id as any)}
              title={isSidebarCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: page === item.id ? 600 : 500,
                backgroundColor: page === item.id ? 'var(--bg-tertiary)' : 'transparent',
                color: page === item.id ? 'var(--color-accent)' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
            >
              {item.icon}
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Language Selection Footer */}
        {!isSidebarCollapsed && (
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            backgroundColor: 'rgba(0,0,0,0.05)'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>언어 / Lang</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'ko' | 'en')}
              className="form-control"
              style={{ width: 'auto', padding: '0.15rem 0.4rem', fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
            >
              <option value="ko">한국어 (KO)</option>
              <option value="en">English (EN)</option>
            </select>
          </div>
        )}

        {/* User Context & Signout Footer */}
        <div style={{
          padding: isSidebarCollapsed ? '0.75rem 0.5rem' : '1rem',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          {!isSidebarCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                flexShrink: 0
              }}>
                <User size={16} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{username}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{locale === 'ko' ? `테넌트: ${tenantName}` : `Tenant: ${tenantName}`}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }} title={`${username} (${tenantName})`}>
              <User size={18} style={{ color: 'var(--text-secondary)' }} />
            </div>
          )}
          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? t('logout') : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
              gap: '0.5rem',
              width: '100%',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'var(--transition-fast)'
            }}
            className="btn-logout"
          >
            <LogOut size={14} /> {!isSidebarCollapsed && <span>{t('logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Dashboard Application View Container */}
      <main className="main-content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'datasources' && <DataSourceManagement />}
        {page === 'catalog' && <DataCatalog />}
        {page === 'standardization' && <StandardizationManagement />}
        {page === 'dbdesign' && <DatabaseDesignManagement />}
      </main>
    </div>
  );
}
