import { StateCreator } from 'zustand';
import { GraphStore, DevSlice } from '@/types/graph';

export const createDevSlice: StateCreator<GraphStore, [], [], DevSlice> = (set, get) => ({
  devPanelListId: null,
  isSyncingDevMode: false,

  openDevPanel: (listId) => set({ devPanelListId: listId }),
  closeDevPanel: () => set({ devPanelListId: null }),

  toggleDevMode: async (listId, tasks, enable, queryClient) => {
    set({ isSyncingDevMode: true });
    try {
      const method = enable ? 'POST' : 'DELETE';
      
      // Call our internal API route which runs on the server
      await Promise.all(tasks.map(async (t) => {
        const res = await fetch(`/api/clickup/tasks/${t.id}/tags/dev`, {
          method,
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Failed to ${method === 'POST' ? 'add' : 'remove'} tag for task ${t.id}: ${err}`);
        }
      }));
      
      if (queryClient) {
        await queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
      }
    } catch (error) {
      console.error('Error toggling dev mode:', error);
      alert('Erro ao sincronizar Dev Mode com ClickUp');
    } finally {
      set({ isSyncingDevMode: false });
    }
  },
});