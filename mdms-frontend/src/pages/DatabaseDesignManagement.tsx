import React, { useState, useEffect } from 'react';
import { request } from '../services/api';
import { useTranslation } from '../context/i18n';
import ErdCanvas from '../components/ErdCanvas';
import type { ErdEntityItem, ErdRelationItem } from '../components/ErdCanvas';
import {
  Plus,
  Trash2,
  RefreshCw,
  X,
  Search,
  Edit2,
  Play
} from 'lucide-react';

interface DesignSession {
  designId: string;
  designName: string;
  systemName?: string;
  description?: string;
  version?: string;
  status: string;
  createdBy?: string;
  createdAt?: string;
}

interface SubjectArea {
  subjectAreaId: string;
  designId: string;
  subjectAreaName: string;
  subjectAreaCode?: string;
  parentSubjectAreaId?: string;
  description?: string;
  sortOrder?: number;
  useYn?: string;
  termCount?: number;
}

interface DomainItem {
  id?: string;
  domainGroup: string;
  domainClassification: string;
  name: string;
  dataType: string;
  dataLength?: number;
  decimalLength?: number;
  storageFormat?: string;
}

interface StandardTerm {
  id: string;
  logicalName: string;
  physicalName: string;
  description?: string;
  storageFormat?: string;
  commonDomainName?: string;
  allowedValues?: string;
}

interface TableDesign {
  tableDesignId: string;
  designId: string;
  subjectAreaId?: string;
  tableLogicName: string;
  tablePhysicalName: string;
  description?: string;
  version?: string;
  status?: string;
  subjectAreaName?: string;
  columnCount?: number;
}

interface TableColumn {
  columnId?: string;
  tableDesignId: string;
  termId?: string;
  columnLogicName: string;
  columnPhysicalName: string;
  dataType: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullableYn?: string;
  defaultValue?: string;
  pkYn?: string;
  fkYn?: string;
  uniqueYn?: string;
  sortOrder?: number;
  remark?: string;
}

interface DbConnection {
  connectionId: string;
  connectionName: string;
  dbType: string;
  host: string;
  port: number;
  dbName: string;
  schemaName?: string;
  userId: string;
  password?: string;
  useYn?: string;
}

interface DbDeployLog {
  deployLogId: string;
  designId: string;
  tableDesignId?: string;
  connectionId: string;
  connectionName?: string;
  sqlText: string;
  executedAt: string;
  executedBy: string;
  resultStatus: string;
  errorMessage?: string;
}

