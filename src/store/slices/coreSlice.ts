import { StateCreator } from 'zustand';
import { GraphStore, AppNode, AppEdge, CoreSlice } from '@/types/graph';
import { applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange } from '@xyflow/react';
import { syncSelectedNode } from '../helpers';

export const createCoreSlice: StateCreator<GraphStore, [], [], CoreSlice> = (set, get) => ({
  fullNodes: [],
  fullEdges: [],
  nodes: [],
  edges: [],
  selectedNode: null,
  spaceId: '',

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  setFullGraph: (nodes, edges) => {
    set((state) => ({ 
      fullNodes: nodes, 
      fullEdges: edges,
      selectedNode: syncSelectedNode(state.selectedNode, nodes)
    }));
  },

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),

  setSelectedNode: (node) => set({ selectedNode: node, isSidebarOpen: node !== null }),
  setSpaceId: (id) => set({ spaceId: id }),
});
