import { StateCreator } from 'zustand';
import { GraphStore, DevSlice } from '@/types/graph';

export const createDevSlice: StateCreator<GraphStore, [], [], DevSlice> = (set, get) => ({
  devPanelListId: null,
  isSyncingDevMode: false,

  // Timer state
  activeTimerTaskId: null,
  timerStartTime: null,
  additionalMs: 0,
  timerBaseMs: 0,

  openDevPanel: (listId) => set({ devPanelListId: listId }),
  closeDevPanel: () => set({ devPanelListId: null }),

  startTimer: (taskId, baseMs = 0) => {
    const startTime = Date.now();
    localStorage.setItem(`timer_task_${taskId}`, JSON.stringify({ startTime, baseMs }));
    set({ activeTimerTaskId: taskId, timerStartTime: startTime, additionalMs: 0, timerBaseMs: baseMs });
  },

  stopTimer: () => {
    const { activeTimerTaskId } = get();
    if (activeTimerTaskId) localStorage.removeItem(`timer_task_${activeTimerTaskId}`);
    set({ activeTimerTaskId: null, timerStartTime: null, additionalMs: 0, timerBaseMs: 0 });
  },

  tickTimer: () => {
    const { timerStartTime } = get();
    if (!timerStartTime) return;
    set({ additionalMs: Date.now() - timerStartTime });
  },

  toggleDevMode: async (listId, tasks, enable, queryClient) => {
    set({ isSyncingDevMode: true });
    try {
      const method = enable ? 'POST' : 'DELETE';
      await Promise.all(tasks.map(async (t) => {
        const res = await fetch(`/api/clickup/tasks/${t.id}/tags/dev`, { method });
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