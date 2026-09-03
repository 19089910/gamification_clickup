import { ILayoutStrategy } from "./layoutStrategy";
import { DagreLayoutStrategy } from "./strategies/dagreLayoutStrategy";
import { AppNode, AppEdge, LayoutSettings } from "@/types/graph";

export type LayoutType = "dagre" | "elk" | "radial";

export class LayoutManager {
  // O registro é parcial para que layouts ainda não implementados não sejam
  // tratados como se estivessem disponíveis na aplicação.
  private static strategies: Partial<Record<LayoutType, ILayoutStrategy>> = {
    dagre: new DagreLayoutStrategy("LR"),
  };

  static applyLayout(
    type: LayoutType,
    nodes: AppNode[],
    edges: AppEdge[],
    settings: LayoutSettings,
  ) {
    const strategy = this.strategies[type];
    if (!strategy) {
      throw new Error(`Estratégia de layout não implementada: ${type}`);
    }
    return strategy.execute(nodes, edges, settings);
  }
}
