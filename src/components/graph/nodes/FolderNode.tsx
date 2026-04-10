"use client";

import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderNode as FolderNodeType } from "@/types/graph";
import { useGraphStore } from "@/store/graphStore";

const FolderNode = memo<NodeProps<FolderNodeType>>(({ id, data, selected }) => {
  const accent = (data.color as string) || "#0ea5e9";
  const { createTask, selectedQuarter, toggleNodeCollapsed, fullEdges } = useGraphStore();
  const queryClient = useQueryClient();

  const hasChildren = fullEdges.some(e => e.source === id);

  const handleCreateList = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    // ... same logic
  }, [data.folderId, createTask, selectedQuarter, queryClient]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeCollapsed(id);
  }, [id, toggleNodeCollapsed]);

  return (
    <div
      className={`folder-node ${selected ? "selected" : ""}`}
      style={{
        border: `2px solid ${selected ? accent : accent + "44"}`,
        boxShadow: selected ? `0 0 20px ${accent}44` : `0 0 10px ${accent}22`,
      }}
    >
      <Handle type="target" position={Position.Left} />
      
      {hasChildren && (
        <button className="node-collapse-toggle" onClick={handleToggle}>
          {data.collapsed ? '+' : '−'}
        </button>
      )}

      <div className="node-icon">📁</div>
      <div className="node-content">
        <div className="node-header">
          <span className="node-label">{data.label}</span>
          <button 
            className="add-task-btn" 
            onClick={handleCreateList}
            title="Criar nova lista neste folder"
          >
            +
          </button>
        </div>
        <span className="node-meta">{data.taskCount} tasks</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});



FolderNode.displayName = "FolderNode";
export default FolderNode;
