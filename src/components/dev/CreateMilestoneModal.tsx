"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClickUpTask } from "@/types/clickup";

interface CreateMilestoneModalProps {
  listId: string;
  onClose: () => void;
}

interface CreateMilestonePayload {
  name: string;
  start_date?: string;
  due_date?: string;
  description?: string;
}

export default function CreateMilestoneModal({
  listId,
  onClose,
}: CreateMilestoneModalProps) {
  const queryClient = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  // Focus name input on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { mutate, isPending, error } = useMutation<
    ClickUpTask,
    Error,
    CreateMilestonePayload
  >({
    mutationFn: async (payload) => {
      const res = await fetch(`/api/clickup/lists/${listId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create milestone");
      }
      return res.json();
    },
    onSuccess: () => {
      // Refresh the milestone manager page data
      queryClient.invalidateQueries({ queryKey: ["dev-panel", listId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutate({
      name,
      start_date: startDate || undefined,
      due_date: dueDate || undefined,
      description: description || undefined,
    });
  };

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal
      aria-label="Create Milestone"
    >
      <div className="modal">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">⊗</span>
            <h2 className="modal-title">New Milestone</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Name */}
          <div className="field">
            <label className="field-label" htmlFor="ms-name">
              Name <span className="required">*</span>
            </label>
            <input
              id="ms-name"
              ref={nameRef}
              className="field-input"
              type="text"
              placeholder="e.g. Sprint 1 — Auth System"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <div className="dates-row">
            {/* Start date */}
            <div className="field">
              <label className="field-label" htmlFor="ms-start">
                Start Date
              </label>
              <input
                id="ms-start"
                className="field-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Due date */}
            <div className="field">
              <label className="field-label" htmlFor="ms-due">
                Due Date
              </label>
              <input
                id="ms-due"
                className="field-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Description */}
          <div className="field">
            <label className="field-label" htmlFor="ms-desc">
              Description
            </label>
            <textarea
              id="ms-desc"
              className="field-input field-textarea"
              placeholder="What does this milestone deliver?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isPending}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="error-banner" role="alert">
              {error.message}
            </div>
          )}

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-create"
              disabled={isPending || !name.trim()}
            >
              {isPending ? "Creating…" : "Create Milestone"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          backdrop-filter: blur(2px);
        }
        .modal {
          background: #fff;
          border-radius: 10px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          animation: slide-in 0.18s ease;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #eaeaea;
        }
        .modal-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .modal-icon { font-size: 20px; color: #6e49cb; }
        .modal-title {
          font-size: 17px;
          font-weight: 700;
          color: #1f1e24;
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 14px;
          color: #aaa;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          transition: background 0.15s, color 0.15s;
        }
        .close-btn:hover { background: #f0f0f2; color: #333; }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px 24px 24px;
        }
        .dates-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 13px;
          font-weight: 600;
          color: #1f1e24;
        }
        .required { color: #e5534b; margin-left: 2px; }
        .field-input {
          border: 1px solid #dcdcde;
          border-radius: 6px;
          padding: 9px 12px;
          font-size: 14px;
          color: #1f1e24;
          background: #fff;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
          font-family: inherit;
        }
        .field-input:focus {
          border-color: #6e49cb;
          box-shadow: 0 0 0 3px rgba(110, 73, 203, 0.12);
        }
        .field-input:disabled { background: #f4f4f6; color: #999; }
        .field-textarea { resize: vertical; min-height: 72px; }
        .error-banner {
          background: #fdf0ef;
          border: 1px solid #f5c2be;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 13px;
          color: #c7372f;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 4px;
        }
        .btn {
          padding: 9px 18px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
        }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn-cancel {
          background: #fff;
          border-color: #dcdcde;
          color: #555;
        }
        .btn-cancel:hover:not(:disabled) { background: #f4f4f6; }
        .btn-create {
          background: #6e49cb;
          color: #fff;
        }
        .btn-create:hover:not(:disabled) {
          background: #5a3aab;
          box-shadow: 0 2px 8px rgba(110, 73, 203, 0.3);
        }
      `}</style>
    </div>
  );
}
