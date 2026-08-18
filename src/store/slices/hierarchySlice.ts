import { StateCreator } from 'zustand';
import { GraphStore, HierarchySlice, AppNode, AppEdge } from '@/types/graph';
import { syncSelectedNode } from '../helpers';
import {
  toggleFolderCollapse,
  toggleSingleNodeCollapse,
  applyViewAllProjects,
  applyTaskFocusToggle,
  expandPathToNode,
  addTempNode,
  removeTempNode,
} from '@/utils/hierarchy';

export const createHierarchySlice: StateCreator<GraphStore, [], [], HierarchySlice> = (set, get) => ({
  focusedNodeId: null,

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
   MANIPULAÇÃO TEMPORÁRIA
   ========================================================================== */

  expandPathToNode: (nodeId) => {
    set((state) => ({
      fullNodes: expandPathToNode(state.fullNodes, state.fullEdges, nodeId),
    }));
  },

  addTempNode: (parentId, parentType) => {
    set((state) => {
      const parentNode = state.fullNodes.find((n) => n.id === parentId);
      if (!parentNode) return state;

      const tempId = `temp-${Date.now()}`;
      const tempNode: AppNode = {
        id: tempId,
        type: 'temp',
        position: { x: parentNode.position.x + 250, y: parentNode.position.y },
        data: {
          label: '',
          parentId,
          parentType,
          isTemp: true,
          collapsed: false,
        },
      };

      return { fullNodes: addTempNode(state.fullNodes, parentId, tempNode) };
    });
  },

  removeTempNode: (tempNodeId) => {
    set((state) => ({
      fullNodes: removeTempNode(state.fullNodes, tempNodeId),
    }));
  },
});

