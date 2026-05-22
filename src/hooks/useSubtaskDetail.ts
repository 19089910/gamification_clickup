import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/hooks/useClickUpData';
import { getStatusFromConfig } from '@/config/status';
import { saveChecklistMutation, toggleTimerMutation } from '@/lib/clickup/mutations';
import { ChecklistItemPayload } from '@/types/clickup';

export function useSubtaskDetail(node: AppNode) {
  const { updateTask, setSidebarOpen } = useGraphStore();
  const queryClient = useQueryClient();
  const subtask = node.data as SubtaskNodeData;

  // --- ESTADOS DA TASK GERAL ---
  const [localName, setLocalName] = useState(subtask.label as string);
  const [localStatus, setLocalStatus] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Sincroniza estados gerais e de checklist quando o nó mudar
  useEffect(() => {
    setLocalName(subtask.label as string);
    const statusConfig = getStatusFromConfig(subtask.status);
    setLocalStatus(statusConfig?.id || subtask.status.toLowerCase());

    // Sincroniza os itens de checklist locais
    setItems(getInitialChecklistItems());
    setPendingItems([]);
  }, [subtask.label, subtask.status, subtask.checklists]);

  const isChecklistDirty = pendingItems.length > 0;

  // --- HANDLERS DO NOME E STATUS ---
  const handleSaveName = async () => {
    if (!localName.trim() || localName === subtask.label) return;

    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
    const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

    setIsSaving(true);
    try {
      // Optimistic update no cache
      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        if (!oldData) return oldData;
        const newListTasksMap = { ...oldData.listTasksMap };

        for (const listId in newListTasksMap) {
          const idx = newListTasksMap[listId].findIndex(t => t.id === subtask.taskId);
          if (idx !== -1) {
            newListTasksMap[listId][idx] = {
              ...newListTasksMap[listId][idx],
              name: localName,
            };
            break;
          }
        }
        return { ...oldData, listTasksMap: newListTasksMap };
      });

      // Optimistic update no Zustand
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

      // 1. Optimistic Update inside Zustand
      useGraphStore.setState((state) => {
        const config = getStatusFromConfig(newStatus);
        let updatedFullNodes = state.fullNodes.map((n) => {
          if (n.id === `subtask-${subtaskId}`) {
            return {
              ...n,
              data: {
                ...n.data,
                status: newStatus,
                statusColor: config?.color || '#999',
              },
            } as AppNode;
          }
          return n;
        });

        if (allSiblingsComplete) {
          const parentConfig = getStatusFromConfig('complete');
          updatedFullNodes = updatedFullNodes.map((n) => {
            if (n.id === `task-${parentId}`) {
              return {
                ...n,
                data: {
                  ...n.data,
                  status: 'complete',
                  statusColor: parentConfig?.color || '#0f9d9f',
                },
              } as AppNode;
            }
            return n;
          });
        }

        const updatedSelectedNode = updatedFullNodes.find((n) => n.id === node.id) || null;

        return {
          fullNodes: updatedFullNodes,
          selectedNode: updatedSelectedNode,
        };
      });

      // 2. Optimistic Update inside React Query cache
      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        if (!oldData) return oldData;
        const newListTasksMap = { ...oldData.listTasksMap };
        let taskFound = false;

        for (const listId in newListTasksMap) {
          const taskIndex = newListTasksMap[listId].findIndex((t) => t.id === subtaskId);
          if (taskIndex !== -1) {
            const originalTask = newListTasksMap[listId][taskIndex];
            const config = getStatusFromConfig(newStatus);
            const updatedTask = {
              ...originalTask,
              status: {
                ...originalTask.status,
                status: config?.id || newStatus,
                color: config?.color || '#999',
              },
            };
            newListTasksMap[listId][taskIndex] = updatedTask;

            if (allSiblingsComplete) {
              const parentIndex = newListTasksMap[listId].findIndex((t) => t.id === parentId);
              if (parentIndex !== -1) {
                const parentConfig = getStatusFromConfig('complete');
                newListTasksMap[listId][parentIndex] = {
                  ...newListTasksMap[listId][parentIndex],
                  status: {
                    ...newListTasksMap[listId][parentIndex].status,
                    status: 'complete',
                    color: parentConfig?.color || '#0f9d9f',
                  },
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
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSaving(false);
    }
  };

  // --- HANDLERS INTERNOS DO CHECKLIST ---
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
        if (item.id === itemId) {
          const updated = { ...item, resolved: checked };
          setPendingItems((prevPending) => {
            const clean = prevPending.filter((p) => p.id !== itemId);
            return [...clean, updated];
          });
          return updated;
        }
        return item;
      })
    );
  };

  const handleNameChange = (itemId: string, name: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, name };
          setPendingItems((prevPending) => {
            const clean = prevPending.filter((p) => p.id !== itemId);
            return [...clean, updated];
          });
          return updated;
        }
        return item;
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
  // Pode iniciar baseado em alguma flag que venha da API se a task já tiver um timer ativo
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isSavingTimer, setIsSavingTimer] = useState(false);

  const handleToggleTimer = async () => {
    if (isSavingTimer) return;

    const action = isTimerActive ? 'stop' : 'start';
    setIsSavingTimer(true);

    // Optimistic update visual rápido na tela
    setIsTimerActive(!isTimerActive);

    try {
      await toggleTimerMutation(subtask.taskId, action);

      // Invalida o grafo para recalcular e trazer o "time_spent" atualizado do backend
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } catch (err) {
      console.error(err);
      // Desfaz o estado caso a API falhe
      setIsTimerActive(isTimerActive);
      alert('Não foi possível alterar o timer no ClickUp.');
    } finally {
      setIsSavingTimer(false);
    }
  };

  return {
    // Retornos originais
    localName,
    setLocalName,
    localStatus,
    isSaving,
    inputRef,
    handleTaskKeyDown,
    handleStatusChange,

    // Novos retornos de checklist
    items,
    newItemName,
    setNewItemName,
    isSavingChecklist,
    isChecklistDirty,
    handleAddItemLocal,
    handleCheckboxChange,
    handleNameChange,
    handleSaveChecklist,

    // Novos retornos de timer
    isTimerActive,
    isSavingTimer,
    handleToggleTimer,
  };
}