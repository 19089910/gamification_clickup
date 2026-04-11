'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';

export default function QuarterPickerModal() {
  const { quarterPickerModal, setQuarterPickerModal, createList } = useGraphStore();
  const queryClient = useQueryClient();
  const [selectedQ, setSelectedQ] = useState('Q2');
  const [isSaving, setIsSaving] = useState(false);

  if (!quarterPickerModal.isOpen) return null;

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const result = await createList(
        quarterPickerModal.folderId,
        quarterPickerModal.listName,
        selectedQ,
      );
      if (result?.taskWarning) {
        console.warn(result.taskWarning);
      }
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } catch (err) {
      console.error('Error creating list:', err);
    } finally {
      setIsSaving(false);
      setQuarterPickerModal({ isOpen: false, listName: '', folderId: '', tempNodeId: '' });
    }
  };

  const handleCancel = () => {
    setQuarterPickerModal({ isOpen: false, listName: '', folderId: '', tempNodeId: '' });
  };

  return (
    <div className="qpicker-overlay" onClick={handleCancel}>
      <div className="qpicker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qpicker-header">
          <span className="qpicker-icon">📋</span>
          <div>
            <h3 className="qpicker-title">Nova Lista</h3>
            <p className="qpicker-name">"{quarterPickerModal.listName}"</p>
          </div>
        </div>

        <p className="qpicker-label">Selecione o trimestre:</p>

        <div className="qpicker-options">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
            <button
              key={q}
              className={`qpicker-option ${selectedQ === q ? 'active' : ''}`}
              onClick={() => setSelectedQ(q)}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="qpicker-actions">
          <button className="qpicker-cancel" onClick={handleCancel} disabled={isSaving}>
            Cancelar
          </button>
          <button className="qpicker-confirm" onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? 'Criando...' : 'Criar Lista ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}
