import { Node, Edge, OnNodesChange, OnEdgesChange } from '@xyflow/react';
import { SEASON_MAP } from "@/config/quarters";

/**
 * ==========================================
 * TYPES DO GRÁFICO (REACT FLOW / XYFLOW)
 * ==========================================
 */

// ------------------------------------------
// 1. ESTADOS E TIPOS BÁSICOS
// ------------------------------------------

export type NodeState = 'active' | 'inactive';
export type Season = keyof typeof SEASON_MAP;


// ------------------------------------------
// 2. DADOS INTERNOS DOS NÓS (Node Data)
// ------------------------------------------

/** Dados do Nó de Espaço (Raiz da hierarquia) */
export interface SpaceNodeData {
  label: string;
  spaceId: string;
  color: string | null;
  collapsed: boolean;
  [key: string]: unknown;
}

/** Dados do Nó de Pasta */
export interface FolderNodeData {
  label: string;
  folderId: string;
  parentId: string;
  listCount: number;
  taskCount?: number;
  state?: NodeState;
  color?: string;
  collapsed: boolean;
  [key: string]: unknown;
}

/** Dados do Nó de Lista */
export interface ListNodeData {
  label: string;
  listId: string;
  parentId: string;
  taskCount: number;
  color: string;
  quarters?: string[];
  primaryQuarter?: string | null;
  state: NodeState;
  collapsed: boolean;
  isDev?: boolean;
  [key: string]: unknown;
}

/** Dados do Nó de Tarefa */
export interface TaskNodeData {
  label: string;
  taskId: string;
  parentId: string;
  status: string;
  statusColor: string;
  priority: string | null;
  priorityColor: string | null;
  dueDate: string | null;
  url: string;
  assignees: string[];
  tags: { name: string; bg: string; fg: string }[];
  quarter: string | null; // Resolvido via custom_fields do ClickUp
  state: NodeState;
  collapsed: boolean;
  variant?: 'default' | 'epic';
  [key: string]: unknown;
}

/** Dados do Nó de Subtarefa */
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
  checklists?: {
    id: string;
    name: string;
    items: { id: string; name: string; resolved: boolean }[]
  }[];
  [key: string]: unknown;
}

/** Dados do Nó Temporário (Formulário inline de criação) */
export interface TempNodeData {
  label: string;
  isTemp: boolean;
  parentId: string;
  parentType: 'folder' | 'list' | 'task';
  collapsed: boolean;
  [key: string]: unknown;
}

// ------------------------------------------
// 3. UNIDADE DISCRIMINADA DE NÓS (Discriminated Union)
// ------------------------------------------

export type SpaceNode = Node<SpaceNodeData, 'space'>;
export type FolderNode = Node<FolderNodeData, 'folder'>;
export type ListNode = Node<ListNodeData, 'list'>;
export type TaskNode = Node<TaskNodeData, 'task'>;
export type SubtaskNode = Node<SubtaskNodeData, 'subtask'>;
export type TempNode = Node<TempNodeData, 'temp'>;

/** União de todos os tipos de Nós válidos na aplicação */
export type AppNode = SpaceNode | FolderNode | ListNode | TaskNode | TempNode | SubtaskNode;

/** Tipo padrão para Edges (Arestas de conexão) */
export type AppEdge = Edge;

/** Estrutura simples para o Grafo */
export interface GraphData {
  nodes: AppNode[];
  edges: AppEdge[];
}
/**Estrutura simples do Space */
export interface SpaceInfo {
  id: string;
  name: string;
  color: string | null;
}
// ------------------------------------------
// 4. CONSTANTES DE PALETA DE CORES
// ------------------------------------------

/** Paleta de cores atribuída iterativamente às listas */
export const LIST_COLORS = [
  '#f472b6', // pink
  '#60a5fa', // blue
  '#34d399', // emerald
  '#fb923c', // orange
  '#a78bfa', // violet
  '#facc15', // yellow
  '#e879f9', // fuchsia
];

// ------------------------------------------
// 5. CONFIGURAÇÕES DE LAYOUT (Dagre/Elk)
// ------------------------------------------

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

/**
 * ==========================================
 * TYPES DA STORE (ZUSTAND SLICES)
 * ==========================================
 */

/** Slice responsável pelo estado do grafo no React Flow */
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

/** Slice responsável pela interface, filtros e modais */
export interface UiSlice {
  isLoading: boolean;
  error: string | null;
  isSidebarOpen: boolean;
  selectedQuarter: Season | null;
  layoutSettings: LayoutSettings;
  quarterPickerModal: {
    isOpen: boolean;
    listName: string;
    folderId: string;
    tempNodeId: string;
  };
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setQuarter: (q: Season | null) => void;
  updateLayoutSettings: (settings: Partial<LayoutSettings>) => void;
  setQuarterPickerModal: (data: Partial<UiSlice['quarterPickerModal']>) => void;
}

/** Slice responsável pelas mutações na API do ClickUp */
export interface ApiSlice {
  createTask: (listId: string, name: string, quarter: Season | null) => Promise<any>;
  createList: (folderId: string, name: string, quarter: Season | null) => Promise<any>;
  createSubtask: (parentTaskId: string, name: string) => Promise<any>;
  updateTask: (taskId: string, updates: { name?: string; quarter?: Season | null; status?: string; tags?: string[] }) => Promise<any>;
  updateList: (listId: string, updates: { name?: string }) => Promise<any>;
  updateNodeTags: (taskId: string, tags: string[]) => void;
}

/** Slice responsável por colapsar e focar ramos da árvore */
export interface HierarchySlice {
  focusedNodeId: string | null;
  toggleNodeCollapsed: (nodeId: string, nodeType?: string) => void;
  viewAllProjects: () => void;
  setFocusedNode: (nodeId: string | null) => void;
}

/** Slice responsável pelos formulários temporários de criação inline */
export interface TempNodeSlice {
  addTempNode: (parentId: string, parentType: 'folder' | 'list' | 'task') => void;
  removeTempNode: (tempNodeId: string) => void;
}

/** Slice com utilitários de desenvolvimento, timers e sincronização */
export interface DevSlice {
  devPanelListId: string | null;
  isSyncingDevMode: boolean;
  activeTimerTaskId: string | null;
  timerStartTime: number | null;
  additionalMs: number;
  timerBaseMs: number;

  openDevPanel: (listId: string) => void;
  closeDevPanel: () => void;
  startTimer: (taskId: string, baseMs?: number) => void;
  stopTimer: () => void;
  tickTimer: () => void;
  toggleDevMode: (listId: string, tasks: any[], enable: boolean, queryClient?: any) => Promise<void>;
}

/** Store Global (intersecção de todos os Slices) */
export type GraphStore = CoreSlice &
  UiSlice &
  ApiSlice &
  HierarchySlice &
  DevSlice &
  TempNodeSlice;