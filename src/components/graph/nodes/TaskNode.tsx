"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { TaskNode as TaskNodeType, NodeState } from "@/types/graph";
import { parseLabelWithBrackets } from "@/utils/label-parser";

function getNodeStyle(color: string, state: NodeState | undefined, isSelected: boolean) {
  if (!state || state === 'active') {
    return {
      opacity: 1,
      filter: 'none',
      border: `1.5px solid ${isSelected ? color : color + '44'}`,
      boxShadow: isSelected ? `0 0 16px ${color}33` : `0 0 8px ${color}22`,
      transform: 'scale(1.01)',
      transition: 'all 0.2s ease'
    };
  }

  return {
    opacity: 0.4,
    filter: 'grayscale(100%)',
    border: '1px solid #444',
    boxShadow: 'none',
    transform: 'scale(1)',
    transition: 'all 0.2s ease'
  };
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "🔴",
  high: "🟠",
  normal: "🔵",
  low: "⚪",
};

function formatDate(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const ms = Number(timestamp);
  const date = isNaN(ms) ? new Date(timestamp) : new Date(ms);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const TaskNode = memo<NodeProps<TaskNodeType>>(({ data, selected }) => {
  const statusColor = (data.statusColor as string) || "#555";

  return (
    <div
      className={`task-node ${selected ? "selected" : ""}`}
      style={getNodeStyle(statusColor, data.state as NodeState, selected)}
    >
      <Handle type="target" position={Position.Left} />

      <div className="task-header">
        <div
          className="task-status-dot"
          style={{ background: statusColor }}
          title={data.status as string}
        />
        {(data.priority as string) && (
          <span className="task-priority">
            {PRIORITY_LABELS[data.priority as string] ?? "⚪"}
          </span>
        )}
        <span className="node-label task-label">
          {parseLabelWithBrackets(data.label as string)}
        </span>
      </div>

      {(data.dueDate as string | null) && (
        <div className="task-due">📅 {formatDate(data.dueDate as string)}</div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

TaskNode.displayName = "TaskNode";
export default TaskNode;
