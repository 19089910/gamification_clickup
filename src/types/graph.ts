import { Node, Edge } from '@xyflow/react';

export type NodeState = 'active' | 'inactive';

// Node data types
export interface SpaceNodeData {
  label: string;
  spaceId: string;
  color: string | null;
  [key: string]: unknown;
}

export interface FolderNodeData {
  label: string;
  folderId: string;
  taskCount: string;
  state?: NodeState;
  color?: string;
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
  state: NodeState;
  [key: string]: unknown;
}

// Node types (discriminated union)
export type SpaceNode = Node<SpaceNodeData, 'space'>;
export type FolderNode = Node<FolderNodeData, 'folder'>;
export type ListNode = Node<ListNodeData, 'list'>;
export type TaskNode = Node<TaskNodeData, 'task'>;

export type AppNode = SpaceNode | FolderNode | ListNode | TaskNode;
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
  '#22d3ee', // cyan
];
