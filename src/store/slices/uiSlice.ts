import { StateCreator } from 'zustand';
import { GraphStore, UiSlice } from '@/types/graph';
import { getCurrentQuarter } from '../helpers';

export const createUiSlice: StateCreator<GraphStore, [], [], UiSlice> = (set) => ({
  isLoading: false,
  error: null,
  isSidebarOpen: false,
  selectedQuarter: getCurrentQuarter(),
  layoutSettings: {
    nodesep: 30,
    ranksep: 50,
    marginx: 40,
    marginy: 40,
    nodeWidth: 220,
    nodeHeight: 40,
    nodeHeightsByType: {
      space: 70,
      folder: 40,
      list: 45,
      task: 35,
      subtask: 0,
    },
  },
  editTaskModal: { isOpen: false, taskId: '', name: '', quarter: '' },
  quarterPickerModal: { isOpen: false, listName: '', folderId: '', tempNodeId: '' },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setQuarter: (q) => set({ selectedQuarter: q }),
  updateLayoutSettings: (settings) => set((state) => ({
    layoutSettings: {
      ...state.layoutSettings,
      ...settings,
      nodeHeightsByType: {
        ...state.layoutSettings.nodeHeightsByType,
        ...(settings.nodeHeightsByType || {}),
      },
    },
  })),
  setEditTaskModal: (data) => set((state) => ({
    editTaskModal: { ...state.editTaskModal, ...data },
  })),
  setQuarterPickerModal: (data) => set((state) => ({
    quarterPickerModal: { ...state.quarterPickerModal, ...data },
  })),
});