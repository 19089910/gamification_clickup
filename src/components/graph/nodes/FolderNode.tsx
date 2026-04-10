"use client";

import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderNode as FolderNodeType } from "@/types/graph";
import { useGraphStore } from "@/store/graphStore";

const FolderNode = memo<NodeProps<FolderNodeType>>(({ data, selected }) => {
  const accent = (data.color as string) || "#0ea5e9";
  const { createList, selectedQuarter } = useGraphStore();
  const queryClient = useQueryClient();

  const handleCreateList = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const name = prompt('Nome da nova Lista:');
    if (!name) return;

    const quarterInput = prompt('Trimestre (Q1, Q2, Q3 ou Q4):', selectedQuarter || 'Q1');
    if (!quarterInput) return;

    const quarter = quarterInput.toUpperCase().trim();
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      alert('Trimestre inválido! Use Q1, Q2, Q3 ou Q4.');
      return;
    }

    try {
      const result = await createList(data.folderId as string, name, quarter);
      
      if (result.taskWarning) {
        alert(result.taskWarning);
      }
      
      queryClient.invalidateQueries({ queryKey: ["clickup-graph"] });
    } catch (err) {
      console.error("Error creating list:", err);
      alert("Erro ao criar lista no ClickUp");
    }
  }, [data.folderId, createList, selectedQuarter, queryClient]);

  
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
