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

  /**
   * Atualiza a propriedade status de uma ou mais tarefas diretamente no cache do React Query
   * de forma completamente imutável, garantindo que o re-render aconteça corretamente.
   */
  static updateTasksStatusInCache(
    oldData: any | undefined, // Usamos any no momento para evitar dependência circular pesada, mas idealmente seria GraphApiResponse
    updates: { id: string; status: string; color: string }[]
  ): any | undefined {
    if (!oldData) return oldData;

    const updateMap = new Map(updates.map(u => {
      const cleanId = u.id.replace(/^(task|subtask)-/, '');
      return [cleanId, u];
    }));

    let hasChanges = false;
    const newListTasksMap: Record<string, any[]> = {};

    for (const [listId, tasks] of Object.entries(oldData.listTasksMap as Record<string, any[]>)) {
      let listChanged = false;
      const newTasks = tasks.map(task => {
        const update = updateMap.get(task.id);
        if (update) {
          listChanged = true;
          hasChanges = true;
          return {
            ...task,
            status: {
              ...task.status,
              status: update.status,
              color: update.color,
            }
          };
        }
        return task;
      });

      newListTasksMap[listId] = listChanged ? newTasks : tasks;
    }

    if (!hasChanges) return oldData;

    return {
      ...oldData,
      listTasksMap: {
        ...oldData.listTasksMap,
        ...newListTasksMap,
      }
    };
  }
}
