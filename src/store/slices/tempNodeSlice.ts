import { StateCreator } from 'zustand';
import { GraphStore, AppNode, TempNodeSlice } from '@/types/graph';

export const createTempNodeSlice: StateCreator<
    GraphStore,
    [],
    [],
    TempNodeSlice
> = (set) => ({
    addTempNode: (parentId, parentType) => {
        set((state) => {
            const parentNode = state.fullNodes.find((n) => n.id === parentId);
            if (!parentNode) return state;

            // Garante que o nó pai esteja descolapsado
            const updatedNodes = state.fullNodes.map((node) => {
                if (node.id === parentId && node.data.collapsed) {
                    return { ...node, data: { ...node.data, collapsed: false } } as AppNode;
                }
                return node;
            });

            const tempId = `temp-${Date.now()}`;
            const tempNode: AppNode = {
                id: tempId,
                type: 'temp',
                position: {
                    x: parentNode.position.x + 260,
                    y: parentNode.position.y + 50,
                },
                data: {
                    label: '',
                    parentId,
                    parentType,
                    isTemp: true,
                    collapsed: false,
                },
            };

            return {
                fullNodes: [...updatedNodes, tempNode],
            };
        });
    },

    removeTempNode: (tempNodeId) => {
        set((state) => ({
            fullNodes: state.fullNodes.filter((node) => node.id !== tempNodeId),
        }));
    },
});