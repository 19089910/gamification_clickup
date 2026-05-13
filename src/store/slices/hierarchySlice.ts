import { StateCreator } from 'zustand';
import { GraphStore, AppNode, AppEdge } from '@/types/graph';
import { updateNodeData, syncSelectedNode } from '../helpers';

export const createHierarchySlice: StateCreator<GraphStore, [], [], Pick<GraphStore, 'toggleNodeCollapsed' | 'expandPathToNode' | 'addTempNode' | 'removeTempNode'>> = (set, get) => ({
  toggleNodeCollapsed: (nodeId) => {
    set((state) => {
      const targetNode = state.fullNodes.find(n => n.id === nodeId);
      if (!targetNode) return state;

      const newFullNodes = updateNodeData(state.fullNodes, nodeId, {
        collapsed: !targetNode.data.collapsed,
      });

      return { 
        fullNodes: newFullNodes,
        selectedNode: syncSelectedNode(state.selectedNode, newFullNodes)
      };
    });
  },

  expandPathToNode: (nodeId) => {
    set((state) => {
      const newFullNodes = state.fullNodes.map(node => ({ ...node }));
      const visited = new Set<string>();

      function expandParents(childId: string) {
        if (visited.has(childId)) return;
        visited.add(childId);

        state.fullEdges.forEach((edge) => {
          if (edge.target === childId) {
            const parentIndex = newFullNodes.findIndex((n) => n.id === edge.source);
            if (parentIndex !== -1) {
              const parent = newFullNodes[parentIndex];
              if (parent.data.collapsed) {
                newFullNodes[parentIndex] = {
                  ...parent,
                  data: { ...parent.data, collapsed: false },
                } as AppNode;
              }
              expandParents(parent.id);
            }
          }
        });
      }

      expandParents(nodeId);

      return { 
        fullNodes: newFullNodes as AppNode[],
        selectedNode: syncSelectedNode(state.selectedNode, newFullNodes)
      };
    });
  },

  addTempNode: (parentId, parentType) => {
    const tempId = `temp-${Date.now()}`;
    const parentNode = get().nodes.find(n => n.id === parentId);
    
    const tempNode: AppNode = {
      id: tempId,
      type: 'temp',
      position: { x: (parentNode?.position.x ?? 0) + 300, y: (parentNode?.position.y ?? 0) },
      data: { label: '', isTemp: true, parentId, parentType, collapsed: false },
    };

    const tempEdge: AppEdge = {
      id: `temp-edge-${tempId}`,
      source: parentId,
      target: tempId,
      style: { stroke: '#555', strokeDasharray: '5 3', strokeWidth: 1 },
    };

    set((state) => ({
      nodes: [...state.nodes, tempNode],
      edges: [...state.edges, tempEdge],
    }));

    return tempId;
  },

  removeTempNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    }));
  },
});
