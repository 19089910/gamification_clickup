import { ILayoutStrategy } from "../layoutStrategy";
import { getLayoutedElements } from "@/lib/layout";
import { AppNode, AppEdge, LayoutSettings } from "@/types/graph";

export class DagreLayoutStrategy implements ILayoutStrategy {
  constructor(private direction: "LR" | "TB" = "LR") {}

  execute(nodes: AppNode[], edges: AppEdge[], settings?: LayoutSettings) {
    return getLayoutedElements(nodes, edges, settings, this.direction);
  }
}
