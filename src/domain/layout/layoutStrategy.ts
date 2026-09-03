import { AppNode, AppEdge, LayoutSettings } from "@/types/graph";

export interface ILayoutStrategy {
  execute(
    nodes: AppNode[],
    edges: AppEdge[],
    settings: LayoutSettings,
  ): { nodes: AppNode[]; edges: AppEdge[] };
}
