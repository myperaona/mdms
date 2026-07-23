import React, { createContext, useContext, useState } from 'react';

type Language = 'ko' | 'en';

const translations = {
  ko: {
    title: 'MDMS - 메타데이터 관리 시스템',
    subtitle: '엔터프라이즈급 메타데이터 관리 SaaS',
    tenantName: '조직 / 테넌트 명칭',
    username: '아이디 (Username)',
    emailAddress: '이메일 주소',
    password: '비밀번호',
    login: '로그인',
    register: '회원가입 및 온보딩',
    registerBtn: 'Register & Onboard ➔',
    needTenant: '신규 테넌트 온보딩이 필요하신가요? 가입하기',
    alreadyTenant: '이미 조직이 생성되어 있나요? 로그인',
    loginTitle: '로그인',
    loginBtn: '로그인 ➔',
    mfaTitle: '2단계 인증 (OTP)',
    mfaDesc: 'Google Authenticator 앱의 6자리 인증 코드를 입력하세요.',
    verify: '인증 및 접속',
    verifyBtn: 'Verify Code ➔',
    logout: '로그아웃',
    dashboard: '대시보드',
    dataSources: '데이터 소스',
    dataCatalog: '데이터 카탈로그',
    totalDbs: '등록된 데이터베이스',
    totalTables: '수집된 테이블',
    totalCols: '수집된 컬럼',
    mfaStatus: '2단계 보안 인증(MFA)',
    mfaSetupBtn: 'Google Authenticator 등록',
    mfaEnabledMsg: '이중 OTP 보안 설정이 정상적으로 완료되었습니다.',
    recentActivity: '최근 수집(Ingestion) 활동 상태',
    dbProfiles: '데이터베이스 접속 프로필',
    addDb: '신규 데이터베이스 등록',
    dbType: '데이터베이스 종류',
    host: '호스트 (Host)',
    port: '포트 (Port)',
    dbName: '데이터베이스명 (DB Name)',
    dbUser: '사용자 계정',
    dbPass: '비밀번호',
    save: '저장',
    cancel: '취소',
    testConn: '연결 테스트',
    ingest: '메타데이터 수집',
    jdbcDrivers: '사용자 지정 JDBC 드라이버 관리',
    uploadJar: '드라이버 JAR 파일 업로드',
    noDrivers: '업로드된 사용자 지정 드라이버가 없습니다.',
    driverList: '등록된 JDBC 드라이버 목록',
    selectDbPrompt: '스캔할 데이터베이스를 선택하세요',
    technicalCols: 'Technical Columns',
    dataLineage: 'Data Lineage & 관계 그래프',
    colName: '컬럼명',
    colType: '데이터 타입',
    colNull: 'Null 허용 여부',
    colRef: '참조 계보 (Target Lineage)',
    colDesc: '업무 용어 및 한글 설명',
    upstream: '상위 참조 (Upstream)',
    downstream: '하위 참조 (Downstream)',
    selected: '선택됨',
    noParents: '상위 참조 테이블이 없습니다.',
    noChildren: '하위 참조 테이블이 없습니다.',
    searchPlaceholder: '테이블 또는 설명 검색...',
    selectDbToInspect: '스키마 내비게이션 패널에서 테이블을 선택하여 상세 메타데이터 정의를 검사하세요.',
    addDetails: '용어 및 명세 설명 추가...',
    fieldsCataloged: '개 필드 카탈로그 적재됨',
    connectionSuccess: '데이터베이스 연결에 성공했습니다.',
    connectionFail: '데이터베이스 연결에 실패했습니다.'
  },
  en: {
    title: 'MDMS - Metadata Management System',
    subtitle: 'Enterprise Database Metadata Management SaaS',
    tenantName: 'Organization / Tenant Name',
    username: 'Username',
    emailAddress: 'Email Address',
    password: 'Password',
    login: 'Login',
    register: 'Register & Onboard',
    registerBtn: 'Register & Onboard ➔',
    needTenant: 'Need a new tenant registry? Sign Up',
    alreadyTenant: 'Already have an organization? Login',
    loginTitle: 'Login',
    loginBtn: 'Login ➔',
    mfaTitle: '2-Factor Authentication (OTP)',
    mfaDesc: 'Enter the 6-digit verification code from your Google Authenticator app.',
    verify: 'Verify & Login',
    verifyBtn: 'Verify Code ➔',
    logout: 'Log Out',
    dashboard: 'Dashboard',
    dataSources: 'Data Sources',
    dataCatalog: 'Data Catalog',
    totalDbs: 'Registered Databases',
    totalTables: 'Scanned Tables',
    totalCols: 'Cataloged Columns',
    mfaStatus: 'Multi-Factor Authentication (MFA)',
    mfaSetupBtn: 'Setup Google Authenticator',
    mfaEnabledMsg: 'OTP Multi-factor security is successfully enabled.',
    recentActivity: 'Recent Ingestion Activity',
    dbProfiles: 'Database Connection Profiles',
    addDb: 'Register Database',
    dbType: 'Database Type',
    host: 'Host',
    port: 'Port',
    dbName: 'Database Name',
    dbUser: 'Username',
    dbPass: 'Password',
    save: 'Save',
    cancel: 'Cancel',
    testConn: 'Test Connection',
    ingest: 'Ingest Metadata',
    jdbcDrivers: 'Custom JDBC Drivers Manager',
    uploadJar: 'Upload Driver JAR File',
    noDrivers: 'No custom JDBC drivers uploaded yet.',
    driverList: 'Registered JDBC Drivers List',
    selectDbPrompt: 'Select target datasource to scan...',
    technicalCols: 'Technical Columns',
    dataLineage: 'Data Lineage & Relationship Graph',
    colName: 'Column Name',
    colType: 'Data Type',
    colNull: 'Nullability',
    colRef: 'Target Lineage References',
    colDesc: 'Business Description / Dictionary',
    upstream: 'Upstream (Parents)',
    downstream: 'Downstream (Children)',
    selected: 'Selected',
    noParents: 'No parent tables',
    noChildren: 'No child tables',
    searchPlaceholder: 'Search tables or definitions...',
    selectDbToInspect: 'Select a table from the schema navigation panel to inspect catalog metadata definitions.',
    addDetails: 'Add details...',
    fieldsCataloged: 'Fields Cataloged',
    connectionSuccess: 'Successfully connected to database.',
    connectionFail: 'Database connection failed.'
  }
};

interface I18nContextProps {
  locale: Language;
  setLocale: (lang: Language) => void;
  t: (key: keyof typeof translations['ko']) => string;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Language>(() => {
    const saved = localStorage.getItem('mdms_locale') as Language;
    return saved || 'ko'; // Default to Korean
  });

  const setLocale = (lang: Language) => {
    setLocaleState(lang);
    localStorage.setItem('mdms_locale', lang);
  };

  const t = (key: keyof typeof translations['ko']) => {
    const currentDict = translations[locale] || translations['ko'];
    return currentDict[key] || translations['ko'][key] || String(key);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
