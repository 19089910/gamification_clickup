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

export const BASE_URL = 'https://api.clickup.com/api/v2';

export function getHeaders(): HeadersInit {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) throw new Error('CLICKUP_API_TOKEN is not set');

  return {
    Authorization: token,
    'Content-Type': 'application/json',
  };
}

export async function fetchClickUp<T>(path: string): Promise<T> {
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
