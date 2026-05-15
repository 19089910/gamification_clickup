"use client";

import React from "react";
import { ClickUpTask } from "@/types/clickup";

interface ProgressOverviewProps {
  openCount: number;
  closedCount: number;
  totalCount: number;
  progress: number;
}

export default function ProgressOverview({
  openCount,
  closedCount,
  totalCount,
  progress,
}: ProgressOverviewProps) {
  return (
    <div className="progress-sidebar">
      <h3 className="sidebar-title">Milestone Stats</h3>

      <div className="stats-card">
        <div className="progress-section">
          <div className="progress-label-row">
            <span className="p-label">Progress</span>
            <span className="p-value">{Math.round(progress)}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="counts-grid">
          <div className="count-item">
            <span className="count-num open">{openCount}</span>
            <span className="count-label">Open</span>
          </div>
          <div className="count-divider" />
          <div className="count-item">
            <span className="count-num closed">{closedCount}</span>
            <span className="count-label">Closed</span>
          </div>
          <div className="count-divider" />
          <div className="count-item">
            <span className="count-num">{totalCount}</span>
            <span className="count-label">Total</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .progress-sidebar {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sidebar-title {
          font-size: 13px;
          font-weight: 700;
          color: #1f1e24;
          margin: 0;
        }
        .stats-card {
          background: #fff;
          border: 1px solid #dcdcde;
          border-radius: 6px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .progress-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .progress-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .p-label { color: #666; font-weight: 500; }
        .p-value { color: #1f75cb; font-weight: 700; }
        .progress-track {
          height: 8px;
          background: #eaeaea;
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #1f75cb, #5b9bd5);
          border-radius: 4px;
          transition: width 0.4s ease;
        }
        .counts-grid {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid #f0f0f2;
        }
        .count-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .count-num {
          font-size: 22px;
          font-weight: 700;
          color: #1f1e24;
          line-height: 1;
        }
        .count-num.open { color: #1f75cb; }
        .count-num.closed { color: #52a31f; }
        .count-label {
          font-size: 10px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .count-divider {
          width: 1px;
          height: 32px;
          background: #eaeaea;
        }
      `}</style>
    </div>
  );
}
