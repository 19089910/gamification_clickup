"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { SpaceNode as SpaceNodeType } from "@/types/graph";

const SpaceNode = memo<NodeProps<SpaceNodeType>>(({ data, selected }) => {
  return (
    <div
      className={`space-node ${selected ? "selected" : ""}`}
      style={{
        border: `2px solid ${selected ? "#a855f7" : "#7c3aed44"}`,
        boxShadow: selected ? "0 0 20px #a855f744" : "0 0 12px #7c3aed22",
      }}
    >
      <div className="node-icon">🌌</div>
      <div className="node-content">
        <span className="node-label">{data.label}</span>
        <span className="node-type-badge space-badge">SPACE</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

SpaceNode.displayName = "SpaceNode";
export default SpaceNode;
