import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/hooks/useClickUpData';

export function useSubtaskName(node: AppNode) {
    const subtask = node.data as SubtaskNodeData;
    const updateTask = useGraphStore((s) => s.updateTask);
    const setSidebarOpen = useGraphStore((s) => s.setSidebarOpen);
    const queryClient = useQueryClient();

    const [localName, setLocalName] = useState(subtask.label as string);
    const [isSavingName, setIsSavingName] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalName(subtask.label as string);
    }, [subtask.label]);

    const handleSaveName = async () => {
        if (!localName.trim() || localName === subtask.label) return;

        const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
        const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

        setIsSavingName(true);
        try {
            queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
                if (!oldData) return oldData;
                const newListTasksMap = { ...oldData.listTasksMap };
                for (const listId in newListTasksMap) {
                    const idx = newListTasksMap[listId].findIndex((t) => t.id === subtask.taskId);
                    if (idx !== -1) {
                        newListTasksMap[listId][idx] = { ...newListTasksMap[listId][idx], name: localName };
                        break;
                    }
                }
                return { ...oldData, listTasksMap: newListTasksMap };
            });

            useGraphStore.setState((state) => ({
                fullNodes: state.fullNodes.map((n) =>
                    n.id === `subtask-${subtask.taskId}`
                        ? ({ ...n, data: { ...n.data, label: localName } } as AppNode)
                        : n
                ),
            }));

            await updateTask(subtask.taskId as string, { name: localName });
        } catch (err) {
            console.error('Failed to update subtask name:', err);
            if (previousData) queryClient.setQueryData(queryKey, previousData);
            queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
        } finally {
            setIsSavingName(false);
        }
    };

    const handleTaskKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handleSaveName();
        }
        if (e.key === 'Escape') setSidebarOpen(false);
    };

    return {
        localName,
        setLocalName,
        isSavingName,
        inputRef,
        handleSaveName,
        handleTaskKeyDown,
    };
}