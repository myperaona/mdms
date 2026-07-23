import { useState, useEffect } from 'react';
import { parseJwt } from './services/api';
import Login from './pages/Login';
import MfaVerification from './pages/MfaVerification';
import Dashboard from './pages/Dashboard';
import DataSourceManagement from './pages/DataSourceManagement';
import DataCatalog from './pages/DataCatalog';
import StandardizationManagement from './pages/StandardizationManagement';
import { Database, LayoutDashboard, Settings2, FolderTree, LogOut, User, BookOpen } from 'lucide-react';
import { useTranslation } from './context/i18n';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('mdms_token'));
  const [username, setUsername] = useState('');
  const [tenantName, setTenantName] = useState('System');
  const [page, setPage] = useState<'login' | 'mfa' | 'dashboard' | 'datasources' | 'catalog' | 'standardization'>('login');
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
      {/* Premium Dashboard Sidebar */}
      <aside className="sidebar">
        <div style={{
          padding: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(180deg, var(--bg-tertiary) 0%, transparent 100%)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}>
            <Database size={20} style={{ color: 'var(--bg-primary)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 0 }}>MDMS</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SaaS Console
            </span>
          </div>
        </div>

        {/* Sidebar Menu Options */}
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setPage('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: page === 'dashboard' ? 600 : 500,
              backgroundColor: page === 'dashboard' ? 'var(--bg-tertiary)' : 'transparent',
              color: page === 'dashboard' ? 'var(--color-accent)' : 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
              textAlign: 'left'
            }}
          >
            <LayoutDashboard size={18} /> {t('dashboard')}
          </button>

          <button
            onClick={() => setPage('datasources')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: page === 'datasources' ? 600 : 500,
              backgroundColor: page === 'datasources' ? 'var(--bg-tertiary)' : 'transparent',
              color: page === 'datasources' ? 'var(--color-accent)' : 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
              textAlign: 'left'
            }}
          >
            <Settings2 size={18} /> {t('dataSources')}
          </button>

          <button
            onClick={() => setPage('catalog')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: page === 'catalog' ? 600 : 500,
              backgroundColor: page === 'catalog' ? 'var(--bg-tertiary)' : 'transparent',
              color: page === 'catalog' ? 'var(--color-accent)' : 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
              textAlign: 'left'
            }}
          >
            <FolderTree size={18} /> {t('dataCatalog')}
          </button>

          <button
            onClick={() => setPage('standardization')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: page === 'standardization' ? 600 : 500,
              backgroundColor: page === 'standardization' ? 'var(--bg-tertiary)' : 'transparent',
              color: page === 'standardization' ? 'var(--color-accent)' : 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
              textAlign: 'left'
            }}
          >
            <BookOpen size={18} /> {locale === 'ko' ? '데이터 표준화' : 'Data Standardization'}
          </button>
        </nav>

        {/* Language Selection Footer */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          backgroundColor: 'rgba(0,0,0,0.05)'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Language / 언어</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'ko' | 'en')}
            className="form-control"
            style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
          >
            <option value="ko">한국어 (KO)</option>
            <option value="en">English (EN)</option>
          </select>
        </div>

        {/* User Context & Signout Footer */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}>
              <User size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{username}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{locale === 'ko' ? `테넌트: ${tenantName}` : `Tenant: ${tenantName}`}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'var(--transition-fast)'
            }}
            className="btn-logout"
          >
            <LogOut size={14} /> {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main Dashboard Application View Container */}
      <main className="main-content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'datasources' && <DataSourceManagement />}
        {page === 'catalog' && <DataCatalog />}
        {page === 'standardization' && <StandardizationManagement />}
      </main>
    </div>
  );
}
