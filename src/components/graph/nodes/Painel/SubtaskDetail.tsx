import React, { useState, useEffect } from 'react';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { STATUS_CONFIG, getStatusFromConfig } from '@/config/status';
import { useSubtaskDetail } from '@/hooks/useSubtaskDetail';
import { useGraphStore } from '@/store/graphStore';
import { useQueryClient } from '@tanstack/react-query';
import { GraphApiResponse } from '@/hooks/useClickUpData';

function formatTrackedTime(ms: number | undefined): string {
  if (!ms) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

interface ChecklistItem {
  id: string;
  name: string;
  resolved: boolean;
  checklistId: string;
}

export function SubtaskDetail({ node }: { node: AppNode }) {
  const subtask = node.data as SubtaskNodeData;
  const { localStatus, isSaving, handleStatusChange } = useSubtaskDetail(node);
  const queryClient = useQueryClient();

  const getInitialChecklistItems = (): ChecklistItem[] => {
    return (subtask.checklists || []).flatMap(
      (checklist) =>
        checklist.items.map((item) => ({
          ...item,
          checklistId: checklist.id,
        }))
    );
  };

  const [items, setItems] = useState<ChecklistItem[]>(getInitialChecklistItems());
  const [pendingItems, setPendingItems] = useState<ChecklistItem[]>([]);
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);

  // Sync state if subtask checklists change in the background/props
  useEffect(() => {
    setItems(getInitialChecklistItems());
    setPendingItems([]);
  }, [subtask.checklists]);

  const isDirty = pendingItems.length > 0;

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, resolved: checked };
          setPendingItems((prevPending) => {
            const clean = prevPending.filter((p) => p.id !== itemId);
            return [...clean, updated];
          });
          return updated;
        }
        return item;
      })
    );
  };

  const handleNameChange = (itemId: string, name: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, name };
          setPendingItems((prevPending) => {
            const clean = prevPending.filter((p) => p.id !== itemId);
            return [...clean, updated];
          });
          return updated;
        }
        return item;
      })
    );
  };

  const handleSaveChecklist = async () => {
    setIsSavingChecklist(true);
    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];

    try {
      const res = await fetch(`/api/clickup/tasks/${subtask.taskId}/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: pendingItems }),
      });

      if (!res.ok) {
        throw new Error('Erro ao salvar o checklist');
      }

      // Optimistically update checklists in Zustand store
      useGraphStore.setState((state) => {
        const updatedFullNodes = state.fullNodes.map((n) => {
          if (n.id === `subtask-${subtask.taskId}`) {
            const updatedChecklists = (subtask.checklists || []).map((checklist) => {
              const updatedItems = checklist.items.map((item) => {
                const pending = pendingItems.find((p) => p.id === item.id);
                if (pending) {
                  return { ...item, name: pending.name, resolved: pending.resolved };
                }
                return item;
              });
              return { ...checklist, items: updatedItems };
            });
            return {
              ...n,
              data: {
                ...n.data,
                checklists: updatedChecklists,
              },
            } as AppNode;
          }
          return n;
        });
        const updatedSelectedNode = updatedFullNodes.find((n) => n.id === node.id) || null;
        return {
          fullNodes: updatedFullNodes,
          selectedNode: updatedSelectedNode,
        };
      });

      // Optimistically update checklists in React Query cache
      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        if (!oldData) return oldData;
        const newListTasksMap = { ...oldData.listTasksMap };
        let taskFound = false;

        for (const listId in newListTasksMap) {
          const taskIndex = newListTasksMap[listId].findIndex((t) => t.id === subtask.taskId);
          if (taskIndex !== -1) {
            const originalTask = newListTasksMap[listId][taskIndex];
            const updatedChecklists = (originalTask.checklists || []).map((checklist) => {
              const updatedItems = checklist.items.map((item) => {
                const pending = pendingItems.find((p) => p.id === item.id);
                if (pending) {
                  return { ...item, name: pending.name, resolved: pending.resolved };
                }
                return item;
              });
              return { ...checklist, items: updatedItems };
            });
            newListTasksMap[listId][taskIndex] = {
              ...originalTask,
              checklists: updatedChecklists,
            };
            taskFound = true;
            break;
          }
        }
        return taskFound ? { ...oldData, listTasksMap: newListTasksMap } : oldData;
      });

      setPendingItems([]);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar o checklist. Tente novamente.');
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSavingChecklist(false);
    }
  };

  return (
    <>
      <div className="detail-status-container">
        {(() => {
          const currentConfig = getStatusFromConfig(localStatus);
          const displayColor = currentConfig?.color || subtask.statusColor;

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
      <div className={`tracked-time-pill ${true ? 'active' : ''}`}>
        <div className="tracked-time-content">
          <span className="tracked-time-label">
            Tempo Rastreado
          </span>

          <span className="tracked-time-value">
            ⏱ {formatTrackedTime(subtask.time_spent as number)}
          </span>
        </div>
        <button
          className="tracked-time-play"
          onClick={() => {
            // start timer
          }}
        >
          ▶
        </button>
      </div>


      <style jsx>{`
  .tracked-time-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid #444;
    background: #111;
    font-size: 13px;
    color: #aaa;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.05);
  }

  .tracked-time-play {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    line-height: 1;
    transition: color 0.2s;
  }

  .tracked-time-play:hover {
    color: #fff;
  }
`}</style>
      <div className="detail-title-container" style={{ margin: '8px 0' }}>
        <h2 className="detail-title" style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
          {subtask.label}
        </h2>
      </div>



      {items.length > 0 && (
        <div className="detail-section" style={{ borderTop: '1px solid #222', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 className="detail-key" style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Checklist
          </h3>
          <div className="checklist-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((item) => (
              <div key={item.id} className="checklist-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={item.resolved}
                  disabled={isSavingChecklist}
                  onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#5f55ee',
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="text"
                  value={item.name}
                  disabled={isSavingChecklist}
                  onChange={(e) => handleNameChange(item.id, e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid transparent',
                    color: item.resolved ? '#555' : '#fff',
                    textDecoration: item.resolved ? 'line-through' : 'none',
                    fontSize: '13px',
                    padding: '2px 4px',
                    flex: 1,
                    transition: 'border-color 0.2s',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderBottom = '1px solid #5f55ee')}
                  onBlur={(e) => (e.target.style.borderBottom = '1px solid transparent')}
                />
              </div>
            ))}
          </div>

          {isDirty && (
            <button
              className="detail-cta"
              onClick={handleSaveChecklist}
              disabled={isSavingChecklist}
              style={{ marginTop: '16px', cursor: 'pointer', width: '100%' }}
            >
              {isSavingChecklist ? 'Salvando...' : 'Salvar checklist'}
            </button>
          )}
        </div>
      )}

      <a
        href={subtask.url as string}
        target="_blank"
        rel="noopener noreferrer"
        className="detail-cta"
        style={{ marginTop: 'auto', display: 'block', textAlign: 'center' }}
      >
        Abrir no ClickUp ↗
      </a>
    </>
  );
}
