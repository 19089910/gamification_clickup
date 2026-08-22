"use client";

import React, { memo, useCallback, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useGraphStore } from "@/store/graphStore";
import { TempNodeData } from "@/types/graph";

const TempNode = memo<NodeProps>(({ id, data }) => {
  const nodeData = data as TempNodeData;
  const [name, setName] = useState('');

  const isForList = nodeData.parentType === 'folder';
  const isForSubtask = nodeData.parentType === 'task';

  const commitTempNode = useGraphStore((state) => state.commitTempNode);
  const removeTempNode = useGraphStore((state) => state.removeTempNode);
  const setQuarterPickerModal = useGraphStore((state) => state.setQuarterPickerModal);

  const handleCommit = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      removeTempNode(id);
      return;
    }

    // Se estiver criando uma Lista dentro de uma Pasta, abre o Modal para escolher o Quarter
    if (isForList) {
      setQuarterPickerModal({
        isOpen: true,
        listName: trimmedName,
        folderId: nodeData.parentId,
        tempNodeId: id,
      });
      return;
    }

    // Para Tarefas e Subtarefas, efetiva diretamente passando (id, name, quarter)
    commitTempNode(id, trimmedName, null);
  }, [id, name, isForList, nodeData.parentId, commitTempNode, removeTempNode, setQuarterPickerModal]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        removeTempNode(id);
      }
    },
    [handleCommit, removeTempNode, id]
  );

  return (
    <div className={`temp-node ${isForList ? 'temp-list' : 'temp-task'}`}>
      <Handle type="target" position={Position.Left} />
      <div className="temp-node-icon">{isForList ? '📁' : isForSubtask ? '🔹' : '✏️'}</div>
      <input
        className="temp-node-input"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={isForList ? 'Nome da lista...' : isForSubtask ? 'Nome da subtask...' : 'Nome da task...'}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

TempNode.displayName = "TempNode";
export default TempNode;