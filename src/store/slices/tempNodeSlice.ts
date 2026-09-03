import { StateCreator } from 'zustand';
import { GraphStore, AppNode, TempNodeSlice, TempNodeData, AppEdge } from '@/types/graph';
import { cleanClickUpId } from '../helpers';

export const createTempNodeSlice: StateCreator<
    GraphStore,
    [],
    [],
    TempNodeSlice
> = (set, get) => ({
    addTempNode: (parentId, parentType) => {
        set((state) => {
            // 1. Busca o nó pai atualizado dentro do estado global
            const parentNode = state.fullNodes.find((n) => n.id === parentId) || state.nodes.find((n) => n.id === parentId);

            if (!parentNode) {
                console.warn(`[TempNodeSlice] Nó pai "${parentId}" não encontrado.`);
                return state;
            }

            // 2. Garante descolapsar o pai nos dois arrays de estado
            const updateCollapse = (nodeList: AppNode[]) =>
                nodeList.map((node) => {
                    if (node.id === parentId && node.data.collapsed) {
                        return { ...node, data: { ...node.data, collapsed: false } } as AppNode;
                    }
                    return node;
                });

            // 3. Obtém a posição REAL e atualizada do nó pai na tela
            // O React Flow costuma salvar a posição absoluta/relativa em position
            const parentX = parentNode.position?.x ?? 0;
            const parentY = parentNode.position?.y ?? 0;

            // Offset para desenhar exatamente à direita do nó selecionado (e.g. "Projeto")
            const OFFSET_X = 320;
            const OFFSET_Y = 0;

            const tempId = `temp-${Date.now()}`;

            const tempNode: AppNode = {
                id: tempId,
                type: 'temp',
                position: {
                    x: parentX + OFFSET_X,
                    y: parentY + OFFSET_Y,
                },
                data: {
                    label: '',
                    parentId,
                    parentType,
                    isTemp: true,
                    collapsed: false,
                },
            };

            // 4. Cria a conexão visual (Edge) do pai para o nó rascunho
            const tempEdge: AppEdge = {
                id: `e-${parentId}-${tempId}`,
                source: parentId,
                target: tempId,
                animated: true,
                style: { strokeDasharray: '5, 5', stroke: '#3b82f6' },
            };

            const updatedFullNodes = updateCollapse(state.fullNodes);
            const updatedVisibleNodes = updateCollapse(state.nodes);

            return {
                fullNodes: [...updatedFullNodes, tempNode],
                nodes: [...updatedVisibleNodes, tempNode],
                fullEdges: [...state.fullEdges, tempEdge],
                edges: [...state.edges, tempEdge],
            };
        });
    },

    removeTempNode: (tempNodeId) => {
        set((state) => ({
            fullNodes: state.fullNodes.filter((node) => node.id !== tempNodeId),
            nodes: state.nodes.filter((node) => node.id !== tempNodeId),
            fullEdges: state.fullEdges.filter((edge) => edge.target !== tempNodeId),
            edges: state.edges.filter((edge) => edge.target !== tempNodeId),
        }));
    },

    commitTempNode: async (tempNodeId, name, quarter = null) => {
        const state = get();
        const tempNode = state.fullNodes.find((n) => n.id === tempNodeId) || state.nodes.find((n) => n.id === tempNodeId);

        if (!tempNode) {
            state.removeTempNode(tempNodeId);
            return;
        }

        const nodeData = tempNode.data as unknown as TempNodeData;

        if (!nodeData?.parentId) {
            state.removeTempNode(tempNodeId);
            return;
        }

        const { parentId, parentType } = nodeData;

        // Remove o nó temporário e a edge do canvas
        state.removeTempNode(tempNodeId);

        try {
            const cleanParentId = cleanClickUpId(parentId);

            if (parentType === 'folder') {
                await state.createList(cleanParentId, name, quarter);
            } else if (parentType === 'list') {
                await state.createTask(cleanParentId, name, quarter);
            } else if (parentType === 'task') {
                await state.createSubtask(cleanParentId, name);
            }
        } catch (error) {
            console.error('Erro ao efetivar nó temporário:', error);
        }
    },
});