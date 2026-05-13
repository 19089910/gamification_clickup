import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { ListNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/hooks/useClickUpData';

export function useListDetail(node: any) {
  const { updateList, setSidebarOpen } = useGraphStore();
  const queryClient = useQueryClient();

  const list = node.data as ListNodeData;

  const [localName, setLocalName] = useState(list.label as string);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalName(list.label as string);
  }, [list.label]);

  const handleSaveList = async () => {
    if (!localName.trim()) return;
    
    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
    const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

    setIsSaving(true);
    try {
      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        if (!oldData) return oldData;
        const newFolderless = oldData.folderlessLists.map(l => l.id === list.listId ? { ...l, name: localName } : l);
        const newFolderListsMap = { ...oldData.folderListsMap };
        for (const fId in newFolderListsMap) {
          newFolderListsMap[fId] = newFolderListsMap[fId].map(l => l.id === list.listId ? { ...l, name: localName } : l);
        }
        return { ...oldData, folderlessLists: newFolderless, folderListsMap: newFolderListsMap };
      });

      await updateList(list.listId as string, { name: localName });
    } catch (err) {
      console.error('Failed to rename list:', err);
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSaving(false);
    }
  };

  const handleListKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); await handleSaveList(); }
    if (e.key === 'Escape') setSidebarOpen(false);
  };

  return {
    localName,
    setLocalName,
    isSaving,
    handleListKeyDown,
  };
}
