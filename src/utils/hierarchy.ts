import { AppNode, AppEdge } from '@/types/graph';

/** 1 e 4. Toggle Genérico / Space & List */
export function toggleSingleNodeCollapse(nodes: AppNode[], nodeId: string): AppNode[] {
    return nodes.map((node) => {
        if (node.id !== nodeId) return node;
        return {
            ...node,
            data: { ...node.data, collapsed: !node.data.collapsed },
        } as AppNode;
    });
}

/** 2. Visão Global de Projetos (Antigo collapseToLists) */
export function applyViewAllProjects(nodes: AppNode[]): AppNode[] {
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

/** 3. Toggle de Folder (Garante que as listas filhas nasçam colapsadas) */
export function toggleFolderCollapse(
    nodes: AppNode[],
    edges: AppEdge[],
    folderId: string
): AppNode[] {
    const targetFolder = nodes.find((n) => n.id === folderId);
    if (!targetFolder) return nodes;

    const willCollapse = !targetFolder.data.collapsed;

    // Descobre quais são as listas dentro deste folder
    const childListIds = new Set(
        edges.filter((e) => e.source === folderId).map((e) => e.target)
    );

    return nodes.map((node) => {
        // Altera o folder clicado
        if (node.id === folderId) {
            return { ...node, data: { ...node.data, collapsed: willCollapse } } as AppNode;
        }
        // Se está expandindo o folder, garante que as listas filhas fiquem colapsadas
        if (!willCollapse && childListIds.has(node.id)) {
            return { ...node, data: { ...node.data, collapsed: true } } as AppNode;
        }
        return node;
    });
}

/* ==========================================================================
   MANIPULAÇÃO TEMPORÁRIA
   ========================================================================== */

/** 5. Toggle de Foco na Task (Oculta/Mostra irmãs na List pai) */
export function applyTaskFocusToggle(
    nodes: AppNode[],
    edges: AppEdge[],
    focusTaskId: string | null
): AppNode[] {
    if (!focusTaskId) {
        // Se removeu o foco (null), não toca na estrutura global, só garante
        // que as tasks da lista voltam a responder ao estado normal da List.
        return nodes;
    }

    // Identifica a lista pai da task focada
    const parentListEdge = edges.find((e) => e.target === focusTaskId);
    const parentListId = parentListEdge?.source;

    // Identifica subtasks (descendentes da task focada)
    const descendants = getDescendantNodeIds(focusTaskId, edges);

    return nodes.map((node) => {
        // É a própria task focada ou subtask dela -> MANTÉM VISÍVEL
        if (node.id === focusTaskId || descendants.has(node.id)) {
            return { ...node, data: { ...node.data, collapsed: false } } as AppNode;
        }

        // Checa se é uma task irmã (mesma lista pai)
        const isSibling = edges.some(
            (e) => e.source === parentListId && e.target === node.id && node.id !== focusTaskId
        );

        // Se for irmã da task focada -> COLAPSA (Guarda)
        if (isSibling) {
            return { ...node, data: { ...node.data, collapsed: true } } as AppNode;
        }

        return node;
    });
}

/** Helper auxiliar de descendentes */
function getDescendantNodeIds(rootId: string, edges: AppEdge[]): Set<string> {
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

/** Retorna todos os ancestrais (pais até a raiz) de um nó */
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


/* ==========================================================================
   EXPANSÃO DE CAMINHO E MANIPULAÇÃO TEMPORÁRIA
   ========================================================================== */

/** Expande todo o caminho do nó até a raiz (útil ao selecionar/buscar um nó) */
export function expandPathToNode(
    nodes: AppNode[],
    edges: AppEdge[],
    targetNodeId: string
): AppNode[] {
    const ancestorIds = getAncestorNodeIds(targetNodeId, edges);

    return nodes.map((node) => {
        if (ancestorIds.has(node.id) && node.data.collapsed) {
            return {
                ...node,
                data: { ...node.data, collapsed: false },
            } as AppNode;
        }
        return node;
    });
}

/** Adiciona um nó temporário (ex: rascunho de criação) */
export function addTempNode(nodes: AppNode[], parentId: string, tempNode: AppNode): AppNode[] {
    return [...nodes, tempNode];
}

/** Remove nós temporários ou de rascunho */
export function removeTempNode(nodes: AppNode[], tempNodeId: string): AppNode[] {
    return nodes.filter((node) => node.id !== tempNodeId);
}