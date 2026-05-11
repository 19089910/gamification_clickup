import { MarkerType } from '@xyflow/react';
import { ClickUpFolder, ClickUpList, ClickUpTask } from '@/types/clickup';
import { AppNode, AppEdge, NodeState } from '@/types/graph';
import {TRIMESTRE_FIELD_ID } from './clickup';

export interface SpaceInfo {
  id: string;
  name: string;
  color: string | null;
}

const AREA_COLORS: Record<string, string> = {
  "Agência": "#22C55E",
  "Trabalho": "#3B82F6",
  "Acadêmico": "#EAB308",
  "Científico": "#F97316",
  "Financeiro": "#15803D",
  "Saúde": "#E5E7EB",
  "Artístico": "#8B5CF6",
  "Família": "#EC4899",
  "Inglês": "#06B6D4",
  "Igreja/Social": "#EF4444",
  "Exploração": "#18181B"
};

function getAreaColor(name: string): string {
  const lowerName = name.toLowerCase();
  for (const [area, color] of Object.entries(AREA_COLORS)) {
    if (area.includes('/')) {
      const parts = area.split('/');
      if (parts.some(p => lowerName.includes(p.toLowerCase()))) return color;
    } else {
      if (lowerName.includes(area.toLowerCase())) return color;
    }
  }
  return "#0ea5e9";
}

const defaultEdge = (source: string, target: string): AppEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  animated: false,
  style: { stroke: '#333', strokeWidth: 1.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#555',
    width: 16,
    height: 16,
  },
});

// ✅ Extrai múltiplos quarters das tasks
function getListQuarters(tasks: ClickUpTask[]): string[] {
  const quarters = new Set<string>();

  for (const task of tasks) {
    if (!task.custom_fields) continue;

    const field = task.custom_fields.find(f =>
      f.name.toLowerCase().includes('trimestre')
    );

    if (!field || field.value === undefined) continue;

    const options = field.type_config?.options || [];

    const selected = options.find((o: any) =>
      o.id === field.value || o.orderindex === field.value
    );

    if (!selected?.name) continue;

    const val = selected.name.toUpperCase();

    if (val.includes('SUMMER')) quarters.add('SUMMER');
    if (val.includes('FALL')) quarters.add('FALL');
    if (val.includes('WINTER')) quarters.add('WINTER');
    if (val.includes('SPRING')) quarters.add('SPRING');
  }

  return Array.from(quarters);
}

// ✅ Define quarter principal (para grafo)
function getPrimaryQuarter(quarters: string[]): string | null {
  const order = ['SUMMER', 'FALL', 'WINTER', 'SPRING'];
  return order.find(q => quarters.includes(q)) || null;
}

function getNodeState(quarters: string[], selectedQuarter: string | null): NodeState {
  if (!selectedQuarter || selectedQuarter === 'All') return 'active';
  return quarters.includes(selectedQuarter) ? 'active' : 'inactive';
}

function getTaskQuarter(task: ClickUpTask): string | null {
  const field = task.custom_fields?.find(f =>
    f.name.toLowerCase().includes('trimestre')
  );

  if (!field || field.value === undefined) return null;

  const options = field.type_config?.options || [];

  const selected = options.find((o: any) =>
    o.id === field.value || o.orderindex === field.value
  );

  return selected?.name?.toUpperCase() || null;
}

function cleanListName(name: string): string {
  // Removes strings like [TAG] or (TAG) from the start/middle of the list name
  return name.replace(/\[.*?\]|\(.*?\)/g, '').trim();
}

type NodeType = 'space' | 'folder' | 'list' | 'task';

function getDefaultCollapsed(type: NodeType): boolean {
  switch (type) {
    case 'space':
      return false;
    case 'folder':
      return true; // Folders iniciam fechados
    case 'list':
      return false;
    case 'task':
      return false;
    default:
      return false;
  }
}

