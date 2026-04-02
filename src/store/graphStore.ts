import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange } from '@xyflow/react';
import { AppNode, AppEdge } from '@/types/graph';

interface GraphStore {
  nodes: AppNode[];
  edges: AppEdge[];
  selectedNode: AppNode | null;
  isLoading: boolean;
  error: string | null;
  spaceId: string;
  isSidebarOpen: boolean;

  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange<AppEdge>;
  setSelectedNode: (node: AppNode | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSpaceId: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  isLoading: false,
  error: null,
  spaceId: '',
  isSidebarOpen: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  setSelectedNode: (node) => set({ selectedNode: node, isSidebarOpen: node !== null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSpaceId: (id) => set({ spaceId: id }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}));
