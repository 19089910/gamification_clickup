"use client";

import React from "react";
import { ClickUpList } from "@/types/clickup";

interface MilestoneHeaderProps {
  list: ClickUpList | null;
  progress: number;
}

export default function MilestoneHeader({ list, progress }: MilestoneHeaderProps) {
  return (
    <div className="milestone-header">
      <div className="milestone-meta">
        <span className="milestone-label">Milestone Ativa</span>
        <h1 className="milestone-title">{list?.name || "Sprint"}</h1>
      </div>
      
      <div className="milestone-progress-card">
        <div className="progress-header">
          <span className="progress-percentage">{Math.round(progress)}%</span>
          <span className="progress-status">Completo</span>
        </div>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <style jsx>{`
        .milestone-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
        }
        .milestone-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--purple-lg);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          display: block;
          margin-bottom: 8px;
        }
        .milestone-title {
          font-size: 32px;
          font-weight: 800;
          color: var(--text-1);
          letter-spacing: -0.03em;
        }
        .milestone-progress-card {
          width: 240px;
          background: var(--surface-1);
          border: 1px solid var(--border-2);
          border-radius: 12px;
          padding: 16px;
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 12px;
        }
        .progress-percentage {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-1);
        }
        .progress-status {
          font-size: 11px;
          color: var(--text-3);
          font-weight: 600;
          text-transform: uppercase;
        }
        .progress-track {
          height: 6px;
          background: var(--surface-3);
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--purple), var(--purple-lg));
          box-shadow: 0 0 10px rgba(124, 58, 237, 0.4);
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
