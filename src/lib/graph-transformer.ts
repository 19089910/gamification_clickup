import { MarkerType } from '@xyflow/react';
import { ClickUpFolder, ClickUpList, ClickUpTask } from '@/types/clickup';
import { AppNode, AppEdge } from '@/types/graph';

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
  return "#0ea5e9"; // Default generic color
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

  // Helper function to extract the Quarter (Q1, Q2, Q3, Q4)
  function getQuarter(list: ClickUpList, tasks: ClickUpTask[]): string | null {
    const nameMatch = list.name.match(/\b(Q[1-4])\b/i);
    if (nameMatch) return nameMatch[1].toUpperCase();

    // Check Custom Fields on Tasks
    for (const task of tasks) {
      if (task.custom_fields) {
        const field = task.custom_fields.find(f => f.name.toLowerCase().includes('trimestre'));
        if (field && field.value !== undefined) {
           const options = field.type_config?.options || [];
           // Dropdown values are indices mapping to options.orderindex or index
           const selectedOption = options.find((o: any) => o.orderindex === field.value || o.id === field.value);
           if (selectedOption && selectedOption.name) {
             const val = selectedOption.name.toUpperCase();
             if (val.includes('Q1')) return 'Q1';
             if (val.includes('Q2')) return 'Q2';
             if (val.includes('Q3')) return 'Q3';
             if (val.includes('Q4')) return 'Q4';
           }
        }
      }
    }
    return null;
  }

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
    const folderColor = getAreaColor(folder.name);
    nodes.push({
      id: folderNodeId,
      type: 'folder',
      position: { x: 0, y: 0 },
      data: {
        label: folder.name,
        folderId: folder.id,
        taskCount: folder.task_count,
        color: folderColor,
      },
    });
    edges.push(defaultEdge(spaceNodeId, folderNodeId));

    // --- LIST NODES (inside folder) ---
    const lists = folderListsMap.get(folder.id) ?? [];
    
    // Group and identify Quarters
    const listInfos = lists.map(list => {
      const tasks = listTasksMap.get(list.id) ?? [];
      const quarter = getQuarter(list, tasks);
      let cleanName = list.name;
      if (quarter) {
        cleanName = cleanName.replace(new RegExp(`\\[?${quarter}\\]?[-\\s:]*`, 'i'), '').trim();
      }
      return { list, quarter, cleanName, tasks, listNodeId: `list-${list.id}`, listColor: folderColor };
    });

    const quartersOrder = ['Q1', 'Q2', 'Q3', 'Q4'];
    const activeQuarters = quartersOrder.filter(q => listInfos.some(info => info.quarter === q));

    for (const info of listInfos) {
      nodes.push({
        id: info.listNodeId,
        type: 'list',
        position: { x: 0, y: 0 },
        data: {
          label: info.cleanName,
          listId: info.list.id,
          taskCount: info.list.task_count,
          color: info.listColor,
          quarter: info.quarter // Optional meta tag
        },
      });

      // Edge routing logic:
      if (!info.quarter) {
        // No quarter? Connect directly to folder
        edges.push({ ...defaultEdge(folderNodeId, info.listNodeId), style: { stroke: info.listColor + '88', strokeWidth: 1.5 } });
      } else {
        const qIndex = activeQuarters.indexOf(info.quarter);
        if (qIndex === 0) {
          // First active quarter connects to folder
          edges.push({ ...defaultEdge(folderNodeId, info.listNodeId), style: { stroke: info.listColor + '88', strokeWidth: 1.5 } });
        } else {
          // Sequenced quarter connects to ALL lists from the PREVIOUS active quarter
          const prevQ = activeQuarters[qIndex - 1];
          const prevLists = listInfos.filter(l => l.quarter === prevQ);
          for (const prev of prevLists) {
             edges.push({ ...defaultEdge(prev.listNodeId, info.listNodeId), style: { stroke: info.listColor + '88', strokeWidth: 1.5 } });
          }
        }
      }

      // --- TASK NODES ---
      for (const task of info.tasks) {
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
          ...defaultEdge(info.listNodeId, taskNodeId),
          style: { stroke: info.listColor + '55', strokeWidth: 1 },
        });
      }
    }
  }

  // --- FOLDERLESS LISTS (direct children of space) ---
  const folderlessInfos = folderlessLists.map(list => {
    const tasks = listTasksMap.get(list.id) ?? [];
    const quarter = getQuarter(list, tasks);
    let cleanName = list.name;
    if (quarter) {
      cleanName = cleanName.replace(new RegExp(`\\[?${quarter}\\]?[-\\s:]*`, 'i'), '').trim();
    }
    const listColor = getAreaColor(list.name);
    return { list, quarter, cleanName, tasks, listNodeId: `list-${list.id}`, listColor };
  });

  const quartersOrderStandalone = ['Q1', 'Q2', 'Q3', 'Q4'];
  const activeQuartersStandalone = quartersOrderStandalone.filter(q => folderlessInfos.some(info => info.quarter === q));

  for (const info of folderlessInfos) {
    nodes.push({
      id: info.listNodeId,
      type: 'list',
      position: { x: 0, y: 0 },
      data: {
        label: info.cleanName,
        listId: info.list.id,
        taskCount: info.list.task_count,
        color: info.listColor,
      },
    });

    if (!info.quarter) {
      edges.push({ ...defaultEdge(spaceNodeId, info.listNodeId), style: { stroke: info.listColor + '88', strokeWidth: 1.5 } });
    } else {
      const qIndex = activeQuartersStandalone.indexOf(info.quarter);
      if (qIndex === 0) {
        edges.push({ ...defaultEdge(spaceNodeId, info.listNodeId), style: { stroke: info.listColor + '88', strokeWidth: 1.5 } });
      } else {
        const prevQ = activeQuartersStandalone[qIndex - 1];
        const prevLists = folderlessInfos.filter(l => l.quarter === prevQ);
        for (const prev of prevLists) {
           edges.push({ ...defaultEdge(prev.listNodeId, info.listNodeId), style: { stroke: info.listColor + '88', strokeWidth: 1.5 } });
        }
      }
    }

    // Tasks in folderless lists
    for (const task of info.tasks) {
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
        ...defaultEdge(info.listNodeId, taskNodeId),
        style: { stroke: info.listColor + '55', strokeWidth: 1 },
      });
    }
  }

  return { nodes, edges };
}
