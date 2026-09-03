//Arestas customizadas têm sua própria fábrica para não poluir o loop principal.
import { AppEdge } from '@/types/graph';
import { MarkerType } from '@xyflow/react';


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

export function createTaskEdge(sourceId: string, targetId: string, color: string): AppEdge {
    return {
        ...defaultEdge(sourceId, targetId),
        style: { stroke: `${color}55`, strokeWidth: 1 },
    };
}

export function createSubtaskEdge(sourceId: string, targetId: string, color: string): AppEdge {
    return {
        ...defaultEdge(sourceId, targetId),
        style: { stroke: `${color}44`, strokeWidth: 1, strokeDasharray: '4 4' },
    };
}