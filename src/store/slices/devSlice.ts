import { StateCreator } from 'zustand';
import { GraphStore, DevSlice } from '@/types/graph';
import { addTagToTask, removeTagFromTask } from '@/lib/clickup/mutations';

export const createDevSlice: StateCreator<GraphStore, [], [], DevSlice> = (set, get) => ({
  devPanelListId: null,
  isSyncingDevMode: false,

  openDevPanel: (listId) => set({ devPanelListId: listId }),
  closeDevPanel: () => set({ devPanelListId: null }),

  toggleDevMode: async (listId, tasks, enable) => {
    set({ isSyncingDevMode: true });
    try {
      if (enable) {
        await Promise.all(tasks.map(t => addTagToTask(t.id, 'dev')));
      } else {
        await Promise.all(tasks.map(t => removeTagFromTask(t.id, 'dev')));
      }
      
      const queryClient = get().queryClient;
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
      }
    } catch (error) {
      console.error('Error toggling dev mode:', error);
      alert('Erro ao sincronizar Dev Mode com ClickUp');
    } finally {
      set({ isSyncingDevMode: false });
    }
  },
});