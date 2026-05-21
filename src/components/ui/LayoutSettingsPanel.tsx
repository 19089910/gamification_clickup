"use client";
import React, { useState } from 'react';
import { useGraphStore, LayoutSettings } from '@/store/graphStore';

export default function LayoutSettingsPanel() {
  const { layoutSettings, updateLayoutSettings } = useGraphStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleUpdate = (updates: Partial<LayoutSettings>) => {
    updateLayoutSettings(updates);
  };

  const handleNodeTypeHeight = (type: keyof LayoutSettings['nodeHeightsByType'], value: number) => {
    updateLayoutSettings({
      nodeHeightsByType: {
        ...layoutSettings.nodeHeightsByType,
        [type]: value,
      },
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="layout-settings-trigger"
        title="Configurações de Layout"
      >
        <span>⚙️</span>
      </button>
    );
  }

  return (
    <div className="layout-settings-panel">
      <div className="layout-settings-header">
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>Ajustes de Layout</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '16px' }}
        >
          ✕
        </button>
      </div>

      <div className="layout-settings-content custom-scrollbar">
        {/* Dagre Settings */}
        <section className="settings-section">
          <h4 className="settings-section-title">Espaçamento</h4>
          <div className="settings-group">
            <div className="settings-item">
              <div className="settings-label-row">
                <label>Entre Nós (Vertical)</label>
                <span className="settings-value">{layoutSettings.nodesep}px</span>
              </div>
              <input
                type="range" min="0" max="200" step="5"
                value={layoutSettings.nodesep}
                onChange={(e) => handleUpdate({ nodesep: parseInt(e.target.value) })}
                className="settings-range"
              />
            </div>

            <div className="settings-item">
              <div className="settings-label-row">
                <label>Entre Colunas (Rank)</label>
                <span className="settings-value">{layoutSettings.ranksep}px</span>
              </div>
              <input
                type="range" min="0" max="300" step="10"
                value={layoutSettings.ranksep}
                onChange={(e) => handleUpdate({ ranksep: parseInt(e.target.value) })}
                className="settings-range"
              />
            </div>
          </div>
        </section>

        {/* Global Node Settings */}
        <section className="settings-section">
          <h4 className="settings-section-title">Dimensões Base</h4>
          <div className="settings-group">
            <div className="settings-item">
              <div className="settings-label-row">
                <label>Largura do Nó</label>
                <span className="settings-value">{layoutSettings.nodeWidth}px</span>
              </div>
              <input
                type="range" min="100" max="400" step="10"
                value={layoutSettings.nodeWidth}
                onChange={(e) => handleUpdate({ nodeWidth: parseInt(e.target.value) })}
                className="settings-range"
              />
            </div>
          </div>
        </section>

        {/* Node Specific Heights */}
        <section className="settings-section">
          <h4 className="settings-section-title">Alturas por Tipo</h4>
          <div className="settings-group">
            {[
              { id: 'space', label: 'Space' },
              { id: 'folder', label: 'Folder' },
              { id: 'list', label: 'List' },
              { id: 'task', label: 'Task' },
              { id: 'subtask', label: 'SubTask' }
            ].map((type) => (
              <div key={type.id} className="settings-item">
                <div className="settings-label-row">
                  <label>{type.label}</label>
                  <span className="settings-value">{layoutSettings.nodeHeightsByType[type.id as keyof LayoutSettings['nodeHeightsByType']]}px</span>
                </div>
                <input
                  type="range" min="5" max="150" step="5"
                  value={layoutSettings.nodeHeightsByType[type.id as keyof LayoutSettings['nodeHeightsByType']]}
                  onChange={(e) => handleNodeTypeHeight(type.id as any, parseInt(e.target.value))}
                  className="settings-range"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Margins */}
        <section className="settings-section">
          <h4 className="settings-section-title">Margens Internas</h4>
          <div className="settings-input-grid">
            <div className="settings-item">
              <label style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>Margin X</label>
              <input
                type="number"
                value={layoutSettings.marginx}
                onChange={(e) => handleUpdate({ marginx: parseInt(e.target.value) })}
                className="settings-number-input"
              />
            </div>
            <div className="settings-item">
              <label style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>Margin Y</label>
              <input
                type="number"
                value={layoutSettings.marginy}
                onChange={(e) => handleUpdate({ marginy: parseInt(e.target.value) })}
                className="settings-number-input"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="layout-settings-footer">
        Ajustes aplicados em tempo real
      </div>
    </div>
  );
}
