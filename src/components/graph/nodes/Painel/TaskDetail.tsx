import React, { useRef } from 'react';
import { useTaskDetail } from './hooks/useTaskDetail';
import { InlineNameEditor } from './InlineNameEditor';
import { TaskNodeData } from '@/types/graph';
import { STATUS_CONFIG, getStatusFromConfig } from '@/lib/clickup';
import { SEASON_CONFIG, getSeasonFromConfig } from '@/config/quarters';

function formatDate(timestamp: string | null): string {
  if (!timestamp) return '—';
  const ms = Number(timestamp);
  const date = isNaN(ms) ? new Date(timestamp) : new Date(ms);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function TaskDetail({ node }: { node: any }) {
  const task = node.data as TaskNodeData;
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    localName,
    setLocalName,
    localQuarter,
    localStatus,
    isSaving,
    handleTaskKeyDown,
    handleQuarterChange,
    handleStatusChange,
  } = useTaskDetail(node);

  return (
    <>
      <div className="detail-status-container">
        {(() => {
          const currentConfig = getStatusFromConfig(localStatus);
          const displayColor = currentConfig?.color || task.statusColor;

          return (
            <select
              className="detail-status-select unified"
              value={localStatus}
              onChange={handleStatusChange}
              disabled={isSaving}
              style={{
                background: displayColor + '22',
                color: displayColor,
                borderColor: displayColor + '55',
              }}
            >
              {!currentConfig && localStatus && (
                <option value={localStatus}>{localStatus.toUpperCase()}</option>
              )}

              {STATUS_CONFIG.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.statuses.map((s) => (
                    <option key={s.id} value={s.id} style={{ color: s.color, backgroundColor: '#0d0d0d' }}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          );
        })()}
      </div>

      <InlineNameEditor
        inputRef={inputRef}
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onKeyDown={handleTaskKeyDown}
        placeholder="Nome da task..."
        disabled={isSaving}
        isSaving={isSaving}
      />

      <div className="detail-section">
        <div className="detail-row">
          <span className="detail-key">Trimestre</span>
          {(() => {
            const currentConfig = getSeasonFromConfig(localQuarter);
            const displayColor = currentConfig?.color ?? '#000000';

            return (
              <select
                className="detail-quarter-select"
                value={localQuarter ?? ''}
                onChange={handleQuarterChange}
                disabled={isSaving}
                style={{
                  background: displayColor + '22',
                  color: displayColor,
                  borderColor: displayColor + '55',
                }}
              >
                {!currentConfig && (
                  <option value="" disabled>
                    {localQuarter ? localQuarter.toUpperCase() : '— sem trimestre —'}
                  </option>
                )}

                {SEASON_CONFIG.map((s) => (
                  <option key={s.id} value={s.id} style={{ color: s.color, backgroundColor: '#0d0d0d' }}>
                    {s.label}
                  </option>
                ))}
              </select>
            );
          })()}
        </div>
        {task.priority && (
          <div className="detail-row">
            <span className="detail-key">Prioridade</span>
            <span className="detail-value" style={{ color: task.priorityColor ?? '#aaa' }}>
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
}
