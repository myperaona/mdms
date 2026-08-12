import React, { useState, useEffect, useRef } from 'react';

export interface ErdEntityItem {
  entityId?: string;
  tableDesignId: string;
  tableLogicName: string;
  tablePhysicalName: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  columns: Array<{
    columnId: string;
    columnLogicName: string;
    columnPhysicalName: string;
    dataType: string;
    pkYn?: string;
    fkYn?: string;
  }>;
}

export interface ErdRelationItem {
  relationId?: string;
  fromTableId: string;
  toTableId: string;
  relationType?: string;
  cardinality?: string;
}

interface ErdCanvasProps {
  entities: ErdEntityItem[];
  relations: ErdRelationItem[];
  onSavePositions: (updatedEntities: ErdEntityItem[]) => void;
  readOnly?: boolean;
}

export default function ErdCanvas({ entities: initialEntities, relations, onSavePositions, readOnly = false }: ErdCanvasProps) {
  const [entities, setEntities] = useState<ErdEntityItem[]>(initialEntities);
  const [draggingEntityId, setDraggingEntityId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setEntities(initialEntities);
  }, [initialEntities]);

  const handleMouseDown = (e: React.MouseEvent, tableDesignId: string) => {
    if (readOnly) return;
    const targetEntity = entities.find(e => e.tableDesignId === tableDesignId);
    if (!targetEntity) return;

    setDraggingEntityId(tableDesignId);
    setDragOffset({
      x: e.clientX / zoom - targetEntity.positionX,
      y: e.clientY / zoom - targetEntity.positionY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingEntityId || readOnly) return;

    const newX = Math.max(10, Math.round(e.clientX / zoom - dragOffset.x));
    const newY = Math.max(10, Math.round(e.clientY / zoom - dragOffset.y));

    setEntities(prev =>
      prev.map(ent =>
        ent.tableDesignId === draggingEntityId
          ? { ...ent, positionX: newX, positionY: newY }
          : ent
      )
    );
  };

  const handleMouseUp = () => {
    if (draggingEntityId && !readOnly) {
      onSavePositions(entities);
    }
    setDraggingEntityId(null);
  };

  // Calculate connection lines between tables
  const renderRelations = () => {
    return relations.map((rel, idx) => {
      const fromEnt = entities.find(e => e.tableDesignId === rel.fromTableId);
      const toEnt = entities.find(e => e.tableDesignId === rel.toTableId);

      if (!fromEnt || !toEnt) return null;

      const fromX = fromEnt.positionX + fromEnt.width / 2;
      const fromY = fromEnt.positionY + fromEnt.height / 2;
      const toX = toEnt.positionX + toEnt.width / 2;
      const toY = toEnt.positionY + toEnt.height / 2;

      // Draw bezier curve line
      const dx = toX - fromX;
      const controlX1 = fromX + dx * 0.5;
      const controlY1 = fromY;
      const controlX2 = fromX + dx * 0.5;
      const controlY2 = toY;

      return (
        <g key={rel.relationId || idx}>
          <path
            d={`M ${fromX} ${fromY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${toX} ${toY}`}
            fill="none"
            stroke="var(--color-primary, #6366f1)"
            strokeWidth="2.5"
            strokeDasharray={rel.relationType === 'NON_IDENTIFYING' ? '5,5' : 'none'}
          />
          {/* Cardinality Badge */}
          <rect
            x={(fromX + toX) / 2 - 20}
            y={(fromY + toY) / 2 - 12}
            width="40"
            height="22"
            rx="4"
            fill="var(--bg-card, #1e293b)"
            stroke="var(--color-primary, #6366f1)"
          />
          <text
            x={(fromX + toX) / 2}
            y={(fromY + toY) / 2 + 3}
            fill="#e2e8f0"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            {rel.cardinality || '1:N'}
          </text>
        </g>
      );
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '500px',
        flex: 1,
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        cursor: draggingEntityId ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* ERD Control Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          display: 'flex',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '6px 12px',
          borderRadius: '8px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <button className="btn btn-sm btn-secondary" onClick={() => setZoom(prev => Math.min(prev + 0.1, 1.8))}>+</button>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8', alignSelf: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button className="btn btn-sm btn-secondary" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}>-</button>
        <button className="btn btn-sm btn-secondary" onClick={() => setZoom(1)}>100%</button>
      </div>

      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: '100%', height: '100%' }}>
        {/* SVG Relations Overlay */}
        <svg
          ref={svgRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '3000px',
            height: '3000px',
            pointerEvents: 'none',
          }}
        >
          {renderRelations()}
        </svg>

        {/* Entity Card Containers */}
        {entities.map(ent => (
          <div
            key={ent.tableDesignId}
            onMouseDown={e => handleMouseDown(e, ent.tableDesignId)}
            style={{
              position: 'absolute',
              left: `${ent.positionX}px`,
              top: `${ent.positionY}px`,
              width: `${ent.width || 240}px`,
              minHeight: '140px',
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: draggingEntityId === ent.tableDesignId ? 5 : 2,
              cursor: readOnly ? 'default' : 'grab',
            }}
          >
            {/* Table Header */}
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderBottom: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '8px 12px',
                borderTopLeftRadius: '7px',
                borderTopRightRadius: '7px',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#f8fafc' }}>
                {ent.tablePhysicalName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {ent.tableLogicName}
              </div>
            </div>

            {/* Column Items */}
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {ent.columns && ent.columns.length > 0 ? (
                ent.columns.map(col => (
                  <div key={col.columnId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {col.pkYn === 'Y' && (
                        <span style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold' }}>PK</span>
                      )}
                      {col.fkYn === 'Y' && (
                        <span style={{ fontSize: '0.65rem', background: '#3b82f6', color: '#fff', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold' }}>FK</span>
                      )}
                      <span style={{ color: col.pkYn === 'Y' ? '#f1f5f9' : '#cbd5e1', fontWeight: col.pkYn === 'Y' ? 'bold' : 'normal' }}>
                        {col.columnPhysicalName}
                      </span>
                    </div>
                    <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      {col.dataType}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.7rem' }}>컬럼 없음</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
