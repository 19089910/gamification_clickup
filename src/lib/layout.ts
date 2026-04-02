import dagre from 'dagre';
import { Position } from '@xyflow/react';
import { AppNode, AppEdge } from '@/types/graph';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

const NODE_HEIGHTS: Record<string, number> = {
  space: 70,
  folder: 60,
  list: 70,
  task: 90,
};

export function getLayoutedElements(
  nodes: AppNode[],
  edges: AppEdge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: AppNode[]; edges: AppEdge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 100,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHTS[node.type ?? 'task'] ?? NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes: AppNode[] = nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id);
    const nodeHeight = NODE_HEIGHTS[node.type ?? 'task'] ?? NODE_HEIGHT;

    return {
      ...node,
      position: {
        x: x - NODE_WIDTH / 2,
        y: y - nodeHeight / 2,
      },
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
    };
  });

  return { nodes: layoutedNodes, edges };
}
