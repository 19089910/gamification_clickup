import React, { useRef } from 'react';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { STATUS_CONFIG, getStatusFromConfig } from '@/config/status';
import { useSubtaskDetail } from '@/hooks/useSubtaskDetail';
import { InlineNameEditor } from './InlineNameEditor';

function formatTrackedTime(ms: number | undefined): string {
  if (!ms || ms <= 0) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  // Se tiver horas, mostra: Xh Ym
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  // Se tiver minutos mas menos de uma hora, mostra: Ym Zs (ou apenas Ym)
  if (totalMinutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  // Se for menos de um minuto, mostra os segundos purinhos! ex: 13s
  return `${seconds}s`;
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

    items,
    newItemName,
    setNewItemName,
    isSavingChecklist,
    isChecklistDirty,
    handleAddItemLocal,
    handleCheckboxChange,
    handleNameChange,
    handleSaveChecklist,

    isTimerActive,
    isSavingTimer,
    handleToggleTimer,
  } = useSubtaskDetail(node);

  return (
    <>
      {/* Seletor de Status superior */}
      <div className="detail-status-container">
        {(() => {
          const currentConfig = getStatusFromConfig(localStatus);
          const displayColor = currentConfig?.color || subtask.statusColor;

          return (
            <select
              className="detail-status-select"
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

      {/* Pill de Tempo Rastreado com classe condicional '.active' */}
      <div className={`tracked-time-pill ${isTimerActive ? 'active' : ''}`}>
        <div className="tracked-time-content">
          <span className="tracked-time-label">
            {isTimerActive ? '⏱ Rastreando Tempo...' : 'Tempo Rastreado'}
          </span>
          <span className="tracked-time-value">
            ⏱ {formatTrackedTime(subtask.time_spent as number)}
          </span>
        </div>

        <button
          className="tracked-time-play"
          onClick={handleToggleTimer}
          disabled={isSavingTimer}
          title={isTimerActive ? "Parar Cronômetro" : "Iniciar Cronômetro"}
        >
          {isTimerActive ? '■' : '▶'}
        </button>
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

      {/* Seção unificada de Checklist */}
      <div className="detail-checklist-section">
        <h3 className="detail-checklist-title">Checklist</h3>

        {/* Container com scroll controlado via CSS */}
        <div className="checklist-scroll-container">
          <div className="checklist-container">
            {items.map((item) => (
              <div key={item.id} className="checklist-item">
                <input
                  type="checkbox"
                  className="checklist-item-checkbox"
                  checked={item.resolved}
                  disabled={isSavingChecklist}
                  onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                />
                <input
                  type="text"
                  className={`checklist-item-input ${item.resolved ? 'resolved' : 'pending'}`}
                  value={item.name}
                  disabled={isSavingChecklist}
                  onChange={(e) => handleNameChange(item.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Input para criação de novas linhas locais */}
        <div className="add-checklist-item">
          <span className="add-checklist-icon">+</span>
          <input
            type="text"
            className="add-checklist-input"
            placeholder="Adicionar novo item..."
            disabled={isSavingChecklist}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItemLocal()}
          />
          {newItemName.trim() && (
            <button className="add-checklist-btn" onClick={handleAddItemLocal}>
              Add
            </button>
          )}
        </div>

        {/* Botão Salvar Condicional */}
        {isChecklistDirty && (
          <button
            className="detail-cta"
            onClick={handleSaveChecklist}
            disabled={isSavingChecklist}
          >
            {isSavingChecklist ? 'Salvando...' : 'Salvar checklist'}
          </button>
        )}
      </div>

      <a
        href={subtask.url as string}
        target="_blank"
        rel="noopener noreferrer"
        className="detail-cta open-clickup-anchor"
      >
        Abrir no ClickUp ↗
      </a>
    </>
  );
}