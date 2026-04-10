import { AppNode, AppEdge } from '@/types/graph';

export function getVisibleGraph(nodes: AppNode[], edges: AppEdge[]): { nodes: AppNode[]; edges: AppEdge[] } {
  const visibleNodeIds = new Set<string>();
  const visibleEdges: AppEdge[] = [];
  
  // Find roots (Space nodes)
  const roots = nodes.filter(n => n.type === 'space');
  const queue: AppNode[] = [...roots];

  
  roots.forEach(r => visibleNodeIds.add(r.id));

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // If current node is NOT collapsed, traverse its children
    if (!current.data.collapsed) {
      const childEdges = edges.filter(e => e.source === current.id);
      
      for (const edge of childEdges) {
        const childNode = nodes.find(n => n.id === edge.target);
        if (childNode && !visibleNodeIds.has(childNode.id)) {
          visibleNodeIds.add(childNode.id);
          visibleEdges.push(edge);
          queue.push(childNode);
        }
      }
    }
  }

  const visibleNodes = nodes.filter(n => visibleNodeIds.has(n.id));
  
  return { nodes: visibleNodes, edges: visibleEdges };
}
