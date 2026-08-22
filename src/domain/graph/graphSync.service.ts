import { AppNode, AppEdge } from "@/types/graph";

export class GraphSyncService {
    /**
     * Preserva estados locais (como 'collapsed') e mantém nós locais que ainda não foram sincronizados no backend.
     */
    static mergeServerWithLocalState(
        rawNodes: AppNode[],
        rawEdges: AppEdge[],
        currentNodes: AppNode[],
        currentEdges: AppEdge[]
    ): { nodes: AppNode[]; edges: AppEdge[] } {
        const existingCollapse = new Map(
            currentNodes.map((n) => [n.id, n.data.collapsed])
        );

        const rawNodeIds = new Set(rawNodes.map((n) => n.id));
        // Mantém nós criados otimisticamente no Zustand que ainda não vieram da API
        const pendingLocalNodes = currentNodes.filter((n) => !rawNodeIds.has(n.id));

        const mergedNodes = [
            ...rawNodes.map((n) => {
                if (existingCollapse.has(n.id)) {
                    return {
                        ...n,
                        data: { ...n.data, collapsed: existingCollapse.get(n.id) },
                    };
                }
                return n;
            }),
            ...pendingLocalNodes,
        ];

        const rawEdgeIds = new Set(rawEdges.map((e) => e.id));
        const pendingLocalEdges = currentEdges.filter((e) => !rawEdgeIds.has(e.id));

        return {
            nodes: mergedNodes as AppNode[],
            edges: [...rawEdges, ...pendingLocalEdges],
        };
    }
}