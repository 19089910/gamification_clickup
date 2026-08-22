import { StateCreator } from 'zustand';
import { GraphStore, ApiSlice, AppNode, AppEdge, SubtaskNode } from '@/types/graph';
import { fetchApi, updateNodeData, syncSelectedNode, cleanClickUpId } from '../helpers';
import { getStatusFromConfig } from '@/config/status';

export const createApiSlice: StateCreator<GraphStore, [], [], ApiSlice> = (set, get) => ({
  createTask: (listId, name, quarter) => {
    const cleanId = cleanClickUpId(listId);
    return fetchApi('/api/clickup/tasks', {
      method: 'POST',
      body: JSON.stringify({ listId: cleanId, name, quarter }),
    }, set);
  },

  createList: (folderId, name, quarter) => {
    const cleanId = cleanClickUpId(folderId);
    return fetchApi('/api/clickup/lists', {
      method: 'POST',
      body: JSON.stringify({ folderId: cleanId, name, quarter }),
    }, set);
  },

  createSubtask: async (parentTaskId: string, name: string) => {
    const cleanId = cleanClickUpId(parentTaskId);

    // 1. Faz o POST para o ClickUp
    const res = await fetchApi<any>(`/api/clickup/tasks/${cleanId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }, set);

    if (res) {
      const parentNode = get().fullNodes.find(n => n.id === parentTaskId || n.id === `task-${cleanId}`);
      const parentX = parentNode?.position.x ?? 0;
      const parentY = parentNode?.position.y ?? 0;

      const fullParentId = parentTaskId.startsWith('task-') ? parentTaskId : `task-${parentTaskId}`;

      // ATENÇÃO AQUI: Use o prefixo 'subtask-' em vez de 'task-'
      const rawId = res.id || res.task?.id;
      const newSubtaskId = `subtask-${rawId}`;

      // 2. Monta o nó com o ID e tipo idênticos ao que o Transformer/GET gera
      const newSubtaskNode: AppNode = {
        id: newSubtaskId,
        type: 'subtask',
        position: { x: parentX + 280, y: parentY },
        data: {
          label: res.name || name,
          taskId: rawId, // ID limpo do ClickUp
          parentId: fullParentId,
          status: res.status?.status || 'open',
          statusColor: res.status?.color || '#555',
          state: 'active',
          collapsed: false,
          url: res.url || undefined,
        },
      };

      // 3. Monta a aresta (edge) com a nova convenção do id
      const newEdge: AppEdge = {
        id: `e-${fullParentId}-${newSubtaskId}`,
        source: fullParentId,
        target: newSubtaskId,
      };

      // 4. Injeta no estado do Zustand
      set((state) => ({
        fullNodes: [...state.fullNodes, newSubtaskNode],
        nodes: [...state.nodes, newSubtaskNode],
        fullEdges: [...state.fullEdges, newEdge],
        edges: [...state.edges, newEdge],
      }));
    }

    return res;
  },

  updateTask: async (taskId, updates) => {
    set((state) => {
      const targetNode = state.fullNodes.find(n => n.id === `task-${taskId}` || n.id === `subtask-${taskId}`);
      if (!targetNode) return state;

      let newColor = targetNode.data.statusColor;
      if (updates.status) {
        const config = getStatusFromConfig(updates.status);
        if (config) newColor = config.color;
      }

      let newState = targetNode.data.state;
      if (updates.quarter) {
        const sq = state.selectedQuarter;
        newState = (!sq || updates.quarter === sq) ? 'active' : 'inactive';
      }

      const newFullNodes = updateNodeData(state.fullNodes, targetNode.id, {
        label: updates.name || targetNode.data.label,
        quarter: updates.quarter || targetNode.data.quarter,
        status: updates.status || targetNode.data.status,
        statusColor: newColor,
        state: newState,
      });

      return {
        fullNodes: newFullNodes,
        selectedNode: syncSelectedNode(state.selectedNode, newFullNodes),
      };
    });

    return fetchApi(`/api/clickup/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }, set);
  },

  updateList: async (listId, updates) => {
    set((state) => {
      const targetNode = state.fullNodes.find(n => n.id === `list-${listId}`);
      if (!targetNode) return state;

      const newFullNodes = updateNodeData(state.fullNodes, `list-${listId}`, {
        label: updates.name || targetNode.data.label,
      });

      return {
        fullNodes: newFullNodes,
        selectedNode: syncSelectedNode(state.selectedNode, newFullNodes),
      };
    });

    return fetchApi(`/api/clickup/lists/${listId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }, set);
  },

  updateNodeTags: (taskId: string, tags: string[]) => {
    set(state => ({
      fullNodes: state.fullNodes.map(node => {
        if (node.id !== `task-${taskId}`) return node;
        return {
          ...node,
          data: {
            ...node.data,
            tags: tags.map(name => ({
              name,
              bg: '#89898922',
              fg: '#898989',
            })),
          },
        } as AppNode;
      }),
    }));
  },
});
