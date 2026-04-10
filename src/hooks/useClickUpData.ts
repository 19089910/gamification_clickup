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

export function useClickUpData(space: SpaceInfo) {
  const { setNodes, setEdges, setLoading, setError, selectedQuarter } = useGraphStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["clickup-graph", space.id],
    queryFn: () => fetchGraphData(space.id),
    staleTime: 5 * 60 * 1000, // 5 min cache
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

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      rawNodes,
      rawEdges,
      "LR",
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [data, space, setNodes, setEdges, selectedQuarter]);

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
