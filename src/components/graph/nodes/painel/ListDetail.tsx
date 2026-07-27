import React, { useRef, useState } from 'react';
import { useListDetail } from '@/hooks/useListDetail';
import { InlineNameEditor } from './InlineNameEditor';
import { AppNode, ListNodeData } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import { useQueryClient } from '@tanstack/react-query';
import { GraphApiResponse } from '@/hooks/useClickUpData';

export function ListDetail({ node }: { node: AppNode }) {
  const list = node.data as ListNodeData;
  const { toggleDevMode, isSyncingDevMode, spaceId } = useGraphStore();
  const isDev = !!list.isDev;
  const inputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const graphData = queryClient.getQueryData<GraphApiResponse>(["clickup-graph", spaceId]);
  const tasks = graphData?.listTasksMap[list.listId] || [];

  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingChecked, setPendingChecked] = useState(false);

  const handleToggleClick = () => {
    if (isSyncingDevMode) return;
    setPendingChecked(!isDev);
    setIsConfirming(true);
  };

  const handleConfirm = async () => {
    setIsConfirming(false);
    await toggleDevMode(list.listId, tasks, pendingChecked, queryClient);
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  const {
    localName,
    setLocalName,
    isSaving,
    handleListKeyDown,
  } = useListDetail(node);

  return (
    <>
      <div
        className="detail-badge"
        style={{
          background: list.color + '22',
          color: list.color,
          borderColor: list.color + '55',
        }}
      >
        LIST
      </div>

      <InlineNameEditor
        inputRef={inputRef}
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onKeyDown={handleListKeyDown}
        placeholder="Nome da lista..."
        disabled={isSaving}
        isSaving={isSaving}
      />

      <div className="detail-section">
        <div className="detail-row">
          <span className="detail-key">Gerenciador Dev</span>
          <div className="dev-mode-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isConfirming ? (
              <div className="dev-confirm-overlay">
                <span className="detail-key" style={{ color: '#a78bfa', fontSize: '10px' }}>
                  {pendingChecked ? 'Ativar?' : 'Desativar?'}
                </span>
                <button className="btn-confirm-yes" onClick={handleConfirm}>Sim</button>
                <button className="btn-confirm-no" onClick={handleCancel}>Não</button>
              </div>
            ) : (
              <div 
                className={`premium-switch ${isDev ? 'active' : ''} ${isSyncingDevMode ? 'syncing' : ''}`}
                onClick={handleToggleClick}
                title={isSyncingDevMode ? 'Sincronizando com ClickUp...' : (isDev ? 'Desativar Dev Mode' : 'Ativar Dev Mode')}
              >
                <div className="premium-switch-handle" />
              </div>
            )}
            
            <span className="detail-key" style={{ fontSize: isDev ? '16px':'11px' , fontWeight: 600, color: isDev ? '#a78bfa' : 'var(--text-3)' }}>
              {isSyncingDevMode ? 'Sincronizando...' : (isDev ? '⚡' : 'Modo Dev')}
            </span>
          </div>
        </div>
        <div className="detail-row">
          <span className="detail-key">Tarefas</span>
          <span className="detail-value">{list.taskCount}</span>
        </div>
        {list.primaryQuarter && (
          <div className="detail-row">
            <span className="detail-key">Trimestre</span>
            <span className="detail-value" style={{ color: list.color }}>{list.primaryQuarter}</span>
          </div>
        )}
      </div>

      <p className="detail-hint">→ Pressione <kbd>Tab</kbd> para criar uma task</p>
    </>
  );
}
