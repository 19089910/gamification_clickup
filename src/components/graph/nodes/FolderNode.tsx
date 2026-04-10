"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { FolderNode as FolderNodeType } from "@/types/graph";

const FolderNode = memo<NodeProps<FolderNodeType>>(({ data, selected }) => {
  const accent = (data.color as string) || "#0ea5e9";
  
  return (
    <div
      className={`folder-node ${selected ? "selected" : ""}`}
      style={{
        border: `2px solid ${selected ? accent : accent + "44"}`,
        boxShadow: selected ? `0 0 20px ${accent}44` : `0 0 10px ${accent}22`,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-icon">📁</div>
      <div className="node-content">
        <span className="node-label">{data.label}</span>
        <span className="node-meta">{data.taskCount} tasks</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

FolderNode.displayName = "FolderNode";
export default FolderNode;
