import { AppNode } from "@/types/graph";

/**
 * Recalcula o estado 'hidden' dos nós do grafo respeitando a hierarquia
 * e o estado 'collapsed' de cada nó pai.
 */
export function calculateNodeVisibility(nodes: AppNode[], focusedNodeId: string | null): AppNode[] {
    // Mapa de visibilidade por ID para rápida consulta durante a travessia
    const hiddenMap = new Map<string, boolean>();

    // 1. Identifica o pai da Task em foco (se houver Focus Mode ativo)
    let focusListId: string | null = null;
    if (focusedNodeId) {
        const focusedTask = nodes.find((n) => n.id === focusedNodeId);
        if (focusedTask) {
            focusListId = typeof focusedTask.data.parentId === "string" ? focusedTask.data.parentId : null;
        }
    }

    return nodes.map((node) => {
        // Regra especial: Focus Mode na Task (Regra 5)
        if (focusedNodeId && focusListId) {
            // Se pertence à mesma List da Task em foco, mas não é a própria Task em foco
            if (node.data.parentId === focusListId && node.id !== focusedNodeId) {
                return { ...node, hidden: true } as AppNode;
            }
        }

        // Regra hierárquica normal: Se o pai direto estiver colapsado ou oculto, o nó fica oculto
        const parentId = node.data.parentId;
        if (parentId) {
            const parentNode = nodes.find((n) => n.id === parentId);

            // Se o pai não existe, está oculto ou colapsado, oculta o filho
            if (!parentNode || parentNode.hidden || parentNode.data.collapsed) {
                return { ...node, hidden: true } as AppNode;
            }
        }

        return { ...node, hidden: false } as AppNode;
    });
}

/**
 * Regra 1, 3 e 4: Alterna o colapso de um nó individual
 */
export function toggleSingleNodeCollapse(
    nodes: AppNode[],
    targetId: string,
    nodeType: string
): AppNode[] {
    return nodes.map((node) => {
        if (node.id !== targetId) return node;

        const nextCollapsed = !node.data.collapsed;

        return {
            ...node,
            data: {
                ...node.data,
                collapsed: nextCollapsed,
            },
        } as AppNode;
    });
}

/**
 * Regra 3 (Garantia Folder): Ao expandir um Folder, garante que
 * suas Lists filhas fiquem visíveis, mas que as Tasks permaneçam colapsadas.
 */
export function toggleFolderCollapse(nodes: AppNode[], folderId: string): AppNode[] {
    const folder = nodes.find((n) => n.id === folderId);
    if (!folder) return nodes;

    const isExpanding = folder.data.collapsed;

    return nodes.map((node) => {
        // Inverte o estado do Folder
        if (node.id === folderId) {
            return { ...node, data: { ...node.data, collapsed: !isExpanding } } as AppNode;
        }

        // Se estiver expandindo o Folder, garante que todas as Lists filhas nasçam colapsadas
        if (isExpanding && node.data.parentId === folderId && node.type === "list") {
            return { ...node, data: { ...node.data, collapsed: true } } as AppNode;
        }

        return node;
    });
}