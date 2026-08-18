import { AppNode } from "@/types/graph";

/**
 * Coleta todos os IDs descendentes de um nó pai.
 */
function getDescendantIds(nodes: AppNode[], parentId: string): Set<string> {
    const descendants = new Set<string>();
    const queue = [parentId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        for (const node of nodes) {
            if (node.data?.parentId === currentId) {
                descendants.add(node.id);
                queue.push(node.id);
            }
        }
    }

    return descendants;
}

/**
 * Coleta a cadeia de ancestrais (caminho até a raiz) de um nó.
 */
function getAncestorsPath(nodes: AppNode[], nodeId: string): Set<string> {
    const path = new Set<string>();
    let currentId: string | null = nodeId;

    while (currentId) {
        path.add(currentId);
        const currentNode = nodes.find((n) => n.id === currentId);
        currentId = (currentNode?.data?.parentId as string) || null;
    }

    return path;
}

/**
 * Regra 1: Expandir/Colapsar Space
 * Ao expandir: Garante que Lists, Tasks e Subtasks descendentes comecem colapsadas.
 */
export function toggleSpaceCollapse(nodes: AppNode[], spaceId: string): AppNode[] {
    const spaceNode = nodes.find((n) => n.id === spaceId);
    if (!spaceNode) return nodes;

    const isExpanding = spaceNode.data?.collapsed ?? true;
    const descendantIds = getDescendantIds(nodes, spaceId);

    return nodes.map((node) => {
        if (node.id === spaceId) {
            return { ...node, data: { ...node.data, collapsed: !isExpanding } } as AppNode;
        }

        if (descendantIds.has(node.id)) {
            if (node.type === "list") {
                return { ...node, data: { ...node.data, collapsed: true } } as AppNode;
            }
        }

        return node;
    });
}

/**
 * Regra 3: Expandir/Colapsar Folder
 * Ao expandir: Exibe apenas Lists e garante que Tasks e Subtasks fiquem colapsadas.
 */
export function toggleFolderCollapse(nodes: AppNode[], folderId: string): AppNode[] {
    const folderNode = nodes.find((n) => n.id === folderId);
    if (!folderNode) return nodes;

    const isExpanding = folderNode.data?.collapsed ?? true;
    const descendantIds = getDescendantIds(nodes, folderId);

    return nodes.map((node) => {
        if (node.id === folderId) {
            return { ...node, data: { ...node.data, collapsed: !isExpanding } } as AppNode;
        }

        if (descendantIds.has(node.id)) {
            if (node.type === "list") {
                return { ...node, data: { ...node.data, collapsed: true } } as AppNode;
            }
        }

        return node;
    });
}

/**
 * Regra 4: Toggle simples de List e demais nós.
 */
export function toggleSingleNodeCollapse(nodes: AppNode[], targetId: string): AppNode[] {
    return nodes.map((node) => {
        if (node.id !== targetId) return node;

        return {
            ...node,
            data: {
                ...node.data,
                collapsed: !node.data?.collapsed,
            },
        } as AppNode;
    });
}

/**
 * Recalcula a visibilidade ('hidden') respeitando:
 * - O colapso dos ancestrais na árvore.
 * - Regra 5 (Focus Mode): Preserva apenas o caminho ancestral da Task focada,
 *   a Task focada e suas próprias Subtasks, ocultando as Tasks irmãs da mesma List.
 */
export function calculateNodeVisibility(nodes: AppNode[], focusedNodeId: string | null): AppNode[] {
    const nodeMap = new Map<string, AppNode>(nodes.map((n) => [n.id, n]));

    // Dados de suporte para o Focus Mode
    let focusListId: string | null = null;
    let focusAncestors = new Set<string>();
    let focusDescendants = new Set<string>();

    if (focusedNodeId) {
        const focusedTask = nodeMap.get(focusedNodeId);
        if (focusedTask) {
            focusListId = (focusedTask.data?.parentId as string) || null;
            focusAncestors = getAncestorsPath(nodes, focusedNodeId);
            focusDescendants = getDescendantIds(nodes, focusedNodeId);
        }
    }

    return nodes.map((node) => {
        // 1. Tratamento da Regra 5 (Focus Mode)
        if (focusedNodeId && focusListId) {
            const parentId = node.data?.parentId as string | undefined;

            // Mantém caminho de ancestrais, a própria Task em foco e suas Subtasks
            const isAncestor = focusAncestors.has(node.id);
            const isFocusedSelf = node.id === focusedNodeId;
            const isSubtaskOfFocused = focusDescendants.has(node.id);

            if (!isAncestor && !isFocusedSelf && !isSubtaskOfFocused) {
                // Oculta irmãs da mesma List e galhos paralelos
                if (parentId === focusListId && node.id !== focusedNodeId) {
                    return { ...node, hidden: true } as AppNode;
                }
            }
        }

        // 2. Avaliação de Visibilidade por Ancestrais (Cascade Collapsed / Hidden)
        let currentParentId = node.data?.parentId as string | undefined;

        while (currentParentId) {
            const parentNode = nodeMap.get(currentParentId);

            if (!parentNode || parentNode.data?.collapsed) {
                return { ...node, hidden: true } as AppNode;
            }

            currentParentId = parentNode.data?.parentId as string | undefined;
        }

        return { ...node, hidden: false } as AppNode;
    });
}