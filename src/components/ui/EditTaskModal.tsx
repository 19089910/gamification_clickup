"use client";

import React, { useState, useEffect } from "react";
import { useGraphStore } from "@/store/graphStore";
import { useQueryClient } from "@tanstack/react-query";
import { GraphApiResponse } from "@/hooks/useClickUpData";

export default function EditTaskModal() {
  const { editTaskModal, setEditTaskModal, updateTask } = useGraphStore();
  const [name, setName] = useState("");
  const [quarter, setQuarter] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editTaskModal.isOpen) {
      setName(editTaskModal.name);
      setQuarter(editTaskModal.quarter);
    }
  }, [editTaskModal.isOpen, editTaskModal.name, editTaskModal.quarter]);

  if (!editTaskModal.isOpen) return null;

  const handleSave = async () => {
    try {
      const updates: any = {};
      if (name !== editTaskModal.name) updates.name = name;
      if (quarter !== editTaskModal.quarter) updates.quarter = quarter;

      if (Object.keys(updates).length > 0) {
        const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
        const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

        try {
          // 1. Optimistic Update
          queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
            if (!oldData) return oldData;
            const newListTasksMap = { ...oldData.listTasksMap };
            let taskFound = false;
            for (const lid in newListTasksMap) {
              const idx = newListTasksMap[lid].findIndex(t => t.id === editTaskModal.taskId);
              if (idx !== -1) {
                newListTasksMap[lid][idx] = { ...newListTasksMap[lid][idx], ...(updates.name ? { name: updates.name } : {}) };
                taskFound = true; break;
              }
            }
            return taskFound ? { ...oldData, listTasksMap: newListTasksMap } : oldData;
          });

          // 2. API Call
          await updateTask(editTaskModal.taskId, updates);
        } catch (error) {
          console.error("Save failed:", error);
          // 3. Rollback
          if (previousData) {
            queryClient.setQueryData(queryKey, previousData);
          }
          // 4. Recovery
          queryClient.invalidateQueries({ queryKey: ["clickup-graph"] });
          alert("Falha ao salvar alterações - Revertendo.");
        }
      }
      
      setEditTaskModal({ isOpen: false });
    } catch (error) {
      console.error("Save failed:", error);
      alert("Falha ao salvar alterações");
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setEditTaskModal({ isOpen: false })}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2 className="modal-title">Editar Task</h2>
          <button className="modal-close" onClick={() => setEditTaskModal({ isOpen: false })}>
            &times;
          </button>
        </header>

        <div className="modal-body">
          <div className="form-group">
            <label>Nome da Task</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da task"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Trimestre</label>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="btn-secondary" onClick={() => setEditTaskModal({ isOpen: false })}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Salvar Alterações
          </button>
        </footer>
      </div>
    </div>
  );
}
