"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClickUpTask } from "@/types/clickup";
import { STATUS_CONFIG } from "@/config/status";

interface CreateIssueModalProps {
  listId: string;
  epics: ClickUpTask[];
  milestoneId?: string;
  onClose: () => void;
}

interface ClickUpUser {
  id: number;
  username: string;
  initials: string;
  profilePicture: string;
  color: string;
}

export default function CreateIssueModal({
  listId,
  epics,
  milestoneId,
  onClose,
}: CreateIssueModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedEpicId, setSelectedEpicId] = useState("");
  
  // Fields for Step 2
  const [name, setName] = useState("");
  const [status, setStatus] = useState("planning");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");

  // Fetch members for assignee dropdown
  const { data: members } = useQuery<ClickUpUser[]>({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await fetch("/api/clickup/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create subtask
      const subRes = await fetch(`/api/clickup/tasks/${selectedEpicId}/subtask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status,
          assignee_ids: assigneeId ? [Number(assigneeId)] : [],
          due_date: dueDate || undefined,
        }),
      });

      if (!subRes.ok) throw new Error("Failed to create subtask");
      const newSubtask = (await subRes.json()) as ClickUpTask;

      // 2. Add dependency if milestone context exists
      if (milestoneId) {
        const depRes = await fetch(`/api/clickup/tasks/${newSubtask.id}/dependency`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dependsOnId: milestoneId,
            type: "waiting_on",
          }),
        });
        if (!depRes.ok) console.warn("Failed to create dependency linkage");
      }

      return newSubtask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dev-panel", listId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (selectedEpicId) setStep(2);
      return;
    }
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="issue-modal">
        <header className="modal-header">
          <h3>{milestoneId ? "Add Issue to Milestone" : "Create New Issue"}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          {step === 1 ? (
            <div className="step-content">
              <label className="field-label">Select Parent Epic</label>
              <div className="epic-list">
                {epics.map((epic) => (
                  <button
                    key={epic.id}
                    type="button"
                    className={`epic-opt ${selectedEpicId === epic.id ? "active" : ""}`}
                    onClick={() => setSelectedEpicId(epic.id)}
                  >
                    <span className="epic-dot" style={{ background: epic.status.color }} />
                    <span className="epic-name">{epic.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="step-content">
              <div className="field">
                <label className="field-label">Issue Title *</label>
                <input
                  type="text"
                  className="input-text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Implement login flow"
                  required
                  autoFocus
                />
              </div>

              <div className="row">
                <div className="field half">
                  <label className="field-label">Status</label>
                  <select className="input-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS_CONFIG.flatMap(g => g.statuses).map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field half">
                  <label className="field-label">Assignee</label>
                  <select 
                    className="input-select" 
                    value={assigneeId} 
                    onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Unassigned</option>
                    {members?.map(m => (
                      <option key={m.id} value={m.id}>{m.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Due Date</label>
                <input
                  type="date"
                  className="input-text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <footer className="modal-footer">
            {step === 2 && (
              <button type="button" className="btn-back" onClick={() => setStep(1)} disabled={createMutation.isPending}>
                Back
              </button>
            )}
            <div className="spacer" />
            <button
              type="submit"
              className="btn-primary"
              disabled={step === 1 ? !selectedEpicId : !name.trim() || createMutation.isPending}
            >
              {step === 1 ? "Next: Fill Details" : createMutation.isPending ? "Creating..." : "Confirm & Create"}
            </button>
          </footer>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(2px);
        }
        .issue-modal {
          background: #fff;
          width: 100%;
          max-width: 440px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #1f1e24; }
        .close-btn { background: none; border: none; font-size: 18px; color: #aaa; cursor: pointer; }
        
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .step-content { display: flex; flex-direction: column; gap: 16px; }
        
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .epic-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 240px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .epic-opt {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border: 1px solid #eee;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .epic-opt:hover { border-color: #6e49cb; background: #f8f7ff; }
        .epic-opt.active { border-color: #6e49cb; background: #f8f7ff; box-shadow: 0 0 0 1px #6e49cb; }
        .epic-dot { width: 8px; height: 8px; border-radius: 50%; }
        .epic-name { font-size: 14px; color: #333; font-weight: 500; }
        
        .input-text, .input-select {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-text:focus, .input-select:focus { border-color: #6e49cb; }
        
        .row { display: flex; gap: 12px; }
        .half { flex: 1; }
        
        .modal-footer {
          display: flex;
          align-items: center;
          margin-top: 10px;
        }
        .spacer { flex: 1; }
        .btn-back {
          background: none;
          border: 1px solid #ddd;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          color: #666;
        }
        .btn-primary {
          background: #6e49cb;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-primary:hover:not(:disabled) { background: #5a3aab; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
