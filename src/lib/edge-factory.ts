import { MarkerType } from '@xyflow/react';
import { AppEdge } from '@/types/graph';

export const defaultEdge = (source: string, target: string): AppEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  animated: false,
  style: { stroke: '#333', strokeWidth: 1.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#555',
    width: 16,
    height: 16,
  },
});
