// ClickUp API v2 Types

export interface ClickUpTeam {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  members: ClickUpMember[];
}

export interface ClickUpMember {
  user: {
    id: number;
    username: string;
    email: string;
    profilePicture: string | null;
  };
}

export interface ClickUpSpace {
  id: string;
  name: string;
  color: string | null;
  private: boolean;
  avatar: string | null;
  admin_can_manage: boolean;
}

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

export interface ClickUpStatus {
  id: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}

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
  /** ClickUp native: true when this task is flagged as a Milestone */
  milestone?: boolean;
  checklists?: { id: string; name: string; items: { id: string; name: string; resolved: boolean }[] }[];
}

export interface ClickUpTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
  creator: number;
}

export interface ClickUpDependency {
  task_id: string;
  depends_on: string;
  type: number;
  date_created: string;
  userid: string;
}

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

// API Response wrappers
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
