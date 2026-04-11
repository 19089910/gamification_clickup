"use client";

import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Node } from "@xyflow/react";

interface TempNodeData {
  label: string;
  isTemp: boolean;
  parentId: string;
  parentType: 'folder' | 'list';
  [key: string]: unknown;
}

type TempNodeType = Node<TempNodeData, 'temp'>;

interface TempNodeProps extends NodeProps<TempNodeType> {
  onCommit: (nodeId: string, name: string) => void;
  onCancel: (nodeId: string) => void;
}

const TempNode = memo<NodeProps<TempNodeType>>(({ id, data }) => {
  const isForList = data.parentType === 'folder';

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const name = (e.target as HTMLInputElement).value.trim();
      if (!name) return;
      // Dispatch a custom event that GraphCanvas listens to
      const event = new CustomEvent('tempnode:commit', { detail: { nodeId: id, name } });
      window.dispatchEvent(event);
    }
    if (e.key === 'Escape') {
      const event = new CustomEvent('tempnode:cancel', { detail: { nodeId: id } });
      window.dispatchEvent(event);
    }
  }, [id]);

  return (
    <div className={`temp-node ${isForList ? 'temp-list' : 'temp-task'}`}>
      <Handle type="target" position={Position.Left} />
      <div className="temp-node-icon">{isForList ? '📁' : '✏️'}</div>
      <input
        className="temp-node-input"
        autoFocus
        placeholder={isForList ? 'Nome da lista...' : 'Nome da task...'}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

TempNode.displayName = "TempNode";
export default TempNode;
