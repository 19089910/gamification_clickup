"use client";

import React from "react";
import { ClickUpTask } from "@/types/clickup";

interface IssueItemProps {
  issue: ClickUpTask;
  variant?: 'default' | 'gitlab';
}

export default function IssueItem({ issue, variant = 'default' }: IssueItemProps) {
  const isClosed = issue.status.type === 'closed';

  if (variant === 'gitlab') {
    return (
      <div className={`gitlab-issue-row ${isClosed ? 'is-closed' : ''}`}>
        <div className="issue-main-info">
          <span className="issue-icon">{isClosed ? '✅' : '⊙'}</span>
          <div className="issue-text">
            <h4 className="issue-title">{issue.name}</h4>
            <div className="issue-subtext">
              <span className="issue-id">#{issue.id.slice(-4)}</span>
              <span className="dot">•</span>
              <span className="issue-status">{issue.status.status}</span>
            </div>
          </div>
        </div>
        
        <div className="issue-meta-info">
          <div className="issue-labels">
            {issue.tags.map(tag => (
              <span key={tag.name} className="gitlab-label" style={{ backgroundColor: tag.tag_bg, color: tag.tag_fg }}>
                {tag.name}
              </span>
            ))}
          </div>
          {issue.assignees && issue.assignees[0] && (
            <div className="gitlab-avatar" title={issue.assignees[0].username}>
              {issue.assignees[0].username[0].toUpperCase()}
            </div>
          )}
        </div>

        <style jsx>{`
          .gitlab-issue-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #fff;
            border-bottom: 1px solid #dcdcde;
            transition: background 0.2s;
          }
          .gitlab-issue-row:hover {
            background: #f9f9f9;
          }
          .gitlab-issue-row:first-child {
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
          }
          .gitlab-issue-row:last-child {
            border-bottom-left-radius: 4px;
            border-bottom-right-radius: 4px;
            border-bottom: none;
          }
          .issue-main-info {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-width: 0;
          }
          .issue-icon {
            color: ${isClosed ? '#52a31f' : '#1f75cb'};
            font-size: 16px;
            margin-top: 2px;
          }
          .issue-title {
            font-size: 14px;
            font-weight: 600;
            margin: 0;
            color: #1f1e24;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .issue-subtext {
            font-size: 12px;
            color: #666;
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 2px;
          }
          .dot { color: #ccc; }
          .issue-meta-info {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .issue-labels {
            display: flex;
            gap: 4px;
          }
          .gitlab-label {
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 10px;
            text-transform: lowercase;
          }
          .gitlab-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #ebebed;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            color: #666;
            border: 1px solid #dcdcde;
          }
          .is-closed .issue-title {
            color: #666;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`issue-item ${isClosed ? 'is-closed' : ''}`}>
      <div className="issue-main">
        <div 
          className="issue-status-dot" 
          style={{ background: issue.status.color }} 
          title={issue.status.status}
        />
        <span className="issue-name">{issue.name}</span>
      </div>

      <div className="issue-meta">
        {issue.assignees && issue.assignees.length > 0 && (
          <div className="issue-assignees">
            {issue.assignees.map(a => (
              <div key={a.id} className="mini-avatar" title={a.username}>
                {a.username[0].toUpperCase()}
              </div>
            ))}
          </div>
        )}
        <span className="issue-id">#{issue.id.slice(-4)}</span>
      </div>

      <style jsx>{`
        .issue-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: opacity var(--t-fast);
        }
        .issue-item:last-child {
          border-bottom: none;
        }
        .issue-item.is-closed {
          opacity: 0.5;
        }
        .issue-main {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .issue-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .issue-name {
          font-size: 14px;
          color: var(--text-2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .issue-item.is-closed .issue-name {
          text-decoration: line-through;
        }
        .issue-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        .issue-id {
          font-family: monospace;
          font-size: 11px;
          color: var(--text-3);
          font-weight: 500;
        }
        .issue-assignees {
          display: flex;
          flex-direction: row-reverse;
        }
        .mini-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--surface-3);
          border: 1px solid var(--surface-1);
          color: var(--text-3);
          font-size: 8px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: -6px;
        }
      `}</style>
    </div>
  );
}
