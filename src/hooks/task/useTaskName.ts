import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, TaskNodeData, Season } from '@/types/graph';
import { GraphApiResponse } from '@/types/clickup';
import { extractTagsFromName } from '@/utils/label-parser';
import { TRIMESTRE_FIELD_ID, SEASON_MAP } from '@/config/quarters';

export function useTaskName(node: AppNode, localQuarter?: Season) {
    const task = node.data as TaskNodeData;
    const { updateTask, setSidebarOpen, updateNodeTags } = useGraphStore();
    const queryClient = useQueryClient();

    const [localName, setLocalName] = useState(task.label as string);
    const [isSavingName, setIsSavingName] = useState(false);

    useEffect(() => {
        setLocalName(task.label as string);
    }, [task.label]);

    const handleSaveTask = async () => {
        if (!localName.trim()) return;

        const spaceId = useGraphStore.getState().spaceId;
        const queryKey = ['clickup-graph', spaceId];
        const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);
        const newTags = extractTagsFromName(localName);
        const existingTags = (task.tags || []).map((t) => t.name);
        const tagsToAdd = newTags.filter((t) => !existingTags.includes(t));

        setIsSavingName(true);
        try {
            const updates = { name: localName, quarter: localQuarter };

            queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
                if (!oldData) return oldData;
                const newListTasksMap = { ...oldData.listTasksMap };
                let taskFound = false;

                for (const listId in newListTasksMap) {
                    const taskIndex = newListTasksMap[listId].findIndex((t) => t.id === task.taskId);
                    if (taskIndex !== -1) {
                        const originalTask = newListTasksMap[listId][taskIndex];
                        const updatedTask = { ...originalTask, name: localName };

                        if (localQuarter && SEASON_MAP[localQuarter]) {
                            const cfIndex = updatedTask.custom_fields?.findIndex((cf) => cf.id === TRIMESTRE_FIELD_ID);
                            const customFields = [...(updatedTask.custom_fields || [])];

                            if (cfIndex !== undefined && cfIndex !== -1) {
                                customFields[cfIndex] = { ...customFields[cfIndex], value: SEASON_MAP[localQuarter] };
                            } else {
                                customFields.push({ id: TRIMESTRE_FIELD_ID, value: SEASON_MAP[localQuarter] } as any);
                            }
                            updatedTask.custom_fields = customFields;
                        }

                        if (tagsToAdd.length > 0) {
                            updateNodeTags(task.taskId, newTags);
                        }

                        newListTasksMap[listId][taskIndex] = updatedTask;
                        taskFound = true;
                        break;
                    }
                }
                return taskFound ? { ...oldData, listTasksMap: newListTasksMap } : oldData;
            });

            await updateTask(task.taskId as string, { ...updates, tags: tagsToAdd });
        } catch (err) {
            console.error('Failed to update task:', err);
            if (previousData) queryClient.setQueryData(queryKey, previousData);
            queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
        } finally {
            setIsSavingName(false);
        }
    };

    const handleTaskKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handleSaveTask();
        }
        if (e.key === 'Escape') setSidebarOpen(false);
    };

    return {
        localName,
        setLocalName,
        isSavingName,
        handleSaveTask,
        handleTaskKeyDown,
    };
}