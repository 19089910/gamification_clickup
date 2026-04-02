'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FolderNode as FolderNodeType } from '@/types/graph';

const FolderNode = memo<NodeProps<FolderNodeType>>(({ data, selected }) => {
  return (
    <div
      className={`folder-node ${selected ? 'selected' : ''}`}
      style={{
        border: `2px solid ${selected ? '#38bdf8' : '#0369a144'}`,
        boxShadow: selected ? '0 0 20px #38bdf844' : '0 0 10px #0ea5e922',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="node-icon">📁</div>
      <div className="node-content">
        <span className="node-label">{data.label}</span>
        <span className="node-meta">{data.taskCount} tasks</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

FolderNode.displayName = 'FolderNode';
export default FolderNode;
