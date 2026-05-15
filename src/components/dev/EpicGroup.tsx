"use client";

import React, { useState } from "react";
import { ClickUpTask } from "@/types/clickup";
import IssueItem from "@/components/dev/IssueItem";

interface EpicGroupProps {
  epic: ClickUpTask;
}

export default function EpicGroup({ epic }: EpicGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const subtasks = epic.subtasks || [];
  const completedCount = subtasks.filter(s => s.status.type === 'closed').length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={`epic-group ${isExpanded ? 'is-expanded' : ''}`}>
      <header className="epic-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="epic-info">
          <span className="epic-chevron">{isExpanded ? '▼' : '▶'}</span>
          <div className="epic-badge">EPIC</div>
          <h3 className="epic-title">{epic.name}</h3>
        </div>

        <div className="epic-metrics">
          <div className="epic-progress-compact">
            <span className="metrics-text">{completedCount}/{totalCount} Issues</span>
            <div className="mini-progress-track">
              <div className="mini-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      {isExpanded && (
        <div className="epic-content">
          {subtasks.length > 0 ? (
            <div className="issue-list">
              {subtasks.map(issue => (
                <IssueItem key={issue.id} issue={issue} />
              ))}
            </div>
          ) : (
            <div className="no-issues">Nenhuma issue vinculada a este épico.</div>
          )}
        </div>
      )}

      <style jsx>{`
        .epic-group {
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          border-radius: 12px;
          overflow: hidden;
          transition: all var(--t-fast);
        }
        .epic-group:hover {
          border-color: var(--border-2);
        }
        .epic-header {
          padding: 18px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
          transition: background var(--t-fast);
        }
        .epic-header:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .epic-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .epic-chevron {
          font-size: 10px;
          color: var(--text-3);
          width: 12px;
        }
        .epic-badge {
          font-size: 9px;
          font-weight: 800;
          color: var(--purple-lg);
          background: rgba(168, 85, 247, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.1em;
          border: 1px solid rgba(168, 85, 247, 0.2);
        }
        .epic-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-1);
        }
        .epic-metrics {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .epic-progress-compact {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .metrics-text {
          font-size: 11px;
          color: var(--text-3);
          font-weight: 600;
        }
        .mini-progress-track {
          width: 100px;
          height: 4px;
          background: var(--surface-3);
          border-radius: 2px;
          overflow: hidden;
        }
        .mini-progress-bar {
          height: 100%;
          background: var(--purple);
          border-radius: 2px;
        }
        .epic-content {
          padding: 8px 24px 24px 52px;
          border-top: 1px solid var(--border-1);
          background: rgba(0, 0, 0, 0.1);
        }
        .issue-list {
          display: flex;
          flex-direction: column;
        }
        .no-issues {
          padding: 16px 0;
          font-size: 13px;
          color: var(--text-3);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
