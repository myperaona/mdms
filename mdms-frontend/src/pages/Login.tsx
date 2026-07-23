import React, { useState } from 'react';
import { request, parseJwt } from '../services/api';
import { Database, ShieldAlert, KeyRound, Sparkles, Building2, User, Mail, ArrowRight } from 'lucide-react';
import { useTranslation } from '../context/i18n';

interface LoginProps {
  onLoginSuccess: (token: string, username: string, tenantName: string, mfaRequired: boolean) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const { locale, setLocale, t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [tenantName, setTenantName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      localStorage.setItem('mdms_token', res.token);
      let tName = 'System';
      if (!res.mfaRequired) {
        const claims = parseJwt(res.token);
        tName = res.tenantName || (claims && claims.tenantName) || 'System';
      }

      onLoginSuccess(res.token, res.username, tName, !!res.mfaRequired);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await request('/auth/tenant/register', {
        method: 'POST',
        body: JSON.stringify({ tenantName, username, email, password }),
      });

      setSuccessMsg(locale === 'ko' ? '테넌트 등록에 성공했습니다! 로그인 해주세요.' : 'Tenant Registered Successfully! Please Login.');
      setIsRegister(false);
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      padding: '1.5rem',
      backgroundColor: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Floating Language Switcher */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10 }}>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as 'ko' | 'en')}
          className="form-control"
          style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
        >
          <option value="ko">한국어 (KO)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>

      {/* Decorative Blur Background Orbs */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, hsla(250, 89%, 65%, 0.12) 0%, transparent 70%)',
        top: '-10%',
        left: '-10%',
        zIndex: 1,
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, hsla(186, 100%, 45%, 0.1) 0%, transparent 70%)',
        bottom: '-10%',
        right: '-10%',
        zIndex: 1,
        borderRadius: '50%'
      }} />

      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '2.5rem',
        zIndex: 2,
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-light)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
            marginBottom: '1rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}>
            <Database size={28} style={{ color: 'var(--bg-primary)' }} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            MDMS
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('subtitle')}
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            <ShieldAlert size={20} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--color-success)',
            color: 'var(--color-success)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            <Sparkles size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={isRegister ? handleRegister : handleLogin}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={14} /> {t('tenantName')}
              </label>
              <input
                type="text"
                className="form-control"
                placeholder={locale === 'ko' ? '테넌트명을 입력하세요' : 'Enter tenant name'}
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={14} /> {t('username')}
            </label>
            <input
              type="text"
              className="form-control"
              placeholder={locale === 'ko' ? '아이디를 입력하세요' : 'Enter username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={14} /> {t('emailAddress')}
              </label>
              <input
                type="email"
                className="form-control"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={14} /> {t('password')}
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.85rem', marginBottom: '1.25rem' }}
          >
            {loading ? (locale === 'ko' ? '처리중...' : 'Processing...') : (isRegister ? t('register') : t('login'))}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccessMsg('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            {isRegister ? t('alreadyTenant') : t('needTenant')}
          </button>
        </div>
      </div>
    </div>
  );
}
