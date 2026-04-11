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
  // Source of truth
  fullNodes: AppNode[];
  fullEdges: AppEdge[];

  // Visible & Layouted (sent to ReactFlow)
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
  setFullGraph: (nodes: AppNode[], edges: AppEdge[]) => void;
  
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
  updateList: (listId: string, updates: { name?: string }) => Promise<any>;



  // UI state for editing
  editTaskModal: {
    isOpen: boolean;
    taskId: string;
    name: string;
    quarter: string;
  };
  setEditTaskModal: (data: Partial<GraphStore['editTaskModal']>) => void;

  // Hierarchical controls
  toggleNodeCollapsed: (nodeId: string) => void;
  expandPathToNode: (nodeId: string) => void;

  // Temp node for inline creation
  addTempNode: (parentId: string, parentType: 'folder' | 'list') => string;
  removeTempNode: (nodeId: string) => void;

  // Quarter picker modal (for creating lists inline)
  quarterPickerModal: {
    isOpen: boolean;
    listName: string;
    folderId: string;
    tempNodeId: string;
  };
  setQuarterPickerModal: (data: Partial<GraphStore['quarterPickerModal']>) => void;
}


export const useGraphStore = create<GraphStore>((set, get) => ({
  fullNodes: [],
  fullEdges: [],
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
  
  setFullGraph: (nodes, edges) => {
    set({ fullNodes: nodes, fullEdges: edges });
    // Trigger initial layout/visibility logic (will be handled in a separate effect or manually for now)
  },

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

  updateList: async (listId, updates) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/clickup/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update list');
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

  toggleNodeCollapsed: (nodeId) => {

    set((state) => ({
      fullNodes: state.fullNodes.map((node) => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          data: { ...node.data, collapsed: !node.data.collapsed }
        } as AppNode;
      }),
    }));
  },

  expandPathToNode: (nodeId) => {
    set((state) => {
      const newFullNodes = state.fullNodes.map(node => ({ ...node }));
      const visited = new Set<string>();

      function expandParents(childId: string) {
        if (visited.has(childId)) return;
        visited.add(childId);

        state.fullEdges.forEach((edge) => {
          if (edge.target === childId) {
            const parentIndex = newFullNodes.findIndex((n) => n.id === edge.source);
            if (parentIndex !== -1) {
              const parent = newFullNodes[parentIndex];
              if (parent.data.collapsed) {
                newFullNodes[parentIndex] = {
                  ...parent,
                  data: { ...parent.data, collapsed: false },
                } as AppNode;
              }
              expandParents(parent.id);
            }
          }
        });
      }

      expandParents(nodeId);
      return { fullNodes: newFullNodes as AppNode[] };
    });
  },

  // Quarter picker modal
  quarterPickerModal: {
    isOpen: false,
    listName: '',
    folderId: '',
    tempNodeId: '',
  },

  setQuarterPickerModal: (data) => set({
    quarterPickerModal: { ...get().quarterPickerModal, ...data },
  }),

  // Temp node helpers — operate on visible nodes only (temp nodes are UI-only)
  addTempNode: (parentId, parentType) => {
    const tempId = `temp-${Date.now()}`;

    // Find parent position in visible nodes
    const parentNode = get().nodes.find(n => n.id === parentId);
    const parentX = parentNode?.position.x ?? 0;
    const parentY = parentNode?.position.y ?? 0;

    const tempNode = {
      id: tempId,
      type: 'temp' as const,
      position: { x: parentX + 300, y: parentY },
      data: {
        label: '',
        isTemp: true,
        parentId,
        parentType,
        collapsed: false,
      },
    } as AppNode;

    const tempEdge = {
      id: `temp-edge-${tempId}`,
      source: parentId,
      target: tempId,
      style: { stroke: '#555', strokeDasharray: '5 3', strokeWidth: 1 },
    } as AppEdge;

    set((state) => ({
      nodes: [...state.nodes, tempNode],
      edges: [...state.edges, tempEdge],
    }));

    return tempId;
  },

  removeTempNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    }));
  },
}));







