static strategies: Record<LayoutType, ILayoutStrategy> = {
    dagre: new DagreLayoutStrategy("LR"),
    elk: new ElkLayoutStrategy(),
};