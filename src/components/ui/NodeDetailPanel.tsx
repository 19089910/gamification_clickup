'use client';

import React from 'react';
import { useGraphStore } from '@/store/graphStore';
import { TaskNodeData, ListNodeData, FolderNodeData, SpaceNodeData } from '@/types/graph';

function formatDate(timestamp: string | null): string {
  if (!timestamp) return '—';
  const ms = Number(timestamp);
  const date = isNaN(ms) ? new Date(timestamp) : new Date(ms);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function NodeDetailPanel() {
  const { selectedNode, isSidebarOpen, setSidebarOpen } = useGraphStore();

  if (!isSidebarOpen || !selectedNode) return null;

  const { type, data } = selectedNode;

  return (
    <aside className="detail-panel">
      <button
        className="detail-close"
        onClick={() => setSidebarOpen(false)}
        aria-label="Close panel"
      >
        ✕
      </button>

      {type === 'space' && (
        <>
          <div className="detail-badge space-badge-lg">SPACE</div>
          <h2 className="detail-title">{(data as SpaceNodeData).label}</h2>
          <p className="detail-meta">ID: {(data as SpaceNodeData).spaceId}</p>
        </>
      )}

      {type === 'folder' && (
        <>
          <div className="detail-badge folder-badge-lg">FOLDER</div>
          <h2 className="detail-title">{(data as FolderNodeData).label}</h2>
          <p className="detail-meta">{(data as FolderNodeData).taskCount} tarefas</p>
        </>
      )}

      {type === 'list' && (
        <>
          <div
            className="detail-badge"
            style={{
              background: (data as ListNodeData).color + '22',
              color: (data as ListNodeData).color,
              borderColor: (data as ListNodeData).color + '55',
            }}
          >
            LIST
          </div>
          <h2 className="detail-title">{(data as ListNodeData).label}</h2>
          <p className="detail-meta">{(data as ListNodeData).taskCount} tarefas nesta lista</p>
        </>
      )}

      {type === 'task' && (() => {
        const task = data as TaskNodeData;
        return (
          <>
            <div
              className="detail-badge"
              style={{
                background: task.statusColor + '22',
                color: task.statusColor,
                borderColor: task.statusColor + '55',
              }}
            >
              {task.status.toUpperCase()}
            </div>
            <h2 className="detail-title">{task.label}</h2>

            <div className="detail-section">
              {task.priority && (
                <div className="detail-row">
                  <span className="detail-key">Prioridade</span>
                  <span
                    className="detail-value"
                    style={{ color: task.priorityColor ?? '#aaa' }}
                  >
                    {task.priority}
                  </span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-key">Prazo</span>
                <span className="detail-value">{formatDate(task.dueDate)}</span>
              </div>
              {task.assignees.length > 0 && (
                <div className="detail-row">
                  <span className="detail-key">Responsáveis</span>
                  <span className="detail-value">{task.assignees.join(', ')}</span>
                </div>
              )}
            </div>

            {task.tags.length > 0 && (
              <div className="detail-tags">
                {task.tags.map((tag) => (
                  <span
                    key={tag.name}
                    className="task-tag"
                    style={{ background: tag.bg, color: tag.fg }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-cta"
            >
              Abrir no ClickUp ↗
            </a>
          </>
        );
      })()}
    </aside>
  );
}
