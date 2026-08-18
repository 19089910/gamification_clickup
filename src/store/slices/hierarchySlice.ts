import { StateCreator } from 'zustand';
import { GraphStore, HierarchySlice } from '@/types/graph';
import { syncSelectedNode } from '../helpers';
import {
  toggleNodeCollapseState,
  getNodesWithExpandedPath,
  applyCollapseToLists,
  applyFocusToNodes
} from '@/utils/hierarchy';

export const createHierarchySlice: StateCreator<GraphStore, [], [], HierarchySlice> = (set, get) => ({
  toggleNodeCollapsed: (nodeId) => {
    set((state) => {
      const newFullNodes = toggleNodeCollapseState(state.fullNodes, nodeId);
      return {
        fullNodes: newFullNodes,
        selectedNode: syncSelectedNode(state.selectedNode, newFullNodes),
      };
    });
  },

  expandPathToNode: (nodeId) => {
    set((state) => {
      const newFullNodes = getNodesWithExpandedPath(state.fullNodes, state.fullEdges, nodeId);
      return {
        fullNodes: newFullNodes,
        selectedNode: syncSelectedNode(state.selectedNode, newFullNodes),
      };
    });
  },

  // Removido o lixo visual e gerador de ID (que vai depois pro uiSlice ou nodeFactory)
  addTempNode: (tempNode, tempEdge) => {
    set((state) => ({
      nodes: [...state.nodes, tempNode],
      edges: [...state.edges, tempEdge],
    }));
  },

  removeTempNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
  },

  collapseToLists: () => {
    const nodes = get().fullNodes;
    set({
      fullNodes: applyCollapseToLists(nodes),
    });
  },

  focusedNodeId: null,

  setFocusedNode: (nodeId) => {
    set((state) => {
      // Se passar null ou o mesmo nó já focado, desativa o foco
      if (!nodeId || state.focusedNodeId === nodeId) {
        return { focusedNodeId: null };
      }

      const updatedNodes = applyFocusToNodes(state.fullNodes, state.fullEdges, nodeId);

      return {
        focusedNodeId: nodeId,
        fullNodes: updatedNodes,
        selectedNode: syncSelectedNode(state.selectedNode, updatedNodes),
      };
    });
  },
});