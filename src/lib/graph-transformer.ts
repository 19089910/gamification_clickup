import { MarkerType } from '@xyflow/react';
import { ClickUpFolder, ClickUpList, ClickUpTask } from '@/types/clickup';
import { AppNode, AppEdge, LIST_COLORS } from '@/types/graph';

export interface SpaceInfo {
  id: string;
  name: string;
  color: string | null;
}

let colorIndex = 0;

function nextColor(): string {
  const color = LIST_COLORS[colorIndex % LIST_COLORS.length];
  colorIndex++;
  return color;
}

const defaultEdge = (source: string, target: string, animated = false): AppEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  animated,
  style: { stroke: '#333', strokeWidth: 1.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#555',
    width: 16,
    height: 16,
  },
});

export function transformClickUpToGraph(
  space: SpaceInfo,
  folders: ClickUpFolder[],
  folderlessLists: ClickUpList[],
  folderListsMap: Map<string, ClickUpList[]>,
  listTasksMap: Map<string, ClickUpTask[]>
): { nodes: AppNode[]; edges: AppEdge[] } {
  const nodes: AppNode[] = [];
  const edges: AppEdge[] = [];

  colorIndex = 0; // reset color assignment

  // --- SPACE NODE (ROOT) ---
  const spaceNodeId = `space-${space.id}`;
  nodes.push({
    id: spaceNodeId,
    type: 'space',
    position: { x: 0, y: 0 },
    data: {
      label: space.name,
      spaceId: space.id,
      color: space.color,
    },
  });

  // --- FOLDER NODES ---
  for (const folder of folders) {
    const folderNodeId = `folder-${folder.id}`;
    nodes.push({
      id: folderNodeId,
      type: 'folder',
      position: { x: 0, y: 0 },
      data: {
        label: folder.name,
        folderId: folder.id,
        taskCount: folder.task_count,
      },
    });
    edges.push(defaultEdge(spaceNodeId, folderNodeId));

    // --- LIST NODES (inside folder) ---
    const lists = folderListsMap.get(folder.id) ?? [];
    for (const list of lists) {
      const listColor = nextColor();
      const listNodeId = `list-${list.id}`;
      nodes.push({
        id: listNodeId,
        type: 'list',
        position: { x: 0, y: 0 },
        data: {
          label: list.name,
          listId: list.id,
          taskCount: list.task_count,
          color: listColor,
        },
      });
      edges.push({
        ...defaultEdge(folderNodeId, listNodeId),
        style: { stroke: listColor + '88', strokeWidth: 1.5 },
      });

      // --- TASK NODES ---
      const tasks = listTasksMap.get(list.id) ?? [];
      for (const task of tasks) {
        if (task.parent) continue; // skip subtasks at top level
        const taskNodeId = `task-${task.id}`;
        nodes.push({
          id: taskNodeId,
          type: 'task',
          position: { x: 0, y: 0 },
          data: {
            label: task.name,
            taskId: task.id,
            status: task.status.status,
            statusColor: task.status.color,
            priority: task.priority?.priority ?? null,
            priorityColor: task.priority?.color ?? null,
            dueDate: task.due_date,
            url: task.url,
            assignees: task.assignees.map((a) => a.username),
            tags: task.tags.map((t) => ({ name: t.name, bg: t.tag_bg, fg: t.tag_fg })),
          },
        });
        edges.push({
          ...defaultEdge(listNodeId, taskNodeId),
          style: { stroke: listColor + '55', strokeWidth: 1 },
        });
      }
    }
  }

  // --- FOLDERLESS LISTS (direct children of space) ---
  for (const list of folderlessLists) {
    const listColor = nextColor();
    const listNodeId = `list-${list.id}`;
    nodes.push({
      id: listNodeId,
      type: 'list',
      position: { x: 0, y: 0 },
      data: {
        label: list.name,
        listId: list.id,
        taskCount: list.task_count,
        color: listColor,
      },
    });
    edges.push({
      ...defaultEdge(spaceNodeId, listNodeId),
      style: { stroke: listColor + '88', strokeWidth: 1.5 },
    });

    // Tasks in folderless lists
    const tasks = listTasksMap.get(list.id) ?? [];
    for (const task of tasks) {
      if (task.parent) continue;
      const taskNodeId = `task-${task.id}`;
      nodes.push({
        id: taskNodeId,
        type: 'task',
        position: { x: 0, y: 0 },
        data: {
          label: task.name,
          taskId: task.id,
          status: task.status.status,
          statusColor: task.status.color,
          priority: task.priority?.priority ?? null,
          priorityColor: task.priority?.color ?? null,
          dueDate: task.due_date,
          url: task.url,
          assignees: task.assignees.map((a) => a.username),
          tags: task.tags.map((t) => ({ name: t.name, bg: t.tag_bg, fg: t.tag_fg })),
        },
      });
      edges.push({
        ...defaultEdge(listNodeId, taskNodeId),
        style: { stroke: listColor + '55', strokeWidth: 1 },
      });
    }
  }

  return { nodes, edges };
}
