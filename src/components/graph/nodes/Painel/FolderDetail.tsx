import React from 'react';
import { SpaceNodeData, FolderNodeData } from '@/types/graph';

export function FolderDetail({ node }: { node: any }) {
  const { type, data } = node;

  if (type === 'space') {
    const space = data as SpaceNodeData;
    return (
      <>
        <div className="detail-badge space-badge-lg">SPACE</div>
        <h2 className="detail-title">{space.label}</h2>
        <p className="detail-meta">ID: {space.spaceId}</p>
      </>
    );
  }

  if (type === 'folder') {
    const folder = data as FolderNodeData;
    return (
      <>
        <div className="detail-badge folder-badge-lg">FOLDER</div>
        <h2 className="detail-title">{folder.label}</h2>
        <p className="detail-meta">{folder.taskCount} tarefas</p>
        <p className="detail-hint">→ Pressione <kbd>Tab</kbd> para criar uma lista</p>
      </>
    );
  }

  return null;
}
