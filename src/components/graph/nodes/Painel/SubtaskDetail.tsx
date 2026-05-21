import React, { useState, useEffect, useRef } from 'react';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { STATUS_CONFIG, getStatusFromConfig } from '@/config/status';
import { useSubtaskDetail } from '@/hooks/useSubtaskDetail';
import { useGraphStore } from '@/store/graphStore';
import { useQueryClient } from '@tanstack/react-query';
import { GraphApiResponse } from '@/hooks/useClickUpData';
import { InlineNameEditor } from './InlineNameEditor';

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
  isNew?: boolean; // Identificador para itens novos
}

export function SubtaskDetail({ node }: { node: AppNode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const subtask = node.data as SubtaskNodeData;
  const {
    localName,
    setLocalName,
    localStatus,
    isSaving,
    handleTaskKeyDown,
    handleStatusChange,
  } = useSubtaskDetail(node);

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
  const [newItemName, setNewItemName] = useState('');

  // Sincroniza o estado local caso as informações do grafo mudem em background
  useEffect(() => {
    setItems(getInitialChecklistItems());
    setPendingItems([]);
  }, [subtask.checklists]);

  // isDirty agora avalia modificações e inclusões perfeitamente
  const isDirty = pendingItems.length > 0;

  const handleAddItemLocal = () => {
    if (!newItemName.trim()) return;

    // Tentamos resgatar o ID da primeira checklist existente na task. 
    // Se não houver, enviamos vazio para que seu backend saiba que precisa criar uma nova checklist pai.
    const defaultChecklistId = subtask.checklists?.[0]?.id || '';

    const newItem: ChecklistItem = {
      id: `temp-item-${Date.now()}`,
      name: newItemName.trim(),
      resolved: false,
      checklistId: defaultChecklistId,
      isNew: true
    };

    // 1. Atualiza a lista visual da tela
    setItems((prev) => [...prev, newItem]);

    // 2. Coloca o item novo na fila de pendentes para que o 'isDirty' ative o botão de salvar
    setPendingItems((prev) => [...prev, newItem]);

    // 3. Limpa o input de texto
    setNewItemName('');
  };

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
      // Enviamos a lista de pendentes contendo atualizações E novos itens criados localmente
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

      // Se a chamada de rede deu certo, limpamos a fila pendente e invalidamos as queries
      // para puxar os IDs reais que o ClickUp gerou para as novas linhas.
      setPendingItems([]);
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });

    } catch (err) {
      console.error(err);
      alert('Erro ao salvar o checklist. Tente novamente.');
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
          <span className="tracked-time-label">Tempo Rastreado</span>
          <span className="tracked-time-value">⏱ {formatTrackedTime(subtask.time_spent as number)}</span>
        </div>
        <button className="tracked-time-play" onClick={() => { }}>▶</button>
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

      <div className="detail-section" style={{ borderTop: '1px solid #222', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 className="detail-key" style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Checklist
        </h3>

        {/* CONTENER COM SCROLL: Adicionamos a trava de altura e overflow aqui */}
        <div
          className="checklist-scroll-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '180px', // Limita a altura para até ~5 ou 6 itens visíveis ao mesmo tempo
            overflowY: 'auto',   // Ativa o scroll apenas vertical quando necessário
            paddingRight: '4px'  // Espaço para a barra de rolagem não cobrir o texto
          }}
        >
          {/* Lista de itens existentes */}
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
        </div>

        {/* Campo para adicionar novo item na lista local (Fica fixo abaixo do scroll) */}
        <div className="add-checklist-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <span style={{ color: '#555', fontSize: '18px', paddingLeft: '2px', cursor: 'default' }}>+</span>
          <input
            type="text"
            placeholder="Adicionar novo item..."
            disabled={isSavingChecklist}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newItemName.trim()) {
                handleAddItemLocal();
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #222',
              color: '#fff',
              fontSize: '13px',
              padding: '4px',
              flex: 1,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderBottom = '1px solid #5f55ee')}
            onBlur={(e) => (e.target.style.borderBottom = '1px solid #222')}
          />
          {newItemName.trim() && (
            <button
              onClick={handleAddItemLocal}
              style={{ background: '#5f55ee', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
            >
              Add
            </button>
          )}
        </div>

        {/* Botão de Salvar alterações */}
        {isDirty && (
          <button
            className="detail-cta"
            onClick={handleSaveChecklist}
            disabled={isSavingChecklist}
            style={{ marginTop: '8px', cursor: 'pointer', width: '100%' }}
          >
            {isSavingChecklist ? 'Salvando...' : 'Salvar checklist'}
          </button>
        )}
      </div>

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