import { ILayoutStrategy } from "./layoutStrategy";
import { DagreLayoutStrategy } from "./strategies/dagreLayoutStrategy";
import { AppNode, AppEdge, LayoutSettings } from "@/types/graph";

export type LayoutType = "dagre" | "elk" | "radial";

export class LayoutManager {
  private static strategies: Record<LayoutType, ILayoutStrategy> = {
    dagre: new DagreLayoutStrategy("LR"),
    // Adicione novos algoritmos aqui sem alterar a UI:
    // elk: new ElkLayoutStrategy(),
    // radial: new RadialLayoutStrategy(),
  };

  static applyLayout(
    type: LayoutType,
    nodes: AppNode[],
    edges: AppEdge[],
    settings?: LayoutSettings,
  ) {
    const strategy = this.strategies[type] || this.strategies.dagre;
    return strategy.execute(nodes, edges, settings);
  }
}