export default function DatabaseDesignManagement() {
  const { locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<'sessions' | 'subjects' | 'tables' | 'erd' | 'connections' | 'deploy'>('sessions');

  // Active Selected Session State
  const [sessions, setSessions] = useState<DesignSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);

  // States for Tab 1: Design Sessions
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({ designName: '', systemName: '', description: '', version: 'v1.0' });

  // States for Tab 2: Subject Areas
  const [subjectAreas, setSubjectAreas] = useState<SubjectArea[]>([]);
  const [selectedSubjectAreaId, setSelectedSubjectAreaId] = useState<string | null>(null);
  const [editingSubjectAreaId, setEditingSubjectAreaId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ subjectAreaName: '', subjectAreaCode: '', description: '' });
  const [mappedTerms, setMappedTerms] = useState<StandardTerm[]>([]);
  const [availableTerms, setAvailableTerms] = useState<StandardTerm[]>([]);
  const [termSearchKeyword, setTermSearchKeyword] = useState('');
  const [selectedTermIdsForBatch, setSelectedTermIdsForBatch] = useState<string[]>([]);

  // States for Tab 3: Tables & Columns
  const [tables, setTables] = useState<TableDesign[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableForm, setTableForm] = useState({ tableLogicName: '', tablePhysicalName: '', description: '', subjectAreaId: '' });
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [colForm, setColForm] = useState<TableColumn>({
    tableDesignId: '',
    columnLogicName: '',
    columnPhysicalName: '',
    dataType: 'VARCHAR',
    length: 100,
    precision: 0,
    nullableYn: 'Y',
    defaultValue: '',
    pkYn: 'N',
    fkYn: 'N',
    uniqueYn: 'N',
    sortOrder: 10,
    remark: ''
  });

  // States for Tab 4: ERD
  const [erdEntities, setErdEntities] = useState<ErdEntityItem[]>([]);
  const [erdRelations, setErdRelations] = useState<ErdRelationItem[]>([]);

  // States for Tab 5: DB Connections
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [connForm, setConnForm] = useState({
    connectionName: '',
    dbType: 'POSTGRESQL',
    host: 'localhost',
    port: 5432,
    dbName: 'mdms_db',
    schemaName: 'public',
    userId: 'postgres',
    password: ''
  });
  const [testResult, setTestResult] = useState<{ id: string; result: string; message: string } | null>(null);

  // States for Tab 6: DDL & Deploy
  const [selectedConnIdForDeploy, setSelectedConnIdForDeploy] = useState<string>('');
  const [generatedDdl, setGeneratedDdl] = useState<string>('');
  const [deployLogs, setDeployLogs] = useState<DbDeployLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
    loadConnections();
    loadAvailableStandardTerms();
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadSubjectAreas(selectedSessionId);
      loadTables(selectedSessionId);
      loadErdData(selectedSessionId);
      loadDeployLogs(selectedSessionId);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    if (selectedSubjectAreaId) {
      loadMappedTerms(selectedSubjectAreaId);
    }
  }, [selectedSubjectAreaId]);

  useEffect(() => {
    if (selectedTableId) {
      loadColumns(selectedTableId);
    }
  }, [selectedTableId]);

  // Fetch APIs
  const loadSessions = async () => {
    try {
      const data = await request('/designs');
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].designId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSubjectAreas = async (designId: string) => {
    try {
      const data = await request(`/designs/${designId}/subject-areas`);
      setSubjectAreas(data);
      if (data.length > 0) setSelectedSubjectAreaId(data[0].subjectAreaId);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAvailableStandardTerms = async () => {
    try {
      const data = await request('/standardization/terms');
      setAvailableTerms(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMappedTerms = async (subjectAreaId: string) => {
    try {
      const data = await request(`/designs/subject-areas/${subjectAreaId}/terms`);
      setMappedTerms(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTables = async (designId: string) => {
    try {
      const data = await request(`/designs/${designId}/tables`);
      setTables(data);
      if (data.length > 0) setSelectedTableId(data[0].tableDesignId);
    } catch (e) {
      console.error(e);
    }
  };

  const loadColumns = async (tableDesignId: string) => {
    try {
      const data = await request(`/designs/tables/${tableDesignId}/columns`);
      setColumns(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadErdData = async (designId: string) => {
    try {
      const ents: any[] = await request(`/designs/${designId}/erd/entities`);
      const rels: any[] = await request(`/designs/${designId}/erd/relations`);
      const tbls: TableDesign[] = await request(`/designs/${designId}/tables`);

      const enrichedEntities: ErdEntityItem[] = await Promise.all(
        tbls.map(async tbl => {
          const matchedEnt = ents.find(e => e.tableDesignId === tbl.tableDesignId);
          const cols: TableColumn[] = await request(`/designs/tables/${tbl.tableDesignId}/columns`);
          return {
            entityId: matchedEnt?.entityId,
            tableDesignId: tbl.tableDesignId,
            tableLogicName: tbl.tableLogicName,
            tablePhysicalName: tbl.tablePhysicalName,
            positionX: matchedEnt ? matchedEnt.positionX : 100 + Math.random() * 200,
            positionY: matchedEnt ? matchedEnt.positionY : 100 + Math.random() * 200,
            width: matchedEnt ? matchedEnt.width : 240,
            height: matchedEnt ? matchedEnt.height : 180,
            columns: cols.map(c => ({
              columnId: c.columnId || '',
              columnLogicName: c.columnLogicName,
              columnPhysicalName: c.columnPhysicalName,
              dataType: c.dataType,
              pkYn: c.pkYn,
              fkYn: c.fkYn
            }))
          };
        })
      );

      setErdEntities(enrichedEntities);
      setErdRelations(rels);
    } catch (e) {
      console.error(e);
    }
  };

  const loadConnections = async () => {
    try {
      const data = await request('/designs/db-connections');
      setConnections(data);
      if (data.length > 0) setSelectedConnIdForDeploy(data[0].connectionId);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDeployLogs = async (designId: string) => {
    try {
      const data = await request(`/designs/${designId}/deploy-logs`);
      setDeployLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newSession = await request('/designs', {
        method: 'POST',
        body: JSON.stringify(sessionForm)
      });
      setSessionForm({ designName: '', systemName: '', description: '', version: 'v1.0' });
      setShowSessionModal(false);
      loadSessions();
      setSelectedSessionId(newSession.designId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteSession = async (designId: string) => {
    if (!confirm(locale === 'ko' ? '정말 이 설계 세션을 삭제하시겠습니까?' : 'Delete this design session?')) return;
    try {
      await request(`/designs/${designId}`, { method: 'DELETE' });
      loadSessions();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateStatus = async (designId: string, status: string) => {
    try {
      await request(`/designs/${designId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      loadSessions();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const resetSubjectForm = () => {
    setEditingSubjectAreaId(null);
    setSubjectForm({ subjectAreaName: '', subjectAreaCode: '', description: '' });
  };

  const handleSaveSubjectArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;
    try {
      if (editingSubjectAreaId) {
        await request(`/designs/subject-areas/${editingSubjectAreaId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...subjectForm, subjectAreaId: editingSubjectAreaId, designId: selectedSessionId })
        });
      } else {
        await request(`/designs/${selectedSessionId}/subject-areas`, {
          method: 'POST',
          body: JSON.stringify(subjectForm)
        });
      }
      resetSubjectForm();
      loadSubjectAreas(selectedSessionId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteSubjectArea = async (subjectAreaId: string) => {
    if (!confirm(locale === 'ko' ? '정말 이 주제영역을 삭제하시겠습니까? 연결된 표준용어 매핑 정보도 함께 삭제됩니다.' : 'Delete subject area and mapped terms?')) return;
    try {
      await request(`/designs/subject-areas/${subjectAreaId}`, { method: 'DELETE' });
      if (editingSubjectAreaId === subjectAreaId) resetSubjectForm();
      if (selectedSubjectAreaId === subjectAreaId) {
        setSelectedSubjectAreaId(null);
        setMappedTerms([]);
      }
      if (selectedSessionId) loadSubjectAreas(selectedSessionId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditSubjectAreaClick = (sa: SubjectArea) => {
    setEditingSubjectAreaId(sa.subjectAreaId);
    setSubjectForm({
      subjectAreaName: sa.subjectAreaName,
      subjectAreaCode: sa.subjectAreaCode || '',
      description: sa.description || ''
    });
  };

  const handleMapTermToSubject = async (termId: string) => {
    if (!selectedSubjectAreaId) return;
    try {
      await request(`/designs/subject-areas/${selectedSubjectAreaId}/terms`, {
        method: 'POST',
        body: JSON.stringify({ termId })
      });
      loadMappedTerms(selectedSubjectAreaId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUnmapTermFromSubject = async (termId: string) => {
    if (!selectedSubjectAreaId) return;
    try {
      await request(`/designs/subject-areas/${selectedSubjectAreaId}/terms/${termId}`, {
        method: 'DELETE'
      });
      loadMappedTerms(selectedSubjectAreaId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBatchMapTerms = async () => {
    if (!selectedSubjectAreaId || selectedTermIdsForBatch.length === 0) return;
    try {
      await Promise.all(
        selectedTermIdsForBatch.map(termId =>
          request(`/designs/subject-areas/${selectedSubjectAreaId}/terms`, {
            method: 'POST',
            body: JSON.stringify({ termId })
          })
        )
      );
      setSelectedTermIdsForBatch([]);
      loadMappedTerms(selectedSubjectAreaId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const resetTableForm = () => {
    setEditingTableId(null);
    setTableForm({ tableLogicName: '', tablePhysicalName: '', description: '', subjectAreaId: '' });
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;
    try {
      if (editingTableId) {
        await request(`/designs/tables/${editingTableId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...tableForm, tableDesignId: editingTableId, designId: selectedSessionId, subjectAreaId: selectedSubjectAreaId || null })
        });
      } else {
        await request(`/designs/${selectedSessionId}/tables`, {
          method: 'POST',
          body: JSON.stringify({ ...tableForm, subjectAreaId: selectedSubjectAreaId || null })
        });
      }
      resetTableForm();
      loadTables(selectedSessionId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteTable = async (tableDesignId: string) => {
    if (!confirm(locale === 'ko' ? '정말 이 테이블을 삭제하시겠습니까? 속한 모든 컬럼도 함께 삭제됩니다.' : 'Delete table and all its columns?')) return;
    try {
      await request(`/designs/tables/${tableDesignId}`, { method: 'DELETE' });
      if (editingTableId === tableDesignId) resetTableForm();
      if (selectedTableId === tableDesignId) {
        setSelectedTableId(null);
        setColumns([]);
      }
      if (selectedSessionId) loadTables(selectedSessionId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditTableClick = (tbl: TableDesign) => {
    setEditingTableId(tbl.tableDesignId);
    setTableForm({
      tableLogicName: tbl.tableLogicName,
      tablePhysicalName: tbl.tablePhysicalName,
      description: tbl.description || '',
      subjectAreaId: tbl.subjectAreaId || ''
    });
  };

  const loadDomains = async () => {
    try {
      const data = await request('/standardization/domains');
      setDomains(data);
    } catch (e) {
      console.error(e);
    }
  };

  const resetColForm = () => {
    setEditingColumnId(null);
    setColForm({
      tableDesignId: selectedTableId || '',
      columnLogicName: '',
      columnPhysicalName: '',
      dataType: 'VARCHAR',
      length: 100,
      precision: 0,
      nullableYn: 'Y',
      defaultValue: '',
      pkYn: 'N',
      fkYn: 'N',
      uniqueYn: 'N',
      sortOrder: (columns.length + 1) * 10,
      remark: ''
    });
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableId) return;
    try {
      if (editingColumnId) {
        await request(`/designs/columns/${editingColumnId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...colForm, tableDesignId: selectedTableId })
        });
      } else {
        await request(`/designs/tables/${selectedTableId}/columns`, {
          method: 'POST',
          body: JSON.stringify({ ...colForm, tableDesignId: selectedTableId })
        });
      }
      resetColForm();
      loadColumns(selectedTableId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm(locale === 'ko' ? '정말 이 컬럼을 삭제하시겠습니까?' : 'Delete this column?')) return;
    try {
      await request(`/designs/columns/${columnId}`, { method: 'DELETE' });
      if (editingColumnId === columnId) resetColForm();
      if (selectedTableId) loadColumns(selectedTableId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditColumnClick = (col: TableColumn) => {
    setEditingColumnId(col.columnId || null);
    setColForm({
      columnId: col.columnId,
      tableDesignId: col.tableDesignId,
      termId: col.termId,
      columnLogicName: col.columnLogicName,
      columnPhysicalName: col.columnPhysicalName,
      dataType: col.dataType || 'VARCHAR',
      length: col.length ?? 100,
      precision: col.precision ?? 0,
      scale: col.scale,
      nullableYn: col.nullableYn || 'Y',
      defaultValue: col.defaultValue || '',
      pkYn: col.pkYn || 'N',
      fkYn: col.fkYn || 'N',
      uniqueYn: col.uniqueYn || 'N',
      sortOrder: col.sortOrder ?? 0,
      remark: col.remark || ''
    });
  };

  const handleSelectTermForColumn = (term: StandardTerm) => {
    // 1. Find matching domain by term's commonDomainName or domainClassification
    const domainNameInput = term.commonDomainName || '';
    const matchedDomain: DomainItem | undefined = domains.find(d => 
      (domainNameInput && (d.name === domainNameInput || d.domainClassification === domainNameInput)) ||
      (d.domainClassification && d.domainClassification.toLowerCase() === domainNameInput.toLowerCase())
    );

    // 2. Extract values based on Domain mapping instruction
    // remark: 공통표준 도메인명 (e.g. 금액)
    // dataType: 도메인 관리의 데이터 타입 (e.g. NUMERIC)
    // length: 데이터 길이 (e.g. 15)
    // precision: 소수점 길이 (e.g. 2)
    const commonDomainName = matchedDomain ? (matchedDomain.domainClassification || matchedDomain.name) : (domainNameInput || '일반도메인');
    const actualDataType = matchedDomain ? matchedDomain.dataType : (term.storageFormat || 'VARCHAR');
    const dataLen = matchedDomain?.dataLength ?? 100;
    const decimalLen = matchedDomain?.decimalLength ?? 0;

    setColForm(prev => ({
      ...prev,
      termId: term.id,
      columnLogicName: term.logicalName,
      columnPhysicalName: term.physicalName,
      remark: commonDomainName,
      dataType: actualDataType,
      length: dataLen,
      precision: decimalLen
    }));
  };

  const handleSaveErdPositions = async (updatedEntities: ErdEntityItem[]) => {
    if (!selectedSessionId) return;
    try {
      await request(`/designs/${selectedSessionId}/erd/entities`, {
        method: 'POST',
        body: JSON.stringify(updatedEntities)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const resetConnForm = () => {
    setEditingConnId(null);
    setConnForm({
      connectionName: '',
      dbType: 'POSTGRESQL',
      host: 'localhost',
      port: 5432,
      dbName: 'gis',
      schemaName: 'public',
      userId: 'geoserver',
      password: ''
    });
  };

  const handleSaveDbConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingConnId) {
        await request(`/designs/db-connections/${editingConnId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...connForm, connectionId: editingConnId })
        });
      } else {
        await request('/designs/db-connections', {
          method: 'POST',
          body: JSON.stringify(connForm)
        });
      }
      resetConnForm();
      loadConnections();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteDbConnection = async (connectionId: string) => {
    if (!confirm(locale === 'ko' ? '정말 이 DB 연결을 삭제하시겠습니까?' : 'Delete this DB connection?')) return;
    try {
      await request(`/designs/db-connections/${connectionId}`, { method: 'DELETE' });
      if (editingConnId === connectionId) resetConnForm();
      loadConnections();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditDbConnectionClick = (conn: DbConnection) => {
    setEditingConnId(conn.connectionId);
    setConnForm({
      connectionName: conn.connectionName,
      dbType: conn.dbType || 'POSTGRESQL',
      host: conn.host || 'localhost',
      port: conn.port || 5432,
      dbName: conn.dbName || (conn as any).databaseName || 'gis',
      schemaName: conn.schemaName || 'public',
      userId: conn.userId || (conn as any).username || 'geoserver',
      password: ''
    });
  };

  const handleTestConnection = async (connId: string) => {
    try {
      const res = await request(`/designs/db-connections/${connId}/test`, { method: 'POST' });
      setTestResult({ id: connId, result: res.result, message: res.message });
    } catch (e: any) {
      setTestResult({ id: connId, result: 'FAIL', message: e.message });
    }
  };

  const handleGenerateDdl = async () => {
    if (!selectedSessionId) return;
    try {
      const conn = connections.find(c => c.connectionId === selectedConnIdForDeploy);
      const res = await request(`/designs/${selectedSessionId}/ddl/generate`, {
        method: 'POST',
        body: JSON.stringify({ dbType: conn?.dbType || 'POSTGRESQL' })
      });
      setGeneratedDdl(res.ddlText);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeployDdl = async () => {
    if (!selectedSessionId || !selectedConnIdForDeploy || !generatedDdl) return;
    if (!confirm(locale === 'ko' ? '타겟 DB에 DDL을 직접 실행하고 반영하시겠습니까?' : 'Execute and deploy DDL to target DB?')) return;
    setLoading(true);
    try {
      const logRes = await request(`/designs/${selectedSessionId}/ddl/deploy`, {
        method: 'POST',
        body: JSON.stringify({ connectionId: selectedConnIdForDeploy, ddlText: generatedDdl })
      });
      alert(`[${logRes.resultStatus}] ${logRes.errorMessage}`);
      loadDeployLogs(selectedSessionId);
      loadSessions();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s =>
    s.designName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    (s.systemName && s.systemName.toLowerCase().includes(searchKeyword.toLowerCase()))
  ).slice(0, pageSize);

  return (
    <div>
      {/* Header Section (Exactly matching StandardizationManagement title size & margin) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>{locale === 'ko' ? '데이터베이스 설계' : 'Database Design Management'}</h1>
          <p>
            {locale === 'ko'
              ? '표준용어 및 주제영역을 기반으로 테이블/컬럼을 설계하고, ERD 시각화 및 타겟 DB에 DDL을 실시간으로 반영합니다.'
              : 'Design subject areas, tables, columns using standard terms, visualize ERD, and deploy DDL to target DB.'}
          </p>
        </div>

        {/* Selected Session Selector (Matching DataCatalog select combo box style exactly) */}
        <select
          className="form-control"
          value={selectedSessionId || ''}
          onChange={e => setSelectedSessionId(e.target.value)}
          style={{ width: 'auto', minWidth: '200px' }}
        >
          {sessions.map(s => (
            <option key={s.designId} value={s.designId}>{s.designName}</option>
          ))}
        </select>
      </div>

      {/* Top Sub-Tabs Navigation (Compact Segment Buttons) */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'sessions', label: locale === 'ko' ? '설계 세션 관리' : 'Design Sessions' },
          { id: 'subjects', label: locale === 'ko' ? '주제영역 & 용어 매핑' : 'Subject Areas & Terms' },
          { id: 'tables', label: locale === 'ko' ? '테이블 & 컬럼 설계' : 'Tables & Columns' },
          { id: 'erd', label: locale === 'ko' ? 'ERD 편집/확인' : 'Interactive ERD' },
          { id: 'connections', label: locale === 'ko' ? 'DB 연결 관리' : 'DB Connections' },
          { id: 'deploy', label: locale === 'ko' ? 'DDL 생성 & DB 반영' : 'DDL & Deployment' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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

      {/* Conditional Primary Action Button ONLY in Session Tab (Matching Standardization Management Add Button) */}
      {activeTab === 'sessions' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowSessionModal(true)}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <Plus size={16} /> {locale === 'ko' ? '신규 설계 추가' : 'Add Design Session'}
          </button>
        </div>
      )}

      {/* Modal for Creating New Session */}
      {showSessionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '480px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>{locale === 'ko' ? '신규 DB 설계 세션 생성' : 'Create New Design Session'}</h3>
              <X size={20} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowSessionModal(false)} />
            </div>
            <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">{locale === 'ko' ? '설계명' : 'Design Name'}</label>
                <input
                  className="form-control"
                  placeholder={locale === 'ko' ? '예: 고객관리 DB 1차 설계' : 'Design Name'}
                  value={sessionForm.designName}
                  onChange={e => setSessionForm(prev => ({ ...prev, designName: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">{locale === 'ko' ? '대상 시스템명' : 'System Name'}</label>
                  <input
                    className="form-control"
                    placeholder={locale === 'ko' ? '예: CRM' : 'System Name'}
                    value={sessionForm.systemName}
                    onChange={e => setSessionForm(prev => ({ ...prev, systemName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">{locale === 'ko' ? '버전' : 'Version'}</label>
                  <input
                    className="form-control"
                    placeholder="v1.0"
                    value={sessionForm.version}
                    onChange={e => setSessionForm(prev => ({ ...prev, version: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">{locale === 'ko' ? '설명 및 메모' : 'Description'}</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder={locale === 'ko' ? '설계 개요를 입력하세요' : 'Description'}
                  value={sessionForm.description}
                  onChange={e => setSessionForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem', fontWeight: 700 }}>
                {locale === 'ko' ? '생성하기' : 'Create Session'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 1: Design Sessions Table View */}
      {activeTab === 'sessions' && (
        <div>
          {/* Filter Bar (Search Box + Rows Selector) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                className="form-control"
                placeholder={locale === 'ko' ? '설계명 검색...' : 'Search design...'}
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{ paddingLeft: '2.4rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#94a3b8' }}>
              <span>{locale === 'ko' ? '목록 개수 설정:' : 'Rows:'}</span>
              <select
                className="form-control"
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                style={{ width: 'auto', padding: '0.2rem 0.6rem', fontSize: '0.825rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Main Grid Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <tr>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: '#cbd5e1' }}>{locale === 'ko' ? '설계명' : 'Design Name'}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: '#cbd5e1' }}>{locale === 'ko' ? '대상 시스템' : 'System'}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: '#cbd5e1' }}>{locale === 'ko' ? '설명' : 'Description'}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: '#cbd5e1' }}>{locale === 'ko' ? '버전' : 'Version'}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: '#cbd5e1' }}>{locale === 'ko' ? '상태' : 'Status'}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: '#cbd5e1' }}>{locale === 'ko' ? '작성자' : 'Created By'}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: '#cbd5e1' }}>{locale === 'ko' ? '생성일시' : 'Created At'}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: '#cbd5e1', textAlign: 'center' }}>{locale === 'ko' ? '관리' : 'Manage'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        {locale === 'ko' ? '등록된 데이터베이스 설계 세션이 없습니다.' : 'No design sessions found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map(s => (
                      <tr
                        key={s.designId}
                        style={{
                          backgroundColor: s.designId === selectedSessionId ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)'
                        }}
                      >
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc', fontSize: '0.875rem' }}>
                          {s.designName}
                          {s.designId === selectedSessionId && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                              선택됨
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#a855f7', fontWeight: 600, fontSize: '0.85rem' }}>{s.systemName || '-'}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.825rem', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.description || '-'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}><code style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{s.version}</code></td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className={`badge ${s.status === 'DEPLOYED' ? 'badge-success' : s.status === 'CONFIRMED' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.75rem' }}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontSize: '0.825rem' }}>{s.createdBy || 'System'}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                            <select
                              className="form-control"
                              value={s.status}
                              onChange={e => handleUpdateStatus(s.designId, e.target.value)}
                              style={{ width: 'auto', padding: '0.15rem 0.4rem', fontSize: '0.75rem', backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                            >
                              <option value="DRAFT">초안</option>
                              <option value="REVIEW">검토중</option>
                              <option value="CONFIRMED">확정</option>
                              <option value="DEPLOYED">반영완료</option>
                            </select>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => setSelectedSessionId(s.designId)}
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Edit2 size={12} /> {locale === 'ko' ? '수정' : 'Edit'}
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => handleDeleteSession(s.designId)}
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                            >
                              <Trash2 size={12} />
                            </button>
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

      {/* Tab 2: Subject Areas & Terms Mapping (Updated Layout & Multi-Select) */}
      {activeTab === 'subjects' && selectedSessionId && (
        <div style={{ display: 'flex', gap: '1.5rem', minHeight: 'calc(100vh - 240px)', alignItems: 'stretch' }}>
          {/* Left Column: Subject Areas Box (Width reduced to half ~300px, height matching screen) */}
          <div
            className="glass-card"
            style={{
              width: '300px',
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {locale === 'ko' ? '주제영역' : 'Subject Areas'}
              </h3>
              {editingSubjectAreaId && (
                <button className="btn btn-sm btn-secondary" onClick={resetSubjectForm} style={{ fontSize: '0.725rem' }}>
                  {locale === 'ko' ? '취소' : 'Cancel'}
                </button>
              )}
            </div>

            <form onSubmit={handleSaveSubjectArea} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
              <input
                className="form-control"
                placeholder={locale === 'ko' ? '주제영역명 (예: 고객도메인)' : 'Subject Area Name'}
                value={subjectForm.subjectAreaName}
                onChange={e => setSubjectForm(prev => ({ ...prev, subjectAreaName: e.target.value }))}
                required
              />
              <input
                className="form-control"
                placeholder={locale === 'ko' ? '주제영역 코드 (선택)' : 'Subject Area Code'}
                value={subjectForm.subjectAreaCode}
                onChange={e => setSubjectForm(prev => ({ ...prev, subjectAreaCode: e.target.value }))}
              />
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.55rem' }}>
                <Plus size={16} /> {editingSubjectAreaId ? (locale === 'ko' ? '주제영역 수정 저장' : 'Save Subject Area') : (locale === 'ko' ? '주제영역 추가' : 'Add Subject Area')}
              </button>
            </form>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.2rem' }}>
              {subjectAreas.map(sa => (
                <div
                  key={sa.subjectAreaId}
                  onClick={() => setSelectedSubjectAreaId(sa.subjectAreaId)}
                  style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: sa.subjectAreaId === selectedSubjectAreaId ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    border: sa.subjectAreaId === selectedSubjectAreaId ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: '#f8fafc' }}>{sa.subjectAreaName}</strong>
                    {sa.subjectAreaCode && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>({sa.subjectAreaCode})</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                      {sa.termCount || 0}개
                    </span>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => { e.stopPropagation(); handleEditSubjectAreaClick(sa); }}
                      title={locale === 'ko' ? '주제영역 수정' : 'Edit Subject Area'}
                      style={{ padding: '0.2rem 0.4rem' }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleDeleteSubjectArea(sa.subjectAreaId); }}
                      title={locale === 'ko' ? '주제영역 및 연결 매핑 삭제' : 'Delete Subject Area & Mappings'}
                      style={{ padding: '0.2rem 0.4rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Standard Terms Mapping Box (Expanded width, matching height) */}
          <div
            className="glass-card"
            style={{
              flex: 1,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {locale === 'ko' ? '표준용어 연결 매핑' : 'Mapped Standard Terms'}
              </h3>
              {selectedSubjectAreaId && (
                <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                  {subjectAreas.find(s => s.subjectAreaId === selectedSubjectAreaId)?.subjectAreaName || '주제영역'} 선택됨
                </span>
              )}
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.825rem', marginBottom: '0.85rem' }}>
              {locale === 'ko' ? '선택한 주제영역에 연결할 전사 표준용어를 다중 선택하여 매핑합니다.' : 'Select standard terms from glossary to assign.'}
            </p>

            {/* Currently Mapped Terms Section */}
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem 0.85rem', borderRadius: '8px', maxHeight: '140px', overflowY: 'auto', marginBottom: '1rem', background: 'rgba(15,23,42,0.4)' }}>
              <strong style={{ fontSize: '0.825rem', color: '#6366f1', display: 'block', marginBottom: '0.4rem' }}>
                {locale === 'ko' ? '📌 현재 연결된 용어 목록' : '📌 Currently Mapped Terms'} ({mappedTerms.length}개)
              </strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {mappedTerms.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {locale === 'ko' ? '연결된 표준용어가 없습니다. 아래 목록에서 용어를 선택 후 일괄 연결해주세요.' : 'No terms mapped yet.'}
                  </span>
                ) : (
                  mappedTerms.map(term => (
                    <span key={term.id} className="badge badge-primary" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>
                      {term.logicalName} ({term.physicalName})
                      <Trash2 size={12} style={{ cursor: 'pointer' }} onClick={() => handleUnmapTermFromSubject(term.id)} />
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Available Terms Search & Multi-Selection Section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    className="form-control"
                    placeholder={locale === 'ko' ? '표준용어 검색 (논리명 / 물리명)' : 'Search terms...'}
                    value={termSearchKeyword}
                    onChange={e => setTermSearchKeyword(e.target.value)}
                    style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Multi-select Batch Map Button */}
                {selectedTermIdsForBatch.length > 0 && (
                  <button
                    className="btn btn-primary"
                    onClick={handleBatchMapTerms}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', whiteSpace: 'nowrap', display: 'flex', gap: '0.4rem', alignItems: 'center', fontWeight: 700 }}
                  >
                    <Plus size={14} /> {locale === 'ko' ? `선택한 ${selectedTermIdsForBatch.length}개 용어 일괄 연결` : `Map ${selectedTermIdsForBatch.length} Terms`}
                  </button>
                )}
              </div>

              {/* Term List with Multi-Select Checkbox Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px 6px 0 0', fontSize: '0.8rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontWeight: 600, color: '#f8fafc' }}>
                  <input
                    type="checkbox"
                    checked={
                      availableTerms.filter(t => !mappedTerms.some(mt => mt.id === t.id)).length > 0 &&
                      selectedTermIdsForBatch.length === availableTerms.filter(t => !mappedTerms.some(mt => mt.id === t.id)).length
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        const unmapped = availableTerms
                          .filter(t => !mappedTerms.some(mt => mt.id === t.id))
                          .map(t => t.id);
                        setSelectedTermIdsForBatch(unmapped);
                      } else {
                        setSelectedTermIdsForBatch([]);
                      }
                    }}
                  />
                  {locale === 'ko' ? '전체 선택 (미연결 용어)' : 'Select All Unmapped'}
                </label>
                <span>{locale === 'ko' ? `총 ${availableTerms.length}개 용어 중 ${selectedTermIdsForBatch.length}개 선택됨` : `${selectedTermIdsForBatch.length} selected`}</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.4rem', background: 'rgba(0,0,0,0.1)' }}>
                {availableTerms
                  .filter(t => t.logicalName.toLowerCase().includes(termSearchKeyword.toLowerCase()) || t.physicalName.toLowerCase().includes(termSearchKeyword.toLowerCase()))
                  .map(term => {
                    const isMapped = mappedTerms.some(mt => mt.id === term.id);
                    const isChecked = selectedTermIdsForBatch.includes(term.id);

                    return (
                      <div
                        key={term.id}
                        onClick={() => {
                          if (isMapped) return;
                          if (isChecked) {
                            setSelectedTermIdsForBatch(prev => prev.filter(id => id !== term.id));
                          } else {
                            setSelectedTermIdsForBatch(prev => [...prev, term.id]);
                          }
                        }}
                        style={{
                          padding: '0.55rem 0.75rem',
                          borderRadius: '6px',
                          background: isChecked ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                          border: isChecked ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.825rem',
                          cursor: isMapped ? 'default' : 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input
                            type="checkbox"
                            disabled={isMapped}
                            checked={isMapped || isChecked}
                            onChange={e => {
                              e.stopPropagation();
                              if (isMapped) return;
                              if (e.target.checked) {
                                setSelectedTermIdsForBatch(prev => [...prev, term.id]);
                              } else {
                                setSelectedTermIdsForBatch(prev => prev.filter(id => id !== term.id));
                              }
                            }}
                          />
                          <div>
                            <strong style={{ color: isMapped ? '#64748b' : '#f8fafc' }}>{term.logicalName}</strong>
                            <span style={{ color: '#6366f1', marginLeft: '0.5rem', fontFamily: 'monospace' }}>{term.physicalName}</span>
                            <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.5rem' }}>[{term.storageFormat || '-'}]</span>
                          </div>
                        </div>

                        {isMapped ? (
                          <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                            {locale === 'ko' ? '연결완료' : 'Mapped'}
                          </span>
                        ) : (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={e => {
                              e.stopPropagation();
                              handleMapTermToSubject(term.id);
                            }}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {locale === 'ko' ? '+ 개별 연결' : '+ Map'}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tables & Columns (Updated Layout & Attributes) */}
      {activeTab === 'tables' && selectedSessionId && (
        <div style={{ display: 'flex', gap: '1.5rem', minHeight: 'calc(100vh - 240px)', alignItems: 'stretch' }}>
          {/* Left Column: Table Definition Box (Width reduced to 300px, height matching screen) */}
          <div
            className="glass-card"
            style={{
              width: '300px',
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {locale === 'ko' ? '테이블 정의' : 'Tables'}
              </h3>
              {editingTableId && (
                <button className="btn btn-sm btn-secondary" onClick={resetTableForm} style={{ fontSize: '0.725rem' }}>
                  {locale === 'ko' ? '취소' : 'Cancel'}
                </button>
              )}
            </div>

            <form onSubmit={handleSaveTable} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
              <input
                className="form-control"
                placeholder={locale === 'ko' ? '테이블 논리명 (예: 고객마스터)' : 'Table Logical Name'}
                value={tableForm.tableLogicName}
                onChange={e => setTableForm(prev => ({ ...prev, tableLogicName: e.target.value }))}
                required
              />
              <input
                className="form-control"
                placeholder={locale === 'ko' ? '테이블 물리명 (예: TB_CUST_MST)' : 'Table Physical Name'}
                value={tableForm.tablePhysicalName}
                onChange={e => setTableForm(prev => ({ ...prev, tablePhysicalName: e.target.value.toUpperCase() }))}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.55rem' }}>
                <Plus size={16} /> {editingTableId ? (locale === 'ko' ? '테이블 수정 저장' : 'Save Table') : (locale === 'ko' ? '테이블 추가' : 'Add Table')}
              </button>
            </form>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.2rem' }}>
              {tables.map(tbl => (
                <div
                  key={tbl.tableDesignId}
                  onClick={() => {
                    setSelectedTableId(tbl.tableDesignId);
                    resetColForm();
                  }}
                  style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: tbl.tableDesignId === selectedTableId ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    border: tbl.tableDesignId === selectedTableId ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#6366f1', fontFamily: 'monospace' }}>{tbl.tablePhysicalName}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{tbl.tableLogicName}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>{tbl.columnCount || 0}</span>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => { e.stopPropagation(); handleEditTableClick(tbl); }}
                      title={locale === 'ko' ? '테이블 정보 수정' : 'Edit Table'}
                      style={{ padding: '0.2rem 0.4rem' }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleDeleteTable(tbl.tableDesignId); }}
                      title={locale === 'ko' ? '테이블 및 속한 컬럼 연쇄 삭제' : 'Delete Table & Columns'}
                      style={{ padding: '0.2rem 0.4rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Column Definition & Properties Box */}
          <div
            className="glass-card"
            style={{
              flex: 1,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {locale === 'ko' ? '컬럼 정의 및 속성' : 'Columns Definition & Properties'}
              </h3>
              {selectedTableId && (
                <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                  {tables.find(t => t.tableDesignId === selectedTableId)?.tablePhysicalName} 선택됨
                </span>
              )}
            </div>

            {/* Standard Terms Helper Quick Selector */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '0.775rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                {locale === 'ko' ? '💡 표준용어 클릭시 논리명/물리명/공통표준 도메인명 자동 채우기' : '💡 Click standard term to auto-fill column attributes'}
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxHeight: '80px', overflowY: 'auto' }}>
                {mappedTerms.map(term => (
                  <button
                    key={term.id}
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleSelectTermForColumn(term)}
                    style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0' }}
                  >
                    + {term.logicalName} ({term.physicalName})
                  </button>
                ))}
              </div>
            </div>

            {/* Column Attributes Form (Domain Remark, DB DataType, Length, Precision, PK, FK, Nullable, Unique, DefaultValue, SortOrder) */}
            <form onSubmit={handleSaveColumn} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.5fr', gap: '0.65rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>{locale === 'ko' ? '컬럼 물리명 *' : 'Physical Name *'}</label>
                  <input
                    className="form-control"
                    placeholder="CUST_ID"
                    value={colForm.columnPhysicalName}
                    onChange={e => setColForm(prev => ({ ...prev, columnPhysicalName: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>{locale === 'ko' ? '컬럼 논리명 *' : 'Logical Name *'}</label>
                  <input
                    className="form-control"
                    placeholder="고객ID"
                    value={colForm.columnLogicName}
                    onChange={e => setColForm(prev => ({ ...prev, columnLogicName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>{locale === 'ko' ? '공통표준 도메인명 * (remark 저장)' : 'Common Domain Name *'}</label>
                  <input
                    className="form-control"
                    placeholder="예: 금액, 수량, 고객코드"
                    value={colForm.remark || ''}
                    onChange={e => {
                      const inputRemark = e.target.value;
                      const matched = domains.find(d => d.name === inputRemark || d.domainClassification === inputRemark);
                      setColForm(prev => ({
                        ...prev,
                        remark: inputRemark,
                        dataType: matched ? matched.dataType : prev.dataType,
                        length: matched?.dataLength ?? prev.length,
                        precision: matched?.decimalLength ?? prev.precision
                      }));
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1.2fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>{locale === 'ko' ? 'DB 데이터타입 (data_type)' : 'DB Data Type'}</label>
                  <input
                    className="form-control"
                    placeholder="VARCHAR, NUMERIC"
                    value={colForm.dataType}
                    onChange={e => setColForm(prev => ({ ...prev, dataType: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>{locale === 'ko' ? '길이 (length)' : 'Length'}</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="100"
                    value={colForm.length ?? 100}
                    onChange={e => setColForm(prev => ({ ...prev, length: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>{locale === 'ko' ? '소수점 (precision)' : 'Precision'}</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={colForm.precision ?? 0}
                    onChange={e => setColForm(prev => ({ ...prev, precision: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>{locale === 'ko' ? '기본값 (Default)' : 'Default Value'}</label>
                  <input
                    className="form-control"
                    placeholder="N/A 또는 0"
                    value={colForm.defaultValue || ''}
                    onChange={e => setColForm(prev => ({ ...prev, defaultValue: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>{locale === 'ko' ? '정렬순서 (Order)' : 'Sort Order'}</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="10"
                    value={colForm.sortOrder ?? 0}
                    onChange={e => setColForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    min={0}
                  />
                </div>
              </div>

              {/* Checkboxes Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.45rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: colForm.pkYn === 'Y' ? '#ef4444' : '#cbd5e1' }}>
                    <input type="checkbox" checked={colForm.pkYn === 'Y'} onChange={e => setColForm(p => ({ ...p, pkYn: e.target.checked ? 'Y' : 'N' }))} /> PK
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: colForm.fkYn === 'Y' ? '#38bdf8' : '#cbd5e1' }}>
                    <input type="checkbox" checked={colForm.fkYn === 'Y'} onChange={e => setColForm(p => ({ ...p, fkYn: e.target.checked ? 'Y' : 'N' }))} /> FK
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    <input type="checkbox" checked={colForm.nullableYn === 'Y'} onChange={e => setColForm(p => ({ ...p, nullableYn: e.target.checked ? 'Y' : 'N' }))} /> Nullable
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: colForm.uniqueYn === 'Y' ? '#a855f7' : '#cbd5e1' }}>
                    <input type="checkbox" checked={colForm.uniqueYn === 'Y'} onChange={e => setColForm(p => ({ ...p, uniqueYn: e.target.checked ? 'Y' : 'N' }))} /> Unique
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingColumnId && (
                    <button type="button" className="btn btn-secondary" onClick={resetColForm} style={{ padding: '0.45rem 1rem', fontSize: '0.825rem' }}>
                      {locale === 'ko' ? '취소' : 'Cancel'}
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1.25rem', fontSize: '0.825rem', fontWeight: 700 }}>
                    {editingColumnId ? (locale === 'ko' ? '컬럼 속성 저장' : 'Save Attributes') : (locale === 'ko' ? '컬럼 추가' : 'Add Column')}
                  </button>
                </div>
              </div>
            </form>

            {/* Column List Table (Sorted by sortOrder) */}
            <div className="table-responsive" style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px' }}>
              <table className="table" style={{ margin: 0 }}>
                <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ fontSize: '0.8rem' }}>{locale === 'ko' ? '물리명' : 'Physical'}</th>
                    <th style={{ fontSize: '0.8rem' }}>{locale === 'ko' ? '논리명' : 'Logical'}</th>
                    <th style={{ fontSize: '0.8rem' }}>{locale === 'ko' ? '데이터타입 (도메인명)' : 'Data Type (Domain)'}</th>
                    <th style={{ fontSize: '0.8rem', textAlign: 'center' }}>PK</th>
                    <th style={{ fontSize: '0.8rem', textAlign: 'center' }}>FK</th>
                    <th style={{ fontSize: '0.8rem', textAlign: 'center' }}>Null</th>
                    <th style={{ fontSize: '0.8rem', textAlign: 'center' }}>Unique</th>
                    <th style={{ fontSize: '0.8rem' }}>Default</th>
                    <th style={{ fontSize: '0.8rem', textAlign: 'center' }}>Order</th>
                    <th style={{ fontSize: '0.8rem', textAlign: 'center' }}>{locale === 'ko' ? '관리' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        {locale === 'ko' ? '등록된 컬럼이 없습니다. 상단 폼에서 컬럼을 추가해주세요.' : 'No columns registered.'}
                      </td>
                    </tr>
                  ) : (
                    columns
                      .slice()
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      .map(col => (
                        <tr
                          key={col.columnId}
                          style={{
                            backgroundColor: col.columnId === editingColumnId ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.04)'
                          }}
                        >
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#f8fafc', fontSize: '0.825rem' }}>{col.columnPhysicalName}</td>
                          <td style={{ fontSize: '0.825rem' }}>{col.columnLogicName}</td>
                          <td>
                            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f8fafc' }}>
                              {col.remark || col.dataType}
                            </div>
                            <code style={{ fontSize: '0.725rem', color: '#38bdf8' }}>
                              {col.dataType}
                              {col.length ? `(${col.length}${col.precision ? `,${col.precision}` : ''})` : ''}
                            </code>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {col.pkYn === 'Y' && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>PK</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {col.fkYn === 'Y' && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>FK</span>}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>{col.nullableYn}</td>
                          <td style={{ textAlign: 'center' }}>
                            {col.uniqueYn === 'Y' && <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>UQ</span>}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{col.defaultValue || '-'}</td>
                          <td style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}>{col.sortOrder ?? 0}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleEditColumnClick(col)}
                                title={locale === 'ko' ? '컬럼 수정' : 'Edit Column'}
                                style={{ padding: '0.2rem 0.4rem' }}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => handleDeleteColumn(col.columnId!)}
                                title={locale === 'ko' ? '컬럼 삭제' : 'Delete Column'}
                                style={{ padding: '0.2rem 0.4rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                              >
                                <Trash2 size={12} />
                              </button>
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

      {/* Tab 4: ERD Canvas */}
      {activeTab === 'erd' && selectedSessionId && (
        <div className="glass-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{locale === 'ko' ? '인터랙티브 ERD 다이어그램' : 'Interactive ERD Canvas'}</h3>
            <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
              {locale === 'ko' ? '엔터티 카드를 드래그하여 배치 위치를 저장합니다.' : 'Drag entity cards to adjust layout.'}
            </span>
          </div>
          <ErdCanvas entities={erdEntities} relations={erdRelations} onSavePositions={handleSaveErdPositions} />
        </div>
      )}

      {/* Tab 5: DB Connections */}
      {activeTab === 'connections' && (
        <div className="grid-2" style={{ gap: '1.5rem' }}>
          <div className="glass-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {editingConnId ? (locale === 'ko' ? '타겟 DB 연결 수정' : 'Edit DB Connection') : (locale === 'ko' ? '타겟 DB 연결 등록' : 'Register DB Connection')}
              </h3>
              {editingConnId && (
                <button className="btn btn-sm btn-secondary" onClick={resetConnForm} style={{ fontSize: '0.725rem' }}>
                  {locale === 'ko' ? '취소' : 'Cancel'}
                </button>
              )}
            </div>

            <form onSubmit={handleSaveDbConnection} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                className="form-control"
                placeholder={locale === 'ko' ? '연결 명칭 (예: 운영 PostgreSQL)' : 'Connection Name'}
                value={connForm.connectionName}
                onChange={e => setConnForm(prev => ({ ...prev, connectionName: e.target.value }))}
                required
              />
              <select className="form-control" value={connForm.dbType} onChange={e => setConnForm(prev => ({ ...prev, dbType: e.target.value }))}>
                <option value="POSTGRESQL">PostgreSQL</option>
                <option value="MARIADB">MariaDB / MySQL</option>
                <option value="ORACLE">Oracle</option>
                <option value="MSSQL">Microsoft SQL Server</option>
                <option value="TIBERO">Tibero</option>
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                <input className="form-control" placeholder="Host (localhost)" value={connForm.host} onChange={e => setConnForm(p => ({ ...p, host: e.target.value }))} required />
                <input className="form-control" type="number" placeholder="Port (5432)" value={connForm.port} onChange={e => setConnForm(p => ({ ...p, port: Number(e.target.value) }))} required />
              </div>
              <input className="form-control" placeholder="Database Name (gis)" value={connForm.dbName} onChange={e => setConnForm(p => ({ ...p, dbName: e.target.value }))} required />
              <input className="form-control" placeholder="User ID (geoserver)" value={connForm.userId} onChange={e => setConnForm(p => ({ ...p, userId: e.target.value }))} required />
              <input
                className="form-control"
                type="password"
                placeholder={editingConnId ? (locale === 'ko' ? '비밀번호 (변경시에만 입력)' : 'Password (leave empty if unchanged)') : 'Password'}
                value={connForm.password}
                onChange={e => setConnForm(p => ({ ...p, password: e.target.value }))}
                required={!editingConnId}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                {editingConnId && (
                  <button type="button" className="btn btn-secondary" onClick={resetConnForm} style={{ flex: 1 }}>
                    {locale === 'ko' ? '취소' : 'Cancel'}
                  </button>
                )}
                <button type="submit" className="btn btn-primary" style={{ flex: 2, fontWeight: 600 }}>
                  {editingConnId ? (locale === 'ko' ? '연결 수정 저장' : 'Save Connection') : (locale === 'ko' ? '연결 저장' : 'Save Connection')}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{locale === 'ko' ? '등록된 DB 연결 목록' : 'Registered DB Connections'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {connections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem' }}>
                  {locale === 'ko' ? '등록된 DB 연결 정보가 없습니다.' : 'No registered DB connections.'}
                </div>
              ) : (
                connections.map(conn => (
                  <div key={conn.connectionId} style={{ padding: '0.85rem', borderRadius: '8px', background: conn.connectionId === editingConnId ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{conn.connectionName}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {conn.dbType} | {conn.host}:{conn.port} / {conn.dbName || (conn as any).databaseName}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleTestConnection(conn.connectionId)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                        <RefreshCw size={13} /> Ping Test
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEditDbConnectionClick(conn)} title={locale === 'ko' ? '연결 수정' : 'Edit Connection'} style={{ padding: '0.25rem 0.45rem' }}>
                        <Edit2 size={12} />
                      </button>
                      <button className="btn btn-sm" onClick={() => handleDeleteDbConnection(conn.connectionId)} title={locale === 'ko' ? '연결 삭제' : 'Delete Connection'} style={{ padding: '0.25rem 0.45rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
              {testResult && (
                <div style={{ padding: '0.75rem', borderRadius: '6px', background: testResult.result === 'SUCCESS' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.825rem' }}>
                  <strong>[{testResult.result}]</strong> {testResult.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: DDL & Deploy */}
      {activeTab === 'deploy' && selectedSessionId && (
        <div className="grid-2" style={{ gap: '1.5rem' }}>
          <div className="glass-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{locale === 'ko' ? 'DDL 자동 생성 및 미리보기' : 'Generate DDL'}</h3>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', marginBottom: '1rem' }}>
              <select className="form-control" value={selectedConnIdForDeploy} onChange={e => setSelectedConnIdForDeploy(e.target.value)}>
                {connections.map(c => (
                  <option key={c.connectionId} value={c.connectionId}>
                    {c.connectionName} ({c.dbType})
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleGenerateDdl} style={{ minWidth: '120px', fontWeight: 600 }}>
                {locale === 'ko' ? 'DDL 생성' : 'Generate'}
              </button>
            </div>

            <textarea
              className="form-control"
              style={{ height: '300px', fontFamily: 'monospace', fontSize: '0.825rem', background: '#0f172a', color: '#38bdf8', border: '1px solid rgba(255,255,255,0.1)' }}
              value={generatedDdl}
              onChange={e => setGeneratedDdl(e.target.value)}
              placeholder="CREATE TABLE SQL DDL..."
            />

            <button
              className="btn btn-primary"
              onClick={handleDeployDdl}
              disabled={loading || !generatedDdl}
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
            >
              <Play size={18} /> {loading ? (locale === 'ko' ? '실행 중...' : 'Deploying...') : (locale === 'ko' ? '타겟 DB에 DDL 실행 (DB 반영)' : 'Deploy DDL to DB')}
            </button>
          </div>

          <div className="glass-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{locale === 'ko' ? 'DB 반영 실행 이력 로그' : 'Deployment Logs'}</h3>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '420px', overflowY: 'auto' }}>
              {deployLogs.map(logItem => (
                <div
                  key={logItem.deployLogId}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    background: logItem.resultStatus === 'SUCCESS' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span className={`badge ${logItem.resultStatus === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                      {logItem.resultStatus}
                    </span>
                    <span style={{ color: '#64748b' }}>{new Date(logItem.executedAt).toLocaleString()}</span>
                  </div>
                  <div style={{ color: '#94a3b8' }}>Target: {logItem.connectionName || 'DB Connection'}</div>
                  <div style={{ color: '#e2e8f0', marginTop: '0.2rem' }}>{logItem.errorMessage}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
