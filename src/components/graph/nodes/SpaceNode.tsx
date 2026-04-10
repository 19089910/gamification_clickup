"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { SpaceNode as SpaceNodeType } from "@/types/graph";
import { useGraphStore } from "@/store/graphStore";
import { useCallback } from "react";

const SpaceNode = memo<NodeProps<SpaceNodeType>>(({ id, data, selected }) => {
  const { toggleNodeCollapsed, fullEdges } = useGraphStore();
  const hasChildren = fullEdges.some(e => e.source === id);


  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeCollapsed(id);
  }, [id, toggleNodeCollapsed]);

  return (
    <div
      className={`space-node ${selected ? "selected" : ""}`}
      style={{
        border: `2px solid ${selected ? "#a855f7" : "#7c3aed44"}`,
        boxShadow: selected ? "0 0 20px #a855f744" : "0 0 12px #7c3aed22",
      }}
    >
      {hasChildren && (
        <button className="node-collapse-toggle space-toggle" onClick={handleToggle}>
          {data.collapsed ? '+' : '−'}
        </button>
      )}

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
