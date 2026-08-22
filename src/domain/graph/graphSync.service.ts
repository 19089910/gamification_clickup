import { AppNode, AppEdge } from "@/types/graph";

export class GraphSyncService {
  /**
   * Atualiza os dados remotos sem perder estado de UI nem rascunhos locais.
   * Nós remotos ausentes são descartados; apenas alterações explicitamente
   * otimistas podem sobreviver até a próxima resposta da API.
   */
  static mergeServerWithLocalState(
    rawNodes: AppNode[],
    rawEdges: AppEdge[],
    currentNodes: AppNode[],
    currentEdges: AppEdge[],
  ): { nodes: AppNode[]; edges: AppEdge[] } {
    const existingCollapse = new Map(
      currentNodes.map((n) => [n.id, n.data.collapsed]),
    );

    const rawNodeIds = new Set(rawNodes.map((n) => n.id));
    const pendingLocalNodes = currentNodes.filter(
      (node) =>
        !rawNodeIds.has(node.id) &&
        (node.data.isOptimistic === true || node.data.isTemp === true),
    );

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
    const pendingNodeIds = new Set(pendingLocalNodes.map((node) => node.id));
    const pendingLocalEdges = currentEdges.filter(
      (edge) =>
        !rawEdgeIds.has(edge.id) &&
        (pendingNodeIds.has(edge.source) || pendingNodeIds.has(edge.target)),
    );

    return {
      nodes: mergedNodes as AppNode[],
      edges: [...rawEdges, ...pendingLocalEdges],
    };
  }
}
