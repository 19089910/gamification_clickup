import { AppNode } from '@/types/graph';
import { Quarter } from '@/types/graph';

export function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth() + 1; // 1-12
  if (month <= 3) return 'SUMMER';
  if (month <= 6) return 'FALL';
  if (month <= 9) return 'WINTER';
  return 'SPRING';
}

export function syncSelectedNode(selectedNode: AppNode | null, nodes: AppNode[]): AppNode | null {
  if (!selectedNode) return null;
  return nodes.find((n) => n.id === selectedNode.id) || selectedNode;
}

export function updateNodeData(nodes: AppNode[], id: string, dataUpdates: Partial<AppNode['data']>): AppNode[] {
  return nodes.map((node) => 
    node.id === id 
      ? { ...node, data: { ...node.data, ...dataUpdates } } as AppNode
      : node
  );
}

export async function fetchApi<T>(
  url: string,
  options: RequestInit,
  set: (partial: any) => void
): Promise<T> {
  set({ isLoading: true, error: null });
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }

    const data = await res.json();
    set({ isLoading: false });
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    set({ error: message, isLoading: false });
    throw error;
  }
}
