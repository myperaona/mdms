import { useState } from 'react';
import { request, parseJwt } from '../services/api';
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../context/i18n';

interface MfaProps {
  username: string;
  onVerificationSuccess: (token: string, tenantName: string) => void;
  onCancel: () => void;
}

export default function MfaVerification({ username, onVerificationSuccess, onCancel }: MfaProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t, locale } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError(locale === 'ko' ? '6자리 숫자를 입력해 주세요' : 'Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await request('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      localStorage.setItem('mdms_token', res.token);
      const claims = parseJwt(res.token);
      const tName = res.tenantName || (claims && claims.tenantName) || 'System';

      onVerificationSuccess(res.token, tName);
    } catch (err: any) {
      setError(err.message || (locale === 'ko' ? 'MFA 검증에 실패했습니다. 번호를 확인해 주세요.' : 'MFA validation failed. Please check your code.'));
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
      position: 'relative'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        textAlign: 'center',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(186, 100, 45, 0.1)',
          color: 'var(--color-warning)',
          marginBottom: '1.5rem'
        }}>
          <ShieldCheck size={32} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          {t('mfaTitle')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          {locale === 'ko' ? (
            <>사용자 <strong style={{ color: 'var(--color-accent)' }}>{username}</strong> 님의 구글 OTP 앱에 표시된 6자리 인증 코드를 입력해 주세요.</>
          ) : (
            <>Please enter the 6-digit verification code from your authentication app for user <strong style={{ color: 'var(--color-accent)' }}>{username}</strong>.</>
          )}
        </p>

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
            textAlign: 'left',
            marginBottom: '1.5rem'
          }}>
            <ShieldAlert size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">{locale === 'ko' ? '인증 코드' : 'Verification Code'}</label>
            <input
              type="text"
              className="form-control"
              placeholder="000 000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                textAlign: 'center',
                fontSize: '1.8rem',
                letterSpacing: '0.3em',
                fontWeight: 700,
                padding: '0.5rem'
              }}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem' }}
          >
            {loading ? (locale === 'ko' ? '검증중...' : 'Verifying...') : t('verify')}
          </button>
        </form>

        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginTop: '0.5rem'
          }}
        >
          <ArrowLeft size={16} /> {locale === 'ko' ? '로그인 화면으로 이동' : 'Back to Sign In'}
        </button>
      </div>
    </div>
  );
}
