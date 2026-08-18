import { StateCreator } from "zustand";
import { AppNode, GraphStore } from "@/types/graph";
import {
  calculateNodeVisibility,
  toggleSingleNodeCollapse,
  toggleFolderCollapse,
} from "@/utils/hierarchy";

export interface HierarchySlice {
  focusedNodeId: string | null;
  setFocusedNode: (nodeId: string | null) => void;
  toggleNodeCollapsed: (nodeId: string, nodeType?: string) => void;
  viewAllProjects: () => void;
}

export const createHierarchySlice: StateCreator<GraphStore, [], [], HierarchySlice> = (set, get) => ({
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

  // Regra 1, 3 e 4: Toggle genérico que roteia pela regra do nó
  toggleNodeCollapsed: (nodeId, nodeType) => {
    set((state) => {
      let updatedNodes: AppNode[];

      if (nodeType === "folder") {
        // Regra 3: Expande Folder sem vazar Tasks
        updatedNodes = toggleFolderCollapse(state.fullNodes, nodeId);
      } else {
        // Regras 1 e 4: Toggle padrão de Space ou List
        updatedNodes = toggleSingleNodeCollapse(state.fullNodes, nodeId, nodeType || "");
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