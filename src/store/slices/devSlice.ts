import { StateCreator } from 'zustand';
import { GraphStore, DevSlice } from '@/types/graph';

const DEV_LISTS_KEY = 'devListIds';

function loadDevListIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DEV_LISTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDevListIds(ids: Set<string>) {
  localStorage.setItem(DEV_LISTS_KEY, JSON.stringify([...ids]));
}

export const createDevSlice: StateCreator<GraphStore, [], [], DevSlice> = (set, get) => ({
  devListIds: loadDevListIds(),

  toggleDevList: (listId) => {
    const current = new Set(get().devListIds);
    if (current.has(listId)) {
      current.delete(listId);
    } else {
      current.add(listId);
    }
    saveDevListIds(current);
    set({ devListIds: current });
  },

  isDevList: (listId) => get().devListIds.has(listId),

  devPanelListId: null,
  openDevPanel: (listId) => set({ devPanelListId: listId }),
  closeDevPanel: () => set({ devPanelListId: null }),
});