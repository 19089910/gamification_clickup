'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { TaskNode as TaskNodeType } from '@/types/graph';

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '🔴',
  high: '🟠',
  normal: '🟡',
  low: '🔵',
};

function formatDate(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const ms = Number(timestamp);
  const date = isNaN(ms) ? new Date(timestamp) : new Date(ms);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const TaskNode = memo<NodeProps<TaskNodeType>>(({ data, selected }) => {
  const statusColor = (data.statusColor as string) || '#555';

  return (
    <div
      className={`task-node ${selected ? 'selected' : ''}`}
      style={{
        border: `1.5px solid ${selected ? statusColor : statusColor + '44'}`,
        boxShadow: selected ? `0 0 16px ${statusColor}33` : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} />

      <div className="task-header">
        <div
          className="task-status-dot"
          style={{ background: statusColor }}
          title={data.status as string}
        />
        {(data.priority as string) && (
          <span className="task-priority">
            {PRIORITY_LABELS[data.priority as string] ?? '⚪'}
          </span>
        )}
        <span className="node-label task-label">{data.label as string}</span>
      </div>

      {(data.dueDate as string | null) && (
        <div className="task-due">📅 {formatDate(data.dueDate as string)}</div>
      )}

      {Array.isArray(data.tags) && data.tags.length > 0 && (
        <div className="task-tags">
          {(data.tags as { name: string; bg: string; fg: string }[])
            .slice(0, 2)
            .map((tag) => (
              <span
                key={tag.name}
                className="task-tag"
                style={{ background: tag.bg, color: tag.fg }}
              >
                {tag.name}
              </span>
            ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
export default TaskNode;