export function transformClickUpToGraph(
  space: SpaceInfo,
  folders: ClickUpFolder[],
  folderlessLists: ClickUpList[],
  folderListsMap: Map<string, ClickUpList[]>,
  listTasksMap: Map<string, ClickUpTask[]>,
  selectedQuarter: string | null = null
): { nodes: AppNode[]; edges: AppEdge[] } {

  const nodes: AppNode[] = [];
  const edges: AppEdge[] = [];

  const spaceNodeId = `space-${space.id}`;

  nodes.push({
    id: spaceNodeId,
    type: 'space',
    position: { x: 0, y: 0 },
    data: {
      label: space.name,
      spaceId: space.id,
      color: space.color,
      collapsed: getDefaultCollapsed('space'),
    },
  });

  // ===== FOLDERS =====
  for (const folder of folders) {
    const folderNodeId = `folder-${folder.id}`;
    const folderColor = getAreaColor(folder.name);
    const lists = folderListsMap.get(folder.id) ?? [];
    const folderTaskCount = lists.reduce((acc, list) => acc + (listTasksMap.get(list.id)?.length || 0), 0);

    nodes.push({
      id: folderNodeId,
      type: 'folder',
      position: { x: 0, y: 0 },
      data: {
        label: folder.name,
        folderId: folder.id,
        taskCount: folderTaskCount.toString(),
        color: folderColor,
        collapsed: getDefaultCollapsed('folder'),
      },
    });

    edges.push(defaultEdge(spaceNodeId, folderNodeId));

    const listInfos = lists.map(list => {
      const tasks = listTasksMap.get(list.id) ?? [];
      const quarters = getListQuarters(tasks);
      const primaryQuarter = getPrimaryQuarter(quarters);

      return {
        list,
        tasks,
        quarters,
        primaryQuarter,
        listNodeId: `list-${list.id}`,
        listColor: folderColor
      };
    });

    const order = ['SUMMER', 'FALL', 'WINTER', 'SPRING'];

    const activeQuarters = order.filter(q =>
      listInfos.some(l => l.quarters.includes(q))
    );

    for (const info of listInfos) {
      const state = getNodeState(info.quarters, selectedQuarter);

      nodes.push({
        id: info.listNodeId,
        type: 'list',
        position: { x: 0, y: 0 },
        data: {
          label: cleanListName(info.list.name),
          listId: info.list.id,
          taskCount: info.tasks.length,
          color: info.listColor,
          quarters: info.quarters,
          primaryQuarter: info.primaryQuarter,
          state,
          collapsed: getDefaultCollapsed('list'),
        },
      });

      if (!info.primaryQuarter) {
        edges.push(defaultEdge(folderNodeId, info.listNodeId));
      } else {
        const qIndex = activeQuarters.indexOf(info.primaryQuarter);

        if (qIndex === 0) {
          edges.push(defaultEdge(folderNodeId, info.listNodeId));
        } else {
          const prevQ = activeQuarters[qIndex - 1];

          const prevLists = listInfos.filter(l =>
            l.quarters.includes(prevQ)
          );

          for (const prev of prevLists) {
            edges.push(defaultEdge(prev.listNodeId, info.listNodeId));
          }
        }
      }

      // ===== TASKS =====
      for (const task of info.tasks) {
        if (task.parent) continue;

        const taskNodeId = `task-${task.id}`;
        const taskQuarter = getTaskQuarter(task);
        const taskState: NodeState = (!selectedQuarter || selectedQuarter === 'All' || taskQuarter === selectedQuarter) ? 'active' : 'inactive';

        nodes.push({
          id: taskNodeId,
          type: 'task',
          position: { x: 0, y: 0 },
          data: {
            label: task.name,
            taskId: task.id,
            status: task.status?.status ?? '',
            statusColor: task.status?.color ?? '#999',
            // DEBUG: Log do objeto de status real do ClickUp
            rawStatus: task.status,
            priority: task.priority?.priority ?? null,
            priorityColor: task.priority?.color ?? null,
            dueDate: task.due_date ?? null,
            url: task.url ?? '',
            assignees: task.assignees?.map(a => a.username) ?? [],
            tags: task.tags?.map(t => ({
              name: t.name,
              bg: t.tag_bg,
              fg: t.tag_fg
            })) ?? [],
            quarter: taskQuarter ?? null,  // resolved from custom_fields
            state: taskState,
            collapsed: getDefaultCollapsed('task'),

          },
        });

        edges.push({
          ...defaultEdge(info.listNodeId, taskNodeId),
          style: { stroke: info.listColor + '55', strokeWidth: 1 },
        });
      }
    }
  }

  return { nodes, edges };
}
