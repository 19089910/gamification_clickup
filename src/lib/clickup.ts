import {
  TeamsResponse,
  SpacesResponse,
  FoldersResponse,
  ListsResponse,
  TasksResponse,
  ClickUpTeam,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpList,
  ClickUpTask,
} from '@/types/clickup';

const BASE_URL = 'https://api.clickup.com/api/v2';

function getHeaders(): HeadersInit {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) throw new Error('CLICKUP_API_TOKEN is not set');

  return {
    Authorization: token,
    'Content-Type': 'application/json',
  };
}

async function fetchClickUp<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ClickUp API error [${res.status}]: ${error}`);
  }

  return res.json() as Promise<T>;
}

export async function getTeams(): Promise<ClickUpTeam[]> {
  const data = await fetchClickUp<TeamsResponse>('/team');
  return data.teams;
}

export async function getMe(): Promise<any> {
  return fetchClickUp<{ user: any }>('/user');
}

export async function getSpaces(teamId: string): Promise<ClickUpSpace[]> {
  const data = await fetchClickUp<SpacesResponse>(`/team/${teamId}/space?archived=false`);
  return data.spaces;
}

export async function getFolders(spaceId: string): Promise<ClickUpFolder[]> {
  const data = await fetchClickUp<FoldersResponse>(`/space/${spaceId}/folder?archived=false`);
  return data.folders;
}

export async function getLists(folderId: string): Promise<ClickUpList[]> {
  const data = await fetchClickUp<ListsResponse>(`/folder/${folderId}/list?archived=false`);
  return data.lists;
}

export async function getFolderlessLists(spaceId: string): Promise<ClickUpList[]> {
  const data = await fetchClickUp<ListsResponse>(`/space/${spaceId}/list?archived=false`);
  return data.lists;
}

export async function getTasks(listId: string): Promise<ClickUpTask[]> {
  const data = await fetchClickUp<TasksResponse>(
    `/list/${listId}/task?archived=false&include_closed=false&subtasks=true&include_markdown_description=false`
  );
  return data.tasks;
}

export const TRIMESTRE_FIELD_ID = '8290f74e-4241-4eac-af4a-08018ecbbffa';
export const QUARTER_MAP: Record<string, string> = {
  Q1: '005bcc9c-0b1b-439e-b086-83ddd9957a71',
  Q2: '09bf455a-d061-41bb-8deb-11512519e841',
  Q3: '26e22e95-38e3-4bd7-854a-d247984dfece',
  Q4: 'ab3e5ed2-8ff7-4c33-a222-281a2e4b841a',
};

// Mapeamento baseado nos logs reais do workspace (Usando os nomes exatos que o ClickUp espera)
export const STATUS_CONFIG = [
  {
    category: 'Não Iniciado',
    statuses: [
      { id: 'planning', label: 'PLANNING', color: '#87909e' },
    ]
  },
  {
    category: 'Ativo',
    statuses: [
      { id: 'in progress', label: 'EM PROGRESSO', color: '#5f55ee' },
      { id: 'at risk', label: 'AT RISK', color: '#e16b16' },
      { id: 'update required', label: 'UPDATE REQUIRED', color: '#f8ae00' },
      { id: 'on hold', label: 'ON HOLD', color: '#aa8d80' },
    ]
  },
  {
    category: 'Feito',
    statuses: [
      { id: 'complete', label: 'CONCLUÍDO', color: '#0f9d9f' },
    ]
  }
];

// Helper para buscar status no config por ID ou por Nome
export function getStatusFromConfig(statusAttr: string) {
  if (!statusAttr) return null;
  const s = statusAttr.toLowerCase();
  for (const group of STATUS_CONFIG) {
    const found = group.statuses.find(item => 
      item.id === statusAttr || 
      item.label.toLowerCase() === s || 
      item.id.split('_').pop()?.toLowerCase() === s
    );
    if (found) return found;
  }
  return null;
}

export async function createTask(
  listId: string,
  name: string,
  quarter?: string,
  assignees?: (string | number)[]
): Promise<ClickUpTask> {
  const body: any = { name };

  if (assignees && assignees.length > 0) {
    body.assignees = assignees;
  }

  if (quarter && QUARTER_MAP[quarter]) {
    body.custom_fields = [
      {
        id: TRIMESTRE_FIELD_ID,
        value: QUARTER_MAP[quarter],
      },
    ];
  }

  const res = await fetch(`${BASE_URL}/list/${listId}/task`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ClickUp API error [${res.status}]: ${error}`);
  }

  return res.json() as Promise<ClickUpTask>;
}

export async function createList(folderId: string, name: string): Promise<ClickUpList> {
  const res = await fetch(`${BASE_URL}/folder/${folderId}/list`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ClickUp API error [${res.status}]: ${error}`);
  }

  return res.json() as Promise<ClickUpList>;
}

export async function addCustomFieldToList(listId: string, fieldId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/list/${listId}/field/${fieldId}`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!res.ok) {
    const data = await res.json();
    return data;
  }

  return res.json();
}

export async function updateTask(
  taskId: string,
  updates: {
    name?: string;
    quarter?: string;
    status?: string;
  }
): Promise<any> {
  // 1. Update name or status if provided (via PUT /task/{id})
  if (updates.name || updates.status) {
    const body: any = {};
    if (updates.name) body.name = updates.name;
    
    let statusToSend = updates.status;
    let labelFallback = '';

    if (updates.status) {
      const config = getStatusFromConfig(updates.status);
      if (config) {
        statusToSend = config.id;
        labelFallback = config.label.toLowerCase();
      }
    }

    if (statusToSend) body.status = statusToSend;

    // Primeira tentativa (preferencialmente por ID)
    let res = await fetch(`${BASE_URL}/task/${taskId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    // Segunda tentativa (Fallback por nome se o ID falhar)
    if (!res.ok && res.status === 400 && labelFallback) {
      console.warn(`Status ID failed for task ${taskId}, retrying with label: ${labelFallback}`);
      body.status = labelFallback;
      res = await fetch(`${BASE_URL}/task/${taskId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Update Task General error [${res.status}]: ${error}`);
    }
  }

  // 2. Update quarter if provided
  if (updates.quarter && QUARTER_MAP[updates.quarter]) {
    const res = await fetch(`${BASE_URL}/task/${taskId}/field/${TRIMESTRE_FIELD_ID}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        value: QUARTER_MAP[updates.quarter],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Update Task Quarter error [${res.status}]: ${error}`);
    }
  }

  return { success: true, ...updates };
}

export async function updateList(
  listId: string,
  updates: { name?: string }
): Promise<any> {
  const res = await fetch(`${BASE_URL}/list/${listId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Update List error [${res.status}]: ${error}`);
  }

  return res.json();
}
