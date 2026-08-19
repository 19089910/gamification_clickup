//Cada tipo de nó possui uma fábrica dedicada. Se o payload de uma Task mudar, você altera apenas a fábrica de Tasks.
import { ClickUpFolder, ClickUpList, ClickUpTask } from '@/types/clickup';
import { AppNode, NodeState } from '@/types/graph';
import { getDefaultCollapsed, cleanListName } from '@/utils/node-utils';
import { getTaskVariant } from '@/lib/task-variant';

export function createSpaceNode(space: { id: string; name: string; color: string | null }): AppNode {
    return {
        id: `space-${space.id}`,
        type: 'space',
        position: { x: 0, y: 0 },
        data: {
            label: space.name,
            spaceId: space.id,
            color: space.color,
            collapsed: getDefaultCollapsed('space'),
        },
    };
}

export function createFolderNode(folder: ClickUpFolder, spaceNodeId: string, listCount: number, folderColor: string): AppNode {
    return {
        id: `folder-${folder.id}`,
        type: 'folder',
        position: { x: 0, y: 0 },
        data: {
            label: folder.name,
            folderId: folder.id,
            listCount,
            color: folderColor,
            collapsed: getDefaultCollapsed('folder'),
            parentId: spaceNodeId,
        },
    };
}

export function createListNode(
    list: ClickUpList,
    folderNodeId: string,
    listColor: string,
    taskCount: number,
    quarters: string[],
    primaryQuarter: string | null,
    state: NodeState,
    isDev: boolean
): AppNode {
    return {
        id: `list-${list.id}`,
        type: 'list',
        position: { x: 0, y: 0 },
        data: {
            label: cleanListName(list.name),
            listId: list.id,
            taskCount,
            color: listColor,
            quarters,
            primaryQuarter,
            state,
            collapsed: getDefaultCollapsed('list'),
            isDev,
            parentId: folderNodeId,
        },
    };
}

export function createTaskNode(task: ClickUpTask, parentListId: string, quarter: string | null, state: NodeState): AppNode {
    return {
        id: `task-${task.id}`,
        type: 'task',
        position: { x: 0, y: 0 },
        data: {
            label: task.name,
            taskId: task.id,
            status: task.status?.status ?? '',
            statusColor: task.status?.color ?? '#999',
            rawStatus: task.status,
            priority: task.priority?.priority ?? null,
            priorityColor: task.priority?.color ?? null,
            dueDate: task.due_date ?? null,
            url: task.url ?? '',
            assignees: task.assignees?.map(a => a.username) ?? [],
            tags: task.tags?.map(t => ({ name: t.name, bg: t.tag_bg, fg: t.tag_fg })) ?? [],
            quarter,
            state,
            collapsed: getDefaultCollapsed('task'),
            variant: getTaskVariant(task),
            parentId: parentListId,
        },
    };
}

export function createSubtaskNode(sub: ClickUpTask, parentTaskId: string, state: NodeState): AppNode {
    return {
        id: `subtask-${sub.id}`,
        type: 'subtask',
        position: { x: 0, y: 0 },
        data: {
            label: sub.name,
            taskId: sub.id,
            status: sub.status?.status ?? '',
            statusColor: sub.status?.color ?? '#999',
            state,
            collapsed: getDefaultCollapsed('subtask'),
            url: sub.url ?? '',
            time_spent: sub.time_spent ?? 0,
            checklists: sub.checklists ?? [],
            parentId: parentTaskId,
        },
    };
}