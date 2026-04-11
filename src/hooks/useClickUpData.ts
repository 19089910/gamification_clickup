import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGraphStore } from "@/store/graphStore";
import { transformClickUpToGraph, SpaceInfo } from "@/lib/graph-transformer";
import { getLayoutedElements } from "@/lib/layout";
import { ClickUpFolder, ClickUpList, ClickUpTask } from "@/types/clickup";

interface GraphApiResponse {
  folders: ClickUpFolder[];
  folderlessLists: ClickUpList[];
  folderListsMap: Record<string, ClickUpList[]>;
  listTasksMap: Record<string, ClickUpTask[]>;
  error?: string;
}

async function fetchGraphData(spaceId: string): Promise<GraphApiResponse> {
  const res = await fetch(`/api/clickup/graph?spaceId=${spaceId}`);
  if (!res.ok) throw new Error("Failed to fetch graph data");
  return res.json();
}

import { getVisibleGraph } from "@/lib/graph-utils";

export function useClickUpData(space: SpaceInfo) {
  const { 
    setNodes, 
    setEdges, 
    setFullGraph, 
    setLoading, 
    setError, 
    selectedQuarter,
    fullNodes,
    fullEdges
  } = useGraphStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["clickup-graph", space.id],
    queryFn: () => fetchGraphData(space.id),
    staleTime: 0, // Fresh data on every refetch/invalidation
    retry: 2,
    enabled: !!space.id,
  });

  const buildGraph = useCallback(() => {
    if (!data) return;

    const folderListsMap = new Map<string, ClickUpList[]>(
      Object.entries(data.folderListsMap),
    );
    const listTasksMap = new Map<string, ClickUpTask[]>(
      Object.entries(data.listTasksMap),
    );

    const { nodes: rawNodes, edges: rawEdges } = transformClickUpToGraph(
      space,
      data.folders,
      data.folderlessLists,
      folderListsMap,
      listTasksMap,
      selectedQuarter
    );

    // Preserve the user's collapse state when only the quarter filter changed.
    // New nodes (not yet in the graph) keep their default from the transformer.
    const existingCollapse = new Map(
      useGraphStore.getState().fullNodes.map(n => [n.id, n.data.collapsed])
    );

    const preservedNodes = rawNodes.map(n => {
      if (existingCollapse.has(n.id)) {
        return { ...n, data: { ...n.data, collapsed: existingCollapse.get(n.id) } };
      }
      return n;
    }) as typeof rawNodes;

    setFullGraph(preservedNodes, rawEdges);
  }, [data, space, setFullGraph, selectedQuarter]);


  // Effect to update visible graph whenever fullNodes or fullEdges change
  useEffect(() => {
    if (fullNodes.length === 0) return;

    const { nodes: visibleNodes, edges: visibleEdges } = getVisibleGraph(fullNodes, fullEdges);
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      visibleNodes,
      visibleEdges,
      "LR"
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [fullNodes, fullEdges, setNodes, setEdges]);


  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    if (isError) {
      setError(
        error instanceof Error ? error.message : "Erro ao carregar dados",
      );
    }
  }, [isError, error, setError]);

  useEffect(() => {
    if (data && !isLoading) {
      buildGraph();
    }
  }, [data, isLoading, buildGraph]);

  return { isLoading, isError, error };
}
