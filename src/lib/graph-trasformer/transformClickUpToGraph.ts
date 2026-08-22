//Agora a função principal atua unicamente como Orquestradora/Facade, facilitando a leitura e a manutenção.
import { ClickUpFolder, ClickUpList, ClickUpTask } from '@/types/clickup';
import { AppNode, AppEdge, NodeState, SpaceInfo } from '@/types/graph';
import { getAreaColor } from '@/theme/areas';
import {
    buildResolvedQuarters,
    resolveListPrimaryQuarter,
    getListQuarters,
    getPrimaryQuarter,
    getTaskQuarter
} from './quarter-resolver';
import { defaultEdge } from './edge-factories';
import { getNodeState } from '@/utils/node-utils';
import { isDevList } from '@/lib/dev-mode';

import {
    createSpaceNode,
    createFolderNode,
    createListNode,
    createTaskNode,
    createSubtaskNode
} from './node-factories';
import { createTaskEdge, createSubtaskEdge } from './edge-factories';
import { SEASONS } from '@/config/quarters';

interface ProcessedListInfo {
    list: ClickUpList;
    tasks: ClickUpTask[];
    quarters: string[];
    primaryQuarter: string | null;
    listNodeId: string;
    listColor: string;
    isDev: boolean;
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

    // 1. Space
    const spaceNode = createSpaceNode(space);
    nodes.push(spaceNode);

    // 2. Folders
    for (const folder of folders) {
        const folderColor = getAreaColor(folder.name);
        const lists = folderListsMap.get(folder.id) ?? [];

        const folderNode = createFolderNode(folder, spaceNode.id, lists.length, folderColor);
        nodes.push(folderNode);
        edges.push(defaultEdge(spaceNode.id, folderNode.id));

        // Process List Metadata
        const listInfos: ProcessedListInfo[] = lists.map(list => {
            const tasks = listTasksMap.get(list.id) ?? [];
            const rawQuarters = getListQuarters(tasks);
            const primaryQuarter = resolveListPrimaryQuarter(list.name, getPrimaryQuarter(rawQuarters));
            const quarters = buildResolvedQuarters(rawQuarters, primaryQuarter);

            return {
                list,
                tasks,
                quarters,
                primaryQuarter,
                listNodeId: `list-${list.id}`,
                listColor: folderColor,
                isDev: isDevList(tasks),
            };
        });

        const activeQuarters = SEASONS.filter(q =>
            listInfos.some(l => l.primaryQuarter === q)
        );

        // 3. Lists & Nested Tasks
        for (const info of listInfos) {
            const listState = getNodeState(info.quarters, selectedQuarter);

            nodes.push(
                createListNode(
                    info.list,
                    folderNode.id,
                    info.listColor,
                    info.tasks.length,
                    info.quarters,
                    info.primaryQuarter,
                    listState,
                    info.isDev
                )
            );

            // Connect List Edges (Sequencing by Seasons)
            connectListEdges(info, activeQuarters, folderNode.id, listInfos, edges);

            // 4. Tasks & Subtasks
            processTasks(info, selectedQuarter, nodes, edges);
        }
    }

    return { nodes, edges };
}

// --- Funções Auxiliares de Conexão e Processamento ---

function connectListEdges(
    info: ProcessedListInfo,
    activeQuarters: readonly string[],
    folderNodeId: string,
    allListInfos: ProcessedListInfo[],
    edges: AppEdge[]
): void {
    if (!info.primaryQuarter || !activeQuarters.includes(info.primaryQuarter)) {
        edges.push(defaultEdge(folderNodeId, info.listNodeId));
        return;
    }

    const qIndex = activeQuarters.indexOf(info.primaryQuarter);
    if (qIndex === 0) {
        edges.push(defaultEdge(folderNodeId, info.listNodeId));
    } else {
        const prevQ = activeQuarters[qIndex - 1];
        const prevLists = allListInfos.filter(l => l.primaryQuarter === prevQ);

        for (const prev of prevLists) {
            edges.push(defaultEdge(prev.listNodeId, info.listNodeId));
        }
    }
}

function processTasks(
    info: ProcessedListInfo,
    selectedQuarter: string | null,
    nodes: AppNode[],
    edges: AppEdge[]
): void {
    for (const task of info.tasks) {
        if (task.parent || task.custom_item_id === 1) continue; // Ignora subtasks no loop principal e milestones

        const taskQuarter = getTaskQuarter(task);
        const taskState: NodeState = (!selectedQuarter || selectedQuarter === 'All' || taskQuarter === selectedQuarter)
            ? 'active'
            : 'inactive';

        const taskNode = createTaskNode(task, info.listNodeId, taskQuarter ?? null, taskState);
        nodes.push(taskNode);
        edges.push(createTaskEdge(info.listNodeId, taskNode.id, info.listColor));

        // Process Subtasks
        const subtasks = info.tasks.filter(t => t.parent === task.id);
        for (const sub of subtasks) {
            const subtaskNode = createSubtaskNode(sub, taskNode.id, taskState);
            nodes.push(subtaskNode);
            edges.push(createSubtaskEdge(taskNode.id, subtaskNode.id, info.listColor));
        }
    }
}