import { ClickUpFolder, ClickUpList, ClickUpTask } from '@/types/clickup';
import { AppNode, AppEdge, NodeState } from '@/types/graph';
import { getAreaColor } from '@/theme/areas';
import { getListQuarters, getPrimaryQuarter, getTaskQuarter } from './quarter-resolver';
import { defaultEdge } from './edge-factory';
import { cleanListName, getDefaultCollapsed, getNodeState } from '@/utils/node-utils';
import { isDevList } from '@/lib/dev-mode';
import { getTaskVariant } from '@/lib/task-variant';

export interface SpaceInfo {
  id: string;
  name: string;
  color: string | null;
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

    nodes.push({
      id: folderNodeId,
      type: 'folder',
      position: { x: 0, y: 0 },
      data: {
        label: folder.name,
        folderId: folder.id,
        listCount: lists.length,
        color: folderColor,
        collapsed: getDefaultCollapsed('folder'),
      },
    });

    edges.push(defaultEdge(spaceNodeId, folderNodeId));

    const listInfos = lists.map(list => {
      const tasks = listTasksMap.get(list.id) ?? [];
      const quarters = getListQuarters(tasks);
      
      // Resolve primary quarter by checking list name first, then fallback to tasks' quarters
      const nameUpper = list.name.toUpperCase();
      let primaryQuarter: string | null = null;
      if (nameUpper.includes('SUMMER')) primaryQuarter = 'SUMMER';
      else if (nameUpper.includes('FALL')) primaryQuarter = 'FALL';
      else if (nameUpper.includes('WINTER')) primaryQuarter = 'WINTER';
      else if (nameUpper.includes('SPRING')) primaryQuarter = 'SPRING';

      if (!primaryQuarter) {
        primaryQuarter = getPrimaryQuarter(quarters);
      }

      // Ensure that if a primaryQuarter is resolved, it is present in the quarters array
      const resolvedQuarters = [...quarters];
      if (primaryQuarter && !resolvedQuarters.includes(primaryQuarter)) {
        resolvedQuarters.push(primaryQuarter);
      }

      return {
        list,
        tasks,
        quarters: resolvedQuarters,
        primaryQuarter,
        listNodeId: `list-${list.id}`,
        listColor: folderColor,
        isDev: isDevList(tasks)
      };
    });

    const order = ['SUMMER', 'FALL', 'WINTER', 'SPRING'];

    // activeQuarters only filters by primaryQuarter to avoid missing/disconnected intermediates
    const activeQuarters = order.filter(q =>
      listInfos.some(l => l.primaryQuarter === q)
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
          isDev: info.isDev,
        },
      });

      if (!info.primaryQuarter || !activeQuarters.includes(info.primaryQuarter)) {
        edges.push(defaultEdge(folderNodeId, info.listNodeId));
      } else {
        const qIndex = activeQuarters.indexOf(info.primaryQuarter);

        if (qIndex === 0) {
          edges.push(defaultEdge(folderNodeId, info.listNodeId));
        } else {
          const prevQ = activeQuarters[qIndex - 1];

          // Filter by primaryQuarter so we link directly and sequentially to the previous season's lists
          const prevLists = listInfos.filter(l =>
            l.primaryQuarter === prevQ
          );

          for (const prev of prevLists) {
            edges.push(defaultEdge(prev.listNodeId, info.listNodeId));
          }
        }
      }

      // ===== TASKS =====
      for (const task of info.tasks) {
        if (task.parent) continue;           // skip subtasks
        if (task.custom_item_id === 1) continue; // skip milestones — they live in DevPanel only

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
            variant: getTaskVariant(task),
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
