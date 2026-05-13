'use client';

import React from 'react';
import { useGraphStore } from '@/store/graphStore';
import { TaskDetail } from './TaskDetail';
import { ListDetail } from './ListDetail';
import { FolderDetail } from './FolderDetail';

export default function NodeDetailPanel() {
  // 1. Estado global do painel (Apenas abre/fecha e decide quem renderizar)
  const { selectedNode, isSidebarOpen, setSidebarOpen } = useGraphStore();
  
  if (!isSidebarOpen || !selectedNode) return null;

  return (
    <aside className="detail-panel">
      {/* Botão de fechar universal */}
      <button 
        className="detail-close" 
        onClick={() => setSidebarOpen(false)}
        aria-label="Close panel"
      >
        ✕
      </button>
      
      {/* 2. Roteador Interno: Renderiza o detalhe específico baseado no tipo do nó */}
      {selectedNode.type === 'task'   && <TaskDetail   node={selectedNode} />} {/* status, prioridade, data, quarters */}
      {selectedNode.type === 'list'   && <ListDetail   node={selectedNode} />} {/* nome da lista e métricas */}
      {selectedNode.type === 'folder' && <FolderDetail node={selectedNode} />} {/* visualização básica de pasta */}
      {selectedNode.type === 'space'  && <FolderDetail node={selectedNode} />} {/* reaproveita o FolderDetail para Espaços */}
    </aside>
  );
}
