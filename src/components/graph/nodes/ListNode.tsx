"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ListNode as ListNodeType, NodeState } from "@/types/graph";

function getNodeStyle(color: string, state: NodeState | undefined, isSelected: boolean) {
  if (!state || state === 'active') {
    return {
      opacity: 1,
      filter: 'none',
      border: `2px solid ${isSelected ? color : color + 'aa'}`,
      boxShadow: isSelected ? `0 0 20px ${color}88` : `0 0 12px ${color}44`,
      transform: 'scale(1.02)',
      transition: 'all 0.2s ease'
    };
  }

  return {
    opacity: 0.4,
    filter: 'grayscale(100%)',
    border: '1px solid #555',
    boxShadow: 'none',
    transform: 'scale(1)',
    transition: 'all 0.2s ease'
  };
}

const ListNode = memo<NodeProps<ListNodeType>>(({ data, selected }) => {
  const accent = data.color as string;

  return (
    <div
      className={`list-node ${selected ? "selected" : ""}`}
      style={getNodeStyle(accent, data.state as NodeState, selected)}
    >
      <Handle type="target" position={Position.Left} />
      <div className="list-color-stripe" style={{ background: accent }} />
      <div className="node-content">
        <span className="node-label">{data.label}</span>
        <span className="node-meta" style={{ color: accent }}>
          {data.taskCount} tasks
        </span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

ListNode.displayName = "ListNode";
export default ListNode;
