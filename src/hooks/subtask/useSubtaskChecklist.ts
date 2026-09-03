import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { saveChecklistMutation } from '@/lib/clickup/mutations';
import { ChecklistItemPayload } from '@/types/clickup';

export function useSubtaskChecklist(node: AppNode) {
    const subtask = node.data as SubtaskNodeData;
    const queryClient = useQueryClient();

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

    useEffect(() => {
        setItems(getInitialChecklistItems());
        setPendingItems([]);
    }, [subtask.checklists]);

    const isChecklistDirty = pendingItems.length > 0;

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
        const spaceId = useGraphStore.getState().spaceId;
        const queryKey = ['clickup-graph', spaceId];
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

    return {
        items,
        newItemName,
        setNewItemName,
        isSavingChecklist,
        isChecklistDirty,
        handleAddItemLocal,
        handleCheckboxChange,
        handleNameChange,
        handleSaveChecklist,
    };
}