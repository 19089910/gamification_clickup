'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { TaskNodeData, ListNodeData, FolderNodeData, SpaceNodeData } from '@/types/graph';

function formatDate(timestamp: string | null): string {
  if (!timestamp) return '—';
  const ms = Number(timestamp);
  const date = isNaN(ms) ? new Date(timestamp) : new Date(ms);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Extracted to module level — prevents remounting on parent re-renders ────
interface InlineNameEditorProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled: boolean;
  isSaving: boolean;
}

function InlineNameEditor({
  inputRef,
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  isSaving,
}: InlineNameEditorProps) {
  return (
    <>
      <div className="detail-inline-edit">
        <input
          ref={inputRef}
          className="detail-title-input"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        {isSaving && <span className="detail-saving">💾</span>}
      </div>
      <p className="detail-hint-sm">↵ Enter para salvar</p>
    </>
  );
}

export default function NodeDetailPanel() {
  const { selectedNode, isSidebarOpen, setSidebarOpen, updateTask, updateList, selectedQuarter } = useGraphStore();
  const queryClient = useQueryClient();

  // Shared edit state
  const [localName, setLocalName] = useState('');
  const [localQuarter, setLocalQuarter] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local state whenever the selected node changes
  useEffect(() => {
    if (!selectedNode) return;

    if (selectedNode.type === 'task') {
      const task = selectedNode.data as TaskNodeData;
      setLocalName(task.label as string);
      // Read the quarter stored from custom_fields in the transformer — never fall back to hardcoded 'Q1'
      const resolvedQuarter = task.quarter || selectedQuarter || '';
      setLocalQuarter(resolvedQuarter);
    }

    if (selectedNode.type === 'list') {
      const list = selectedNode.data as ListNodeData;
      setLocalName(list.label as string);
    }
  }, [selectedNode, selectedQuarter]);

  if (!isSidebarOpen || !selectedNode) return null;

  const { type, data } = selectedNode;

  // ─── Task save ───────────────────────────────────────────
  const handleSaveTask = async () => {
    if (selectedNode.type !== 'task') return;
    const task = selectedNode.data as TaskNodeData;
    if (!localName.trim()) return;

    setIsSaving(true);
    try {
      await updateTask(task.taskId as string, { name: localName, quarter: localQuarter });
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTaskKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); await handleSaveTask(); }
    if (e.key === 'Escape') setSidebarOpen(false);
  };

  // ─── List save ───────────────────────────────────────────
  const handleSaveList = async () => {
    if (selectedNode.type !== 'list') return;
    if (!localName.trim()) return;
    const list = selectedNode.data as ListNodeData;
    setIsSaving(true);
    try {
      await updateList(list.listId as string, { name: localName });
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } catch (err) {
      console.error('Failed to rename list:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleListKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); await handleSaveList(); }
    if (e.key === 'Escape') setSidebarOpen(false);
  };

  const handleQuarterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQ = e.target.value;
    setLocalQuarter(newQ);
    const task = selectedNode.data as TaskNodeData;
    setIsSaving(true);
    try {
      await updateTask(task.taskId as string, { name: localName, quarter: newQ });
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } catch (err) {
      console.error('Failed to update task quarter:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className="detail-panel">
      <button
        className="detail-close"
        onClick={() => setSidebarOpen(false)}
        aria-label="Close panel"
      >
        ✕
      </button>

      {/* ── SPACE ── */}
      {type === 'space' && (
        <>
          <div className="detail-badge space-badge-lg">SPACE</div>
          <h2 className="detail-title">{(data as SpaceNodeData).label}</h2>
          <p className="detail-meta">ID: {(data as SpaceNodeData).spaceId}</p>
        </>
      )}

      {/* ── FOLDER ── */}
      {type === 'folder' && (
        <>
          <div className="detail-badge folder-badge-lg">FOLDER</div>
          <h2 className="detail-title">{(data as FolderNodeData).label}</h2>
          <p className="detail-meta">{(data as FolderNodeData).taskCount} tarefas</p>
          <p className="detail-hint">→ Pressione <kbd>Tab</kbd> para criar uma lista</p>
        </>
      )}

      {/* ── LIST ── */}
      {type === 'list' && (() => {
        const list = data as ListNodeData;
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
      })()}

      {/* ── TASK ── */}
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

            <InlineNameEditor
              inputRef={inputRef}
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onKeyDown={handleTaskKeyDown}
              placeholder="Nome da task..."
              disabled={isSaving}
              isSaving={isSaving}
            />

            {/* Quarter selector */}
            <div className="detail-section">
              <div className="detail-row">
                <span className="detail-key">Trimestre</span>
                <select
                  className="detail-quarter-select"
                  value={localQuarter}
                  onChange={handleQuarterChange}
                  disabled={isSaving}
                >
                  {!localQuarter && (
                    <option value="" disabled>— sem trimestre —</option>
                  )}
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
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
      })()}
    </aside>
  );
}
