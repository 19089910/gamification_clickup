/**
 * ==========================================
 * TYPES DA API DO CLICKUP v2
 * ==========================================
 */

// ------------------------------------------
// 1. USUÁRIOS E EQUIPES
// ------------------------------------------

/** Membro associado a um time ou workspace */
export interface ClickUpMember {
  user: {
    id: number;
    username: string;
    email: string;
    profilePicture: string | null;
  };
}

/** Usuário individual do ClickUp (utilizado em filtros ou perfis) */
export interface ClickUpUser {
  id: number;
  username: string;
  initials: string;
  profilePicture: string;
  color: string;
}

/** Time/Workspace principal do ClickUp */
export interface ClickUpTeam {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  members: ClickUpMember[];
}

// ------------------------------------------
// 2. ESTRUTURA HIERÁRQUICA (Spaces, Folders, Lists)
// ------------------------------------------

/** Espaço de trabalho principal dentro de um time */
export interface ClickUpSpace {
  id: string;
  name: string;
  color: string | null;
  private: boolean;
  avatar: string | null;
  admin_can_manage: boolean;
}

/** Pasta que organiza listas dentro de um Space */
export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  override_statuses: boolean;
  hidden: boolean;
  space: { id: string; name: string };
  task_count: string;
  lists?: ClickUpList[];
}

/** Lista que contém tarefas no ClickUp */
export interface ClickUpList {
  id: string;
  name: string;
  color?: string;
  orderindex: number;
  status: {
    status: string;
    color: string;
    hide_label: boolean;
  } | null;
  priority: {
    priority: string;
    color: string;
  } | null;
  assignee: ClickUpMember['user'] | null;
  task_count: number;
  due_date: string | null;
  start_date: string | null;
  space: { id: string; name: string; access: boolean };
  archived: boolean;
  override_statuses: boolean | null;
  statuses: ClickUpStatus[] | null;
  permission_level: string;
  folder?: { id: string; name: string; hidden: boolean; access: boolean };
}

/** Status customizado aplicável a tarefas e listas */
export interface ClickUpStatus {
  id: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}

// ------------------------------------------
// 3. TAREFAS E METADADOS ASSOCIADOS
// ------------------------------------------

/** Tarefa principal do ClickUp */
export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: {
    status: string;
    color: string;
    type: string;
    orderindex: number;
  };
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  due_date: string | null;
  start_date: string | null;
  priority: {
    id: string;
    priority: string;
    color: string;
    orderindex: string;
  } | null;
  assignees: ClickUpMember['user'][];
  tags: ClickUpTag[];
  parent: string | null;
  url: string;
  list: { id: string; name: string; access: boolean };
  folder: { id: string; name: string; hidden: boolean; access: boolean };
  space: { id: string };
  subtasks?: ClickUpTask[];
  dependencies?: ClickUpDependency[];
  custom_fields?: ClickUpCustomField[];
  /** Tipo Nativo ClickUp: 1 para Marco/Milestone, null ou 0 para Tarefa Comum */
  custom_item_id?: number | null;
  time_spent?: number;
  checklists?: {
    id: string;
    name: string;
    items: { id: string; name: string; resolved: boolean }[]
  }[];
}

/** Tag/Etiqueta associada a uma tarefa */
export interface ClickUpTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
  creator: number;
}

/** Relação de dependência entre tarefas */
export interface ClickUpDependency {
  task_id: string;
  depends_on: string;
  type: number;
  date_created: string;
  userid: string;
}

/** Campo customizado da tarefa */
export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  type_config: any;
  date_created: string;
  hide_from_guests: boolean;
  value?: any;
  required: boolean;
}

// ------------------------------------------
// 4. RESPOSTAS DAS REQUISIÇÕES DA API (Payloads HTTP)
// ------------------------------------------

export interface TeamsResponse {
  teams: ClickUpTeam[];
}

export interface SpacesResponse {
  spaces: ClickUpSpace[];
}

export interface FoldersResponse {
  folders: ClickUpFolder[];
}

export interface ListsResponse {
  lists: ClickUpList[];
}

export interface TasksResponse {
  tasks: ClickUpTask[];
}

// ------------------------------------------
// 5. ESTRUTURAS INTERNAS E UTILITÁRIOS DA APLICAÇÃO
// ------------------------------------------

/** Payload formatado para a renderização de gráficos na aplicação */
export interface GraphApiResponse {
  folders: ClickUpFolder[];
  folderlessLists: ClickUpList[];
  folderListsMap: Record<string, ClickUpList[]>;
  listTasksMap: Record<string, ClickUpTask[]>;
  error?: string;
}

/** Payload para manipulação de itens de checklist na UI */
export interface ChecklistItemPayload {
  id: string;
  name: string;
  resolved: boolean;
  checklistId: string;
  isNew?: boolean;
}