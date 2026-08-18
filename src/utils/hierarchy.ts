import { AppNode, AppEdge } from '@/types/graph';

/**
 * Função pura para colapsar/expandir um único nó
 */
export function toggleNodeCollapseState(nodes: AppNode[], nodeId: string): AppNode[] {
    return nodes.map((node) => {
        if (node.id !== nodeId) return node;
        return {
            ...node,
            data: {
                ...node.data,
                collapsed: !node.data.collapsed,
            },
        } as AppNode;
    });
}

/**
 * Função pura para buscar ancestrais e garantir que o caminho até o nó alvo esteja expandido
 */
export function getNodesWithExpandedPath(
    nodes: AppNode[],
    edges: AppEdge[],
    targetNodeId: string
): AppNode[] {
    const newNodes = nodes.map((n) => ({ ...n }));
    const visited = new Set<string>();

    function expandParents(childId: string) {
        if (visited.has(childId)) return;
        visited.add(childId);

        edges.forEach((edge) => {
            if (edge.target === childId) {
                const parentIndex = newNodes.findIndex((n) => n.id === edge.source);
                if (parentIndex !== -1) {
                    const parent = newNodes[parentIndex];
                    if (parent.data.collapsed) {
                        newNodes[parentIndex] = {
                            ...parent,
                            data: { ...parent.data, collapsed: false },
                        } as AppNode;
                    }
                    expandParents(parent.id);
                }
            }
        });
    }

    expandParents(targetNodeId);
    return newNodes;
}

/**
 * Função pura para colapsar nós por tipo (Regra de Negócio de Visualização)
 */
export function applyCollapseToLists(nodes: AppNode[]): AppNode[] {
    return nodes.map((node) => {
        if (node.type === 'list') {
            return { ...node, data: { ...node.data, collapsed: true } } as AppNode;
        }
        if (node.type === 'folder' || node.type === 'space') {
            return { ...node, data: { ...node.data, collapsed: false } } as AppNode;
        }
        return node;
    });
}

/**
 * Função pura que obtém descendentes (subtasks) de um nó
 */
export function getDescendantNodeIds(rootId: string, edges: AppEdge[]): Set<string> {
    const visited = new Set<string>([rootId]);
    const queue = [rootId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        edges.forEach((edge) => {
            if (edge.source === currentId && !visited.has(edge.target)) {
                visited.add(edge.target);
                queue.push(edge.target);
            }
        });
    }

    return visited;
}

/**
 * Função pura que obtém ancestrais para manter o caminho até a raiz visível
 */
export function getAncestorNodeIds(targetId: string, edges: AppEdge[]): Set<string> {
    const ancestors = new Set<string>();
    const queue = [targetId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        edges.forEach((edge) => {
            if (edge.target === currentId && !ancestors.has(edge.source)) {
                ancestors.add(edge.source);
                queue.push(edge.source);
            }
        });
    }

    return ancestors;
}

/**
 * Colapsa todos os nós exceto o nó focado, suas subtasks e seus ancestrais
 */
export function applyFocusToNodes(
    nodes: AppNode[],
    edges: AppEdge[],
    focusNodeId: string
): AppNode[] {
    const descendants = getDescendantNodeIds(focusNodeId, edges);
    const ancestors = getAncestorNodeIds(focusNodeId, edges);
    const allowedIds = new Set([...descendants, ...ancestors]);

    return nodes.map((node) => {
        const isAllowed = allowedIds.has(node.id);
        return {
            ...node,
            data: {
                ...node.data,
                collapsed: !isAllowed,
            },
        } as AppNode;
    });
}