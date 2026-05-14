import React, { useRef } from 'react';
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
          <label className="dev-toggle">
            <input
              type="checkbox"
              checked={isDev}
              disabled={isSyncingDevMode}
              onChange={(e) => toggleDevMode(list.listId, tasks, e.target.checked)}
            />
            <span className="dev-toggle-label">
              {isSyncingDevMode ? '...' : (isDev ? '⚡' : 'Dev?')}
            </span>
          </label>
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
