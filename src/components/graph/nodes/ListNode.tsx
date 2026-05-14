"use client";

import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useQueryClient } from "@tanstack/react-query";
import { ListNode as ListNodeType, NodeState } from "@/types/graph";
import { useGraphStore } from "@/store/graphStore";

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

const ListNode = memo<NodeProps<ListNodeType>>(({ id, data, selected }) => {
  const accent = data.color as string;
  const { createTask, selectedQuarter, toggleNodeCollapsed, fullEdges, isDevList, openDevPanel } = useGraphStore();
  const queryClient = useQueryClient();

  const hasChildren = fullEdges.some(e => e.source === id);
  const isDev = isDevList(data.listId as string);

  const handleCreateTask = useCallback(async (e: React.MouseEvent) => {
    // ... same logic
    }, [data.listId, createTask, selectedQuarter, queryClient]);

  const handlePrimaryAction = useCallback((e: React.MouseEvent) => {
    if (isDev) {
      openDevPanel(data.listId as string); // action no store
    } else {
      handleCreateTask(e); // comportamento atual
    }
  }, [isDev, data.listId, openDevPanel, handleCreateTask]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeCollapsed(id);
  }, [id, toggleNodeCollapsed]);

  return (
    <div
      className={`list-node ${selected ? "selected" : ""}`}
      style={getNodeStyle(accent, data.state as NodeState, selected)}
    >
      <Handle type="target" position={Position.Left} />
      
      {hasChildren && (
        <button className="node-collapse-toggle list-toggle" onClick={handleToggle}>
          {data.collapsed ? '+' : '−'}
        </button>
      )}

      <div className="list-color-stripe" style={{ background: accent }} />
      <div className="node-content">
        <div className="node-header">
          <span className="node-label">{data.label}</span>
            <button
              className={`add-task-btn ${isDev ? 'dev-mode' : ''}`}
              onClick={handlePrimaryAction}
              title={isDev ? 'Abrir Gerenciador Dev' : 'Criar nova task'}
            >
              {isDev ? '⚡' : '+'}
            </button>
        </div>
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
