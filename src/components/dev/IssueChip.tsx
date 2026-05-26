"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ClickUpTask } from "@/types/clickup";

interface IssueChipProps {
  issue: ClickUpTask;
  milestoneId?: string; // Optional: where it currently belongs
}

export default function IssueChip({ issue, milestoneId }: IssueChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    data: {
      type: "Issue",
      issue,
      milestoneId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`issue-chip ${isDragging ? "dragging" : ""}`}
      title={issue.name}
    >
      <span
        className="status-dot"
        style={{ background: issue.status?.color || "#ccc" }}
      />
      <span className="issue-name">{issue.name}</span>

      <style jsx>{`
        .issue-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 500;
          color: #334155;
          cursor: grab;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
          user-select: none;
        }
        .issue-chip:active {
          cursor: grabbing;
        }
        .issue-chip.dragging {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #6e49cb;
          z-index: 10;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .issue-name {
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}
