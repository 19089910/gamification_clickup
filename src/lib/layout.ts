import dagre from 'dagre';
import { Position } from '@xyflow/react';
import { AppNode, AppEdge } from '@/types/graph';
import { LayoutSettings } from '@/store/graphStore';

export function getLayoutedElements(
  nodes: AppNode[],
  edges: AppEdge[],
  settings: LayoutSettings,
  direction: 'TB' | 'LR' = 'TB'
): { nodes: AppNode[]; edges: AppEdge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: settings.nodesep,
    ranksep: settings.ranksep,
    marginx: settings.marginx,
    marginy: settings.marginy,
  });

  nodes.forEach((node) => {
    const nodeHeight = settings.nodeHeightsByType[node.type as keyof typeof settings.nodeHeightsByType] ?? settings.nodeHeight;
    dagreGraph.setNode(node.id, {
      width: settings.nodeWidth,
      height: nodeHeight,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes: AppNode[] = nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id);
    const nodeHeight = settings.nodeHeightsByType[node.type as keyof typeof settings.nodeHeightsByType] ?? settings.nodeHeight;

    return {
      ...node,
      position: {
        x: x - settings.nodeWidth / 2,
        y: y - nodeHeight / 2,
      },
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
    };
  });

  return { nodes: layoutedNodes, edges };
}
