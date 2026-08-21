import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { saveChecklistMutation, toggleTimerMutation } from '@/lib/clickup/mutations';
import { ChecklistItemPayload } from '@/types/clickup';

// 1. Sub-hooks refatorados
import { useSubtaskName } from './subtask/useSubtaskName';
import { useSubtaskStatus } from './subtask/useSubtaskStatus';

export function useSubtaskDetail(node: AppNode) {
  const subtask = node.data as SubtaskNodeData;

  // --- SUB-HOOKS ---
  const nameState = useSubtaskName(node);
  const statusState = useSubtaskStatus(node);

  // --- OUTRAS DEPENDÊNCIAS DO STORE ---
  const activeTimerTaskId = useGraphStore(s => s.activeTimerTaskId);
  const additionalMs = useGraphStore(s => s.additionalMs);
  const timerBaseMs = useGraphStore(s => s.timerBaseMs);
  const startTimer = useGraphStore(s => s.startTimer);
  const stopTimer = useGraphStore(s => s.stopTimer);

  const queryClient = useQueryClient();

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

  // Sincroniza estados residuais de checklist quando o nó mudar
  useEffect(() => {
    setItems(getInitialChecklistItems());
    setPendingItems([]);
  }, [subtask.checklists]);

  const isChecklistDirty = pendingItems.length > 0;

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
    ...nameState,
    ...statusState,

    isSaving: nameState.isSavingName || statusState.isSavingStatus,

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