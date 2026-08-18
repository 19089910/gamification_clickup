import { StateCreator } from "zustand";
import { AppNode, GraphStore } from "@/types/graph";
import {
  calculateNodeVisibility,
  toggleSingleNodeCollapse,
  toggleFolderCollapse,
  toggleSpaceCollapse,
} from "@/utils/hierarchy";

export interface HierarchySlice {
  focusedNodeId: string | null;
  setFocusedNode: (nodeId: string | null) => void;
  toggleNodeCollapsed: (nodeId: string, nodeType?: string) => void;
  viewAllProjects: () => void;
}

export const createHierarchySlice: StateCreator<GraphStore, [], [], HierarchySlice> = (set) => ({
  focusedNodeId: null,

  // Regra 5: Alterna o Focus Mode (🍅 / +) da Task
  setFocusedNode: (nodeId) => {
    set((state) => {
      const nextFocusedId = state.focusedNodeId === nodeId ? null : nodeId;
      const updatedNodes = calculateNodeVisibility(state.fullNodes, nextFocusedId);

      return {
        focusedNodeId: nextFocusedId,
        fullNodes: updatedNodes,
      };
    });
  },

  // Regras 1, 3 e 4: Roteamento explícito por tipo de nó
  toggleNodeCollapsed: (nodeId, nodeType) => {
    set((state) => {
      let updatedNodes: AppNode[];

      if (nodeType === "space") {
        // Regra 1: Expande Space sem vazar Lists/Tasks
        updatedNodes = toggleSpaceCollapse(state.fullNodes, nodeId);
      } else if (nodeType === "folder") {
        // Regra 3: Expande Folder sem vazar Tasks
        updatedNodes = toggleFolderCollapse(state.fullNodes, nodeId);
      } else {
        // Regra 4: Toggle padrão (List ou Task)
        updatedNodes = toggleSingleNodeCollapse(state.fullNodes, nodeId);
      }

      // Recalcula visibilidade no grafo
      const finalNodes = calculateNodeVisibility(updatedNodes, state.focusedNodeId);

      return { fullNodes: finalNodes };
    });
  },

  // Regra 2: View Projects (Mostra apenas as Lists)
  viewAllProjects: () => {
    set((state) => {
      const updatedNodes = state.fullNodes.map((node: AppNode) => {
        if (node.type === "space" || node.type === "folder") {
          return { ...node, data: { ...node.data, collapsed: false } } as AppNode;
        }
        if (node.type === "list") {
          return { ...node, data: { ...node.data, collapsed: true } } as AppNode;
        }
        return node;
      });

      const finalNodes = calculateNodeVisibility(updatedNodes, state.focusedNodeId);

      return { fullNodes: finalNodes };
    });
  },
});