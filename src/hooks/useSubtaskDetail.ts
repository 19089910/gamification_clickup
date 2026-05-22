import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/hooks/useClickUpData';
import { getStatusFromConfig } from '@/config/status';
import { saveChecklistMutation, toggleTimerMutation } from '@/lib/clickup/mutations';
import { ChecklistItemPayload } from '@/types/clickup';

export function useSubtaskDetail(node: AppNode) {
  // substituir a desestruturação atual por seletores individuais

  const updateTask = useGraphStore(s => s.updateTask);
  const setSidebarOpen = useGraphStore(s => s.setSidebarOpen);
  const activeTimerTaskId = useGraphStore(s => s.activeTimerTaskId);
  const additionalMs = useGraphStore(s => s.additionalMs);
  const timerBaseMs = useGraphStore(s => s.timerBaseMs);
  const startTimer = useGraphStore(s => s.startTimer);
  const stopTimer = useGraphStore(s => s.stopTimer);

  const queryClient = useQueryClient();
  const subtask = node.data as SubtaskNodeData;

  // --- ESTADOS DA TASK GERAL ---
  const [localName, setLocalName] = useState(subtask.label as string);
  const [localStatus, setLocalStatus] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- ESTADOS DO TIMER ---
  const [isSavingTimer, setIsSavingTimer] = useState(false);
  const isTimerActive = activeTimerTaskId === subtask.taskId;

  // --- ESTADOS DO CHECKLIST ---
  const getInitialChecklistItems = (): ChecklistItemPayload[] => {
    return (subtask.checklists || []).flatMap((checklist) =>
      checklist.items.map((item) => ({
        ...item,
        checklistId: checklist.id,
      }))
    );
  };

  const [items, setItems] = useState<ChecklistItemPayload[]>(getInitialChecklistItems());
  const [pendingItems, setPendingItems] = useState<ChecklistItemPayload[]>([]);
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  // Sincroniza estados quando o nó mudar
  useEffect(() => {
    setLocalName(subtask.label as string);
    const statusConfig = getStatusFromConfig(subtask.status);
    setLocalStatus(statusConfig?.id || subtask.status.toLowerCase());
    setItems(getInitialChecklistItems());
    setPendingItems([]);
  }, [subtask.label, subtask.status, subtask.checklists]);

  const isChecklistDirty = pendingItems.length > 0;

  // --- HANDLERS DO NOME ---
  const handleSaveName = async () => {
    if (!localName.trim() || localName === subtask.label) return;

    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
    const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

    setIsSaving(true);
    try {
      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        if (!oldData) return oldData;
        const newListTasksMap = { ...oldData.listTasksMap };
        for (const listId in newListTasksMap) {
          const idx = newListTasksMap[listId].findIndex(t => t.id === subtask.taskId);
          if (idx !== -1) {
            newListTasksMap[listId][idx] = { ...newListTasksMap[listId][idx], name: localName };
            break;
          }
        }
        return { ...oldData, listTasksMap: newListTasksMap };
      });

      useGraphStore.setState(state => ({
        fullNodes: state.fullNodes.map(n =>
          n.id === `subtask-${subtask.taskId}`
            ? { ...n, data: { ...n.data, label: localName } } as AppNode
            : n
        ),
      }));

      await updateTask(subtask.taskId as string, { name: localName });
    } catch (err) {
      console.error('Failed to update subtask name:', err);
      if (previousData) queryClient.setQueryData(queryKey, previousData);
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTaskKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); await handleSaveName(); }
    if (e.key === 'Escape') setSidebarOpen(false);
  };

  // --- HANDLER DE STATUS ---
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setLocalStatus(newStatus);
    setIsSaving(true);

    const parentId = subtask.parentId;
    const subtaskId = subtask.taskId;
    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
    const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

    try {
      const { fullNodes } = useGraphStore.getState();

      const siblingNodes = fullNodes.filter(
        (n) => n.type === 'subtask' && (n.data as SubtaskNodeData).parentId === parentId
      );

      const allSiblingsComplete = siblingNodes.every((n) => {
        if (n.id === `subtask-${subtaskId}`) return newStatus === 'complete';
        return (n.data as SubtaskNodeData).status.toLowerCase() === 'complete';
      });

      // 1. Optimistic Update no Zustand
      useGraphStore.setState((state) => {
        const config = getStatusFromConfig(newStatus);
        let updatedFullNodes = state.fullNodes.map((n) => {
          if (n.id === `subtask-${subtaskId}`) {
            return { ...n, data: { ...n.data, status: newStatus, statusColor: config?.color || '#999' } } as AppNode;
          }
          return n;
        });

        if (allSiblingsComplete) {
          const parentConfig = getStatusFromConfig('complete');
          updatedFullNodes = updatedFullNodes.map((n) => {
            if (n.id === `task-${parentId}`) {
              return { ...n, data: { ...n.data, status: 'complete', statusColor: parentConfig?.color || '#0f9d9f' } } as AppNode;
            }
            return n;
          });
        }

        return {
          fullNodes: updatedFullNodes,
          selectedNode: updatedFullNodes.find((n) => n.id === node.id) || null,
        };
      });

      // 2. Optimistic Update no React Query cache
      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        if (!oldData) return oldData;
        const newListTasksMap = { ...oldData.listTasksMap };
        let taskFound = false;

        for (const listId in newListTasksMap) {
          const taskIndex = newListTasksMap[listId].findIndex((t) => t.id === subtaskId);
          if (taskIndex !== -1) {
            const config = getStatusFromConfig(newStatus);
            newListTasksMap[listId][taskIndex] = {
              ...newListTasksMap[listId][taskIndex],
              status: { ...newListTasksMap[listId][taskIndex].status, status: config?.id || newStatus, color: config?.color || '#999' },
            };

            if (allSiblingsComplete) {
              const parentIndex = newListTasksMap[listId].findIndex((t) => t.id === parentId);
              if (parentIndex !== -1) {
                const parentConfig = getStatusFromConfig('complete');
                newListTasksMap[listId][parentIndex] = {
                  ...newListTasksMap[listId][parentIndex],
                  status: { ...newListTasksMap[listId][parentIndex].status, status: 'complete', color: parentConfig?.color || '#0f9d9f' },
                };
              }
            }

            taskFound = true;
            break;
          }
        }
        return taskFound ? { ...oldData, listTasksMap: newListTasksMap } : oldData;
      });

      await updateTask(subtaskId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update subtask status:', err);
      if (previousData) queryClient.setQueryData(queryKey, previousData);
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSaving(false);
    }
  };

  // --- HANDLERS DO CHECKLIST ---
  const handleAddItemLocal = () => {
    if (!newItemName.trim()) return;
    const defaultChecklistId = subtask.checklists?.[0]?.id || '';
    const newItem: ChecklistItemPayload = {
      id: `temp-item-${Date.now()}`,
      name: newItemName.trim(),
      resolved: false,
      checklistId: defaultChecklistId,
      isNew: true,
    };
    setItems((prev) => [...prev, newItem]);
    setPendingItems((prev) => [...prev, newItem]);
    setNewItemName('');
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, resolved: checked };
        setPendingItems((prev) => [...prev.filter((p) => p.id !== itemId), updated]);
        return updated;
      })
    );
  };

  const handleNameChange = (itemId: string, name: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, name };
        setPendingItems((prev) => [...prev.filter((p) => p.id !== itemId), updated]);
        return updated;
      })
    );
  };

  const handleSaveChecklist = async () => {
    setIsSavingChecklist(true);
    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
    try {
      await saveChecklistMutation(subtask.taskId, pendingItems);
      setPendingItems([]);
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar o checklist. Tente novamente.');
    } finally {
      setIsSavingChecklist(false);
    }
  };

  // --- HANDLER DO TIMER ---
  const handleToggleTimer = async () => {
    if (isSavingTimer) return;
    setIsSavingTimer(true);
    try {
      if (!isTimerActive) {
        startTimer(subtask.taskId as string, (subtask.time_spent as number) ?? 0);

        await toggleTimerMutation(subtask.taskId, 'start');
      }
      else {
        await toggleTimerMutation(subtask.taskId, 'stop');
        stopTimer();
        await queryClient.invalidateQueries({
          queryKey: ['clickup-graph', useGraphStore.getState().spaceId],
        });
      }
    } catch (err) {
      // rollback
      if (!isTimerActive) stopTimer(); else startTimer(subtask.taskId as string);
      console.error('Erro ao sincronizar cronômetro:', err);
    } finally {
      setIsSavingTimer(false);
    }
  };

  return {
    localName,
    setLocalName,
    localStatus,
    isSaving,
    inputRef,
    handleTaskKeyDown,
    handleStatusChange,

    items,
    newItemName,
    setNewItemName,
    isSavingChecklist,
    isChecklistDirty,
    handleAddItemLocal,
    handleCheckboxChange,
    handleNameChange,
    handleSaveChecklist,

    isTimerActive,
    isSavingTimer,
    handleToggleTimer,
    additionalMs,
    timerBaseMs,
  };
}