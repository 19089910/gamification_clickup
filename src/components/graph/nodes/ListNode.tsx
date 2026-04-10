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
  const { createTask, selectedQuarter } = useGraphStore();
  const queryClient = useQueryClient();

  const handleCreateTask = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents node selection/drag when clicking the button
    
    const name = prompt('Nome da nova task:');
    if (!name) return;

    try {
      await createTask(data.listId as string, name, selectedQuarter);
      // Invalidate queries to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["clickup-graph"] });
    } catch (err) {
      console.error("Error creating task:", err);
      alert("Erro ao criar task no ClickUp");
    }
  }, [data.listId, createTask, selectedQuarter, queryClient]);

  return (
    <div
      className={`list-node ${selected ? "selected" : ""}`}
      style={getNodeStyle(accent, data.state as NodeState, selected)}
    >
      <Handle type="target" position={Position.Left} />
      <div className="list-color-stripe" style={{ background: accent }} />
      <div className="node-content">
        <div className="node-header">
          <span className="node-label">{data.label}</span>
          <button 
            className="add-task-btn" 
            onClick={handleCreateTask}
            title="Criar nova task nesta lista"
          >
            +
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
