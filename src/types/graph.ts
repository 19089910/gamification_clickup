import { Node, Edge } from '@xyflow/react';

export type NodeState = 'active' | 'inactive';

// Node data types
export interface SpaceNodeData {
  label: string;
  spaceId: string;
  color: string | null;
  collapsed: boolean;
  [key: string]: unknown;
}

export interface FolderNodeData {
  label: string;
  folderId: string;
  listCount: number;
  taskCount?: number;
  state?: NodeState;
  color?: string;
  collapsed: boolean;
  [key: string]: unknown;
}

export interface ListNodeData {
  label: string;
  listId: string;
  taskCount: number;
  color: string;
  quarters?: string[];
  primaryQuarter?: string | null;
  state: NodeState;
  collapsed: boolean;
  isDev?: boolean;
  [key: string]: unknown;
}

export interface TaskNodeData {
  label: string;
  taskId: string;
  status: string;
  statusColor: string;
  priority: string | null;
  priorityColor: string | null;
  dueDate: string | null;
  url: string;
  assignees: string[];
  tags: { name: string; bg: string; fg: string }[];
  quarter: string | null;  // resolved from ClickUp custom_fields
  state: NodeState;
  collapsed: boolean;
  variant?: 'default' | 'epic';
  [key: string]: unknown;
}



export interface SubtaskNodeData {
  label: string;
  taskId: string;
  parentId: string;
  status: string;
  statusColor: string;
  state: NodeState;
  collapsed: boolean;
  url?: string;
  time_spent?: number;
  checklists?: { id: string; name: string; items: { id: string; name: string; resolved: boolean }[] }[];
  [key: string]: unknown;
}

export interface TempNodeData {
  label: string;
  isTemp: boolean;
  parentId: string;
  parentType: 'folder' | 'list';
  collapsed: boolean;
  [key: string]: unknown;
}

// Node types (discriminated union)
export type SpaceNode = Node<SpaceNodeData, 'space'>;
export type FolderNode = Node<FolderNodeData, 'folder'>;
export type ListNode = Node<ListNodeData, 'list'>;
export type TaskNode = Node<TaskNodeData, 'task'>;
export type TempNode = Node<TempNodeData, 'temp'>;
export type SubtaskNode = Node<SubtaskNodeData, 'subtask'>;

export type AppNode = SpaceNode | FolderNode | ListNode | TaskNode | TempNode | SubtaskNode;
export type AppEdge = Edge;


// Graph state
export interface GraphData {
  nodes: AppNode[];
  edges: AppEdge[];
}

// List color palette (assigned by index)
export const LIST_COLORS = [
  '#f472b6', // pink
  '#60a5fa', // blue
  '#34d399', // emerald
  '#fb923c', // orange
  '#a78bfa', // violet
  '#facc15', // yellow
  '#e879f9', // fuchsia
];

// --- Store Types ---
export type Quarter = 'SUMMER' | 'FALL' | 'WINTER' | 'SPRING';

export interface LayoutSettings {
  nodesep: number;
  ranksep: number;
  marginx: number;
  marginy: number;
  nodeWidth: number;
  nodeHeight: number;
  nodeHeightsByType: {
    space: number;
    folder: number;
    list: number;
    task: number;
    subtask: number;
  };
}

import { OnNodesChange, OnEdgesChange } from '@xyflow/react';

// --- Store Slices ---

export interface CoreSlice {
  fullNodes: AppNode[];
  fullEdges: AppEdge[];
  nodes: AppNode[];
  edges: AppEdge[];
  selectedNode: AppNode | null;
  spaceId: string;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  setFullGraph: (nodes: AppNode[], edges: AppEdge[]) => void;
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange<AppEdge>;
  setSelectedNode: (node: AppNode | null) => void;
  setSpaceId: (id: string) => void;
}

export interface UiSlice {
  isLoading: boolean;
  error: string | null;
  isSidebarOpen: boolean;
  selectedQuarter: Quarter | null;
  layoutSettings: LayoutSettings;
  editTaskModal: {
    isOpen: boolean;
    taskId: string;
    name: string;
    quarter: string;
  };
  quarterPickerModal: {
    isOpen: boolean;
    listName: string;
    folderId: string;
    tempNodeId: string;
  };
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setQuarter: (q: Quarter | null) => void;
  updateLayoutSettings: (settings: Partial<LayoutSettings>) => void;
  setEditTaskModal: (data: Partial<UiSlice['editTaskModal']>) => void;
  setQuarterPickerModal: (data: Partial<UiSlice['quarterPickerModal']>) => void;
}

export interface ApiSlice {
  createTask: (listId: string, name: string, quarter: string | null) => Promise<any>;
  createList: (folderId: string, name: string, quarter: string | null) => Promise<any>;
  updateTask: (taskId: string, updates: { name?: string; quarter?: string; status?: string; tags?: string[] }) => Promise<any>;
  updateList: (listId: string, updates: { name?: string }) => Promise<any>;
  updateNodeTags: (taskId: string, tags: string[]) => void;
}

export interface HierarchySlice {
  toggleNodeCollapsed: (nodeId: string) => void;
  expandPathToNode: (nodeId: string) => void;
  addTempNode: (parentId: string, parentType: 'folder' | 'list') => string;
  removeTempNode: (nodeId: string) => void;
}

export interface DevSlice {
  devPanelListId: string | null;
  isSyncingDevMode: boolean;
  openDevPanel: (listId: string) => void;
  closeDevPanel: () => void;
  toggleDevMode: (listId: string, tasks: any[], enable: boolean, queryClient: any) => Promise<void>;
}

export type GraphStore = CoreSlice & UiSlice & ApiSlice & HierarchySlice & DevSlice;