import { StateCreator } from 'zustand';
import { GraphStore, HierarchySlice, AppNode } from '@/types/graph';
import { syncSelectedNode } from '@/store/helpers';

import {
  toggleFolderCollapse,
  toggleSingleNodeCollapse,
  applyViewAllProjects,
  applyTaskFocusToggle,

} from '@/utils/hierarchy';

export const createHierarchySlice: StateCreator<GraphStore, [], [], HierarchySlice> = (set, get) => ({
  focusedNodeId: null,
  /* ==========================================================================
   Colapsar/Descolapsar Nodes
   ========================================================================== */
  toggleNodeCollapsed: (nodeId, nodeType) => {
    set((state) => {
      let newFullNodes = state.fullNodes;

      // Se for Folder, aplica a regra de não vazar Tasks
      if (nodeType === 'folder') {
        newFullNodes = toggleFolderCollapse(state.fullNodes, state.fullEdges, nodeId);
      } else {
        // Space e List usam o toggle direto
        newFullNodes = toggleSingleNodeCollapse(state.fullNodes, nodeId);
      }

      return {
        fullNodes: newFullNodes,
        selectedNode: syncSelectedNode(state.selectedNode, newFullNodes),
      };
    });
  },

  viewAllProjects: () => {
    set((state) => ({
      fullNodes: applyViewAllProjects(state.fullNodes),
    }));
  },

  setFocusedNode: (nodeId) => {
    set((state) => {
      const isRemoving = !nodeId || state.focusedNodeId === nodeId;
      const nextFocusId = isRemoving ? null : nodeId;

      // Ao aplicar/remover foco, filtra/restaura apenas as tarefas irmãs
      const updatedNodes = applyTaskFocusToggle(state.fullNodes, state.fullEdges, nextFocusId);

      return {
        focusedNodeId: nextFocusId,
        fullNodes: updatedNodes,
        selectedNode: syncSelectedNode(state.selectedNode, updatedNodes),
      };
    });
  },
  /* ==========================================================================
   Nodes Temporarios
   ========================================================================== */
  addTempNode: (parentId, parentType) => {
    set((state) => {
      const parentNode = state.fullNodes.find((n) => n.id === parentId);
      if (!parentNode) return state;

      // Garante que o nó pai esteja descolapsado
      const updatedNodes = state.fullNodes.map((node) => {
        if (node.id === parentId && node.data.collapsed) {
          return { ...node, data: { ...node.data, collapsed: false } } as AppNode;
        }
        return node;
      });

      const tempId = `temp-${Date.now()}`;
      const tempNode: AppNode = {
        id: tempId,
        type: 'temp',
        position: {
          x: parentNode.position.x + 260,
          y: parentNode.position.y + 50,
        },
        data: {
          label: '',
          parentId,
          parentType,
          isTemp: true,
          collapsed: false,
        },
      };

      return {
        fullNodes: [...updatedNodes, tempNode],
      };
    });
  },

  removeTempNode: (tempNodeId) => {
    set((state) => ({
      fullNodes: state.fullNodes.filter((node) => node.id !== tempNodeId),
    }));
  },
});

