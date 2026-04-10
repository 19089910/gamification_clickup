import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange } from '@xyflow/react';
import { AppNode, AppEdge } from '@/types/graph';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth() + 1; // 1-12
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

interface GraphStore {
  nodes: AppNode[];
  edges: AppEdge[];
  selectedNode: AppNode | null;
  isLoading: boolean;
  error: string | null;
  spaceId: string;
  isSidebarOpen: boolean;
  selectedQuarter: Quarter | null;

  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange<AppEdge>;
  setSelectedNode: (node: AppNode | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSpaceId: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setQuarter: (q: Quarter | null) => void;
  
  // New: task and list creation/update
  createTask: (listId: string, name: string, quarter: string | null) => Promise<any>;
  createList: (folderId: string, name: string, quarter: string | null) => Promise<any>;
  updateTask: (taskId: string, updates: { name?: string; quarter?: string }) => Promise<any>;

  // UI state for editing
  editTaskModal: {
    isOpen: boolean;
    taskId: string;
    name: string;
    quarter: string;
  };
  setEditTaskModal: (data: Partial<GraphStore['editTaskModal']>) => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  isLoading: false,
  error: null,
  spaceId: '',
  isSidebarOpen: false,
  selectedQuarter: getCurrentQuarter(),
  
  editTaskModal: {
    isOpen: false,
    taskId: '',
    name: '',
    quarter: '',
  },

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
  setQuarter: (q) => set({ selectedQuarter: q }),
  
  setEditTaskModal: (data) => set({ 
    editTaskModal: { ...get().editTaskModal, ...data } 
  }),

  createTask: async (listId, name, quarter) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/clickup/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, name, quarter }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create task');
      }

      const task = await res.json();
      set({ isLoading: false });
      return task;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  createList: async (folderId, name, quarter) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/clickup/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, name, quarter }),
      });
      
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create list');
      }

      set({ isLoading: false });
      return result; // contains { list, taskCreated, taskWarning }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateTask: async (taskId, updates) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/clickup/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update task');
      }

      const result = await res.json();
      set({ isLoading: false });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
}));



