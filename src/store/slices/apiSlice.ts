import { StateCreator } from 'zustand';
import { GraphStore } from '@/types/graph';
import { fetchApi, updateNodeData, syncSelectedNode } from '../helpers';
import { getStatusFromConfig } from '@/config/status';

export const createApiSlice: StateCreator<GraphStore, [], [], Pick<GraphStore, 'createTask' | 'createList' | 'updateTask' | 'updateList'>> = (set) => ({
  createTask: (listId, name, quarter) => {
    return fetchApi('/api/clickup/tasks', {
      method: 'POST',
      body: JSON.stringify({ listId, name, quarter }),
    }, set);
  },

  createList: (folderId, name, quarter) => {
    return fetchApi('/api/clickup/lists', {
      method: 'POST',
      body: JSON.stringify({ folderId, name, quarter }),
    }, set);
  },

  updateTask: async (taskId, updates) => {
    set((state) => {
      const targetNode = state.fullNodes.find(n => n.id === `task-${taskId}`);
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

      const newFullNodes = updateNodeData(state.fullNodes, `task-${taskId}`, {
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
});
