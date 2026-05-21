"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { SubtaskNode as SubtaskNodeType, NodeState } from "@/types/graph";
import { parseLabelWithBrackets } from "@/utils/label-parser";

function getNodeStyle(color: string, state: NodeState | undefined, isSelected: boolean) {
  const baseStyle = {
    background: "#0d0d0d",
    borderRadius: "6px",
    padding: "6px 10px",
    transition: "all 0.2s ease",
  };

  if (!state || state === 'active') {
    return {
      ...baseStyle,
      opacity: 1,
      filter: 'none',
      border: `1.2px solid ${isSelected ? color : color + '44'}`,
      boxShadow: isSelected ? `0 0 12px ${color}33` : `0 0 6px ${color}22`,
      transform: 'scale(0.95)',
    };
  }

  return {
    ...baseStyle,
    opacity: 0.4,
    filter: 'grayscale(100%)',
    border: '1px solid #444',
    boxShadow: 'none',
    transform: 'scale(0.9)',
  };
}

const SubtaskNode = memo<NodeProps<SubtaskNodeType>>(({ data, selected }) => {
  const statusColor = (data.statusColor as string) || "#555";

  return (
    <div
      className={`subtask-node ${selected ? "selected" : ""}`}
      style={getNodeStyle(statusColor, data.state as NodeState, selected)}
    >
      <Handle type="target" position={Position.Left} />

      <div className="task-header" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div
          className="task-status-dot"
          style={{ background: statusColor, width: "6px", height: "6px" }}
          title={data.status as string}
        />
        <span 
          className="node-label task-label" 
          style={{ 
            fontSize: "11px", 
            fontWeight: 500, 
            whiteSpace: "normal", 
            wordBreak: "break-word", 
            lineHeight: 1.3 
          }}
        >
          {parseLabelWithBrackets(data.label as string)}
        </span>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

SubtaskNode.displayName = "SubtaskNode";
export default SubtaskNode;
