"use client";

import React from "react";
import { ClickUpTask } from "@/types/clickup";

interface IssueRowProps {
  issue: ClickUpTask;
  onClick?: (issue: ClickUpTask) => void;
}

function formatDate(dateMs: string | null): string {
  if (!dateMs) return "";
  const d = new Date(parseInt(dateMs));
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function IssueRow({ issue, onClick }: IssueRowProps) {
  const isClosed = issue.status.type === "closed";
  const isOverdue = issue.due_date && !isClosed && parseInt(issue.due_date) < Date.now();

  return (
    <div
      className={`issue-row ${isClosed ? "is-closed" : ""}`}
      onClick={() => onClick?.(issue)}
    >
      {/* Left: status icon + title */}
      <div className="issue-left">
        <div
          className="status-icon"
          title={issue.status.status}
          style={{ borderColor: issue.status.color }}
        >
          {isClosed && (
            <div className="status-fill" style={{ background: issue.status.color }} />
          )}
        </div>

        <div className="issue-text">
          <span className="issue-title">{issue.name}</span>
          <div className="issue-meta">
            <span className="issue-id">#{issue.id.slice(-6)}</span>
            <span className="meta-dot">·</span>
            <span
              className="status-pill"
              style={{
                background: issue.status.color + "22",
                color: issue.status.color,
                borderColor: issue.status.color + "44",
              }}
            >
              {issue.status.status}
            </span>
            {issue.tags.filter(t => t.name !== "dev").map(tag => (
              <span
                key={tag.name}
                className="tag-pill"
                style={{ background: tag.tag_bg, color: tag.tag_fg }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: due date + assignees */}
      <div className="issue-right">
        {issue.due_date && (
          <span className={`due-date ${isOverdue ? "overdue" : ""}`}>
            {formatDate(issue.due_date)}
          </span>
        )}
        <div className="assignees">
          {issue.assignees.slice(0, 3).map(a => (
            <div key={a.id} className="avatar" title={a.username}>
              {a.profilePicture ? (
                <img src={a.profilePicture} alt={a.username} className="avatar-img" />
              ) : (
                <span>{a.username[0]?.toUpperCase()}</span>
              )}
            </div>
          ))}
          {issue.assignees.length > 3 && (
            <div className="avatar overflow">+{issue.assignees.length - 3}</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .issue-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #fff;
          border-bottom: 1px solid #eaeaea;
          cursor: pointer;
          transition: background 0.15s;
          gap: 16px;
        }
        .issue-row:last-child {
          border-bottom: none;
        }
        .issue-row:hover {
          background: #f9f9fb;
        }
        .issue-left {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .status-icon {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .status-fill {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .issue-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .issue-title {
          font-size: 14px;
          font-weight: 500;
          color: #1f1e24;
          line-height: 1.4;
          word-break: break-word;
        }
        .is-closed .issue-title {
          color: #888;
          text-decoration: line-through;
        }
        .issue-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .issue-id {
          font-size: 11px;
          color: #aaa;
          font-family: monospace;
          font-weight: 500;
        }
        .meta-dot {
          color: #ddd;
          font-size: 12px;
        }
        .status-pill {
          font-size: 11px;
          font-weight: 600;
          padding: 1px 7px;
          border-radius: 10px;
          border: 1px solid;
          text-transform: capitalize;
        }
        .tag-pill {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 8px;
          text-transform: lowercase;
        }
        .issue-right {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        .due-date {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
        }
        .due-date.overdue {
          color: #e5534b;
          font-weight: 600;
        }
        .assignees {
          display: flex;
          flex-direction: row-reverse;
        }
        .avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #e1e1e6;
          border: 2px solid #fff;
          color: #555;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: -6px;
          overflow: hidden;
        }
        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar.overflow {
          font-size: 9px;
          background: #c0c0c8;
          color: #333;
        }
      `}</style>
    </div>
  );
}
