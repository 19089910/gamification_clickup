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