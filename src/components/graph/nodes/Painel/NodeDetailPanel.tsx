'use client';

import React from 'react';
import { useGraphStore } from '@/store/graphStore';
import { TaskDetail } from './TaskDetail';
import { ListDetail } from './ListDetail';
import { FolderDetail } from './FolderDetail';

export default function NodeDetailPanel() {
  const { selectedNode, isSidebarOpen, setSidebarOpen } = useGraphStore();
  
  if (!isSidebarOpen || !selectedNode) return null;

  return (
    <aside className="detail-panel">
      <button 
        className="detail-close" 
        onClick={() => setSidebarOpen(false)}
        aria-label="Close panel"
      >
        ✕
      </button>
      
      {selectedNode.type === 'task'   && <TaskDetail   node={selectedNode} />}
      {selectedNode.type === 'list'   && <ListDetail   node={selectedNode} />}
      {selectedNode.type === 'folder' && <FolderDetail node={selectedNode} />}
      {selectedNode.type === 'space'  && <FolderDetail node={selectedNode} />}
    </aside>
  );
}
