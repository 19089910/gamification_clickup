import { create } from 'zustand';
import { GraphStore } from '@/types/graph';
import { createCoreSlice } from './slices/coreSlice';
import { createUiSlice } from './slices/uiSlice';
import { createApiSlice } from './slices/apiSlice';
import { createHierarchySlice } from './slices/hierarchySlice';

export const useGraphStore = create<GraphStore>((...a) => ({
  ...createCoreSlice(...a), // estado base do grafo (nodes, edges)
  ...createUiSlice(...a), // estado da UI (sidebar, modals, layout)
  ...createApiSlice(...a), // funções de API (fetch, mutations)
  ...createHierarchySlice(...a), // lógica de expandir/colapsar nós
}));

export * from '@/types/graph';