import { ClickUpTask, ClickUpList, ChecklistItemPayload } from '@/types/clickup';
import { SEASON_MAP, type Season, TRIMESTRE_FIELD_ID } from '@/config/quarters';
import { BASE_URL, getHeaders } from './api';
import { getStatusFromConfig } from '@/config/status';

export async function createTask(
  listId: string,
  name: string,
  quarter?: Season,
  assignees?: (string | number)[]
): Promise<ClickUpTask> {
  const body: any = { name };

  if (assignees && assignees.length > 0) {
    body.assignees = assignees;
  }

  if (quarter && SEASON_MAP[quarter]) {
    body.custom_fields = [
      {
        id: TRIMESTRE_FIELD_ID,
        value: SEASON_MAP[quarter],
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
    quarter?: Season;
    status?: string;
    tags?: string[];
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
  if (updates.quarter && SEASON_MAP[updates.quarter]) {
    const res = await fetch(`${BASE_URL}/task/${taskId}/field/${TRIMESTRE_FIELD_ID}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        value: SEASON_MAP[updates.quarter],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Update Task Quarter error [${res.status}]: ${error}`);
    }
  }

  // 3. Update tags if provided
  if (updates.tags && updates.tags.length > 0) {
    for (const tag of updates.tags) {
      await addTagToTask(taskId, tag);
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

export async function addTagToTask(
  taskId: string,
  tagName: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/task/${taskId}/tag/${encodeURIComponent(tagName)}`,
    { method: 'POST', headers: getHeaders() }
  );
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Add tag error [${res.status}]: ${error}`);
  }
}

export async function removeTagFromTask(
  taskId: string,
  tagName: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/task/${taskId}/tag/${encodeURIComponent(tagName)}`,
    { method: 'DELETE', headers: getHeaders() }
  );
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Remove tag error [${res.status}]: ${error}`);
  }
}

export async function saveChecklistMutation(taskId: string, items: ChecklistItemPayload[]) {
  const res = await fetch(`/api/clickup/tasks/${taskId}/checklist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    throw new Error('Erro ao salvar o checklist');
  }

  return res.json();
}