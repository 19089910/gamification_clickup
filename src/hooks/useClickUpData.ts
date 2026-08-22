import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGraphStore } from "@/store/graphStore";
import { transformClickUpToGraph } from "@/lib/graph-trasformer/transformClickUpToGraph";
import { ClickUpList, ClickUpTask, GraphApiResponse } from "@/types/clickup";
import { SpaceInfo } from "@/types/graph";
import { calculateNodeVisibility } from "@/utils/hierarchy";
import { GraphSyncService } from "@/domain/graph/graphSync.service";
import { LayoutManager } from "@/domain/layout/layoutManager";

async function fetchGraphData(spaceId: string): Promise<GraphApiResponse> {
  const res = await fetch(`/api/clickup/graph?spaceId=${spaceId}`);
  if (!res.ok) throw new Error("Failed to fetch graph data");
  return res.json();
}

/**
 * Hook para sincronizar os dados do ClickUp com o Zustand do React Flow.
 * 
 * Arquitetura Aplicada (SOLID):
 * - Single Responsibility: Mapeamentos e sincronizações foram isolados em 'GraphSyncService'.
 * - Strategy Pattern: Algoritmos de Re-layout foram isolados no 'LayoutManager'.
 */
export function useClickUpData(space: SpaceInfo) {
  const {
    setNodes,
    setEdges,
    setFullGraph,
    setLoading,
    setError,
    selectedQuarter,
    fullNodes,
    fullEdges,
    layoutSettings,
  } = useGraphStore();

  // 1. Busca remota via React Query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["clickup-graph", space.id],
    queryFn: () => fetchGraphData(space.id),
    staleTime: 0,
    retry: 2,
    enabled: !!space.id,
  });

  // 2. Transforma e Sincroniza dados do backend com dados locais do Zustand
  const buildGraph = useCallback(() => {
    if (!data) return;

    const folderListsMap = new Map<string, ClickUpList[]>(
      Object.entries(data.folderListsMap)
    );
    const listTasksMap = new Map<string, ClickUpTask[]>(
      Object.entries(data.listTasksMap)
    );

    const { nodes: rawNodes, edges: rawEdges } = transformClickUpToGraph(
      space,
      data.folders,
      data.folderlessLists,
      folderListsMap,
      listTasksMap,
      selectedQuarter
    );

    const currentNodes = useGraphStore.getState().fullNodes;
    const currentEdges = useGraphStore.getState().fullEdges;

    // Sincroniza nós remotos preservando alterações otimistas locais
    const { nodes: mergedNodes, edges: mergedEdges } =
      GraphSyncService.mergeServerWithLocalState(
        rawNodes,
        rawEdges,
        currentNodes,
        currentEdges
      );

    setFullGraph(mergedNodes, mergedEdges);
  }, [data, space, setFullGraph, selectedQuarter]);

  // 3. Atualiza visibilidade e aplica algoritmo de Re-Layout (Strategy Pattern)
  useEffect(() => {
    if (fullNodes.length === 0) return;

    const focusedNodeId = useGraphStore.getState().focusedNodeId;
    const visibleNodes = calculateNodeVisibility(fullNodes, focusedNodeId);

    const visibleNodeIds = new Set(
      visibleNodes.filter((n) => !n.hidden).map((n) => n.id)
    );
    const visibleEdges = fullEdges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    // Executa a estratégia de layout desejada (ex: "dagre")
    const { nodes: layoutedNodes, edges: layoutedEdges } =
      LayoutManager.applyLayout(
        "dagre", // Altere aqui ou passe dinamicamente via store para trocar o layout!
        visibleNodes.filter((n) => !n.hidden),
        visibleEdges,
        layoutSettings
      );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [fullNodes, fullEdges, layoutSettings, setNodes, setEdges]);

  // 4. Efeitos de estado
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    if (isError) {
      setError(
        error instanceof Error ? error.message : "Erro ao carregar dados"
      );
    }
  }, [isError, error, setError]);

  useEffect(() => {
    if (data) {
      buildGraph();
    }
  }, [data, buildGraph]);

  return { isLoading, isError, error };
}