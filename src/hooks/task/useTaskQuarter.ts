import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, TaskNodeData, Season } from '@/types/graph';
import { GraphApiResponse } from '@/types/clickup';
import { TRIMESTRE_FIELD_ID, SEASON_MAP } from '@/config/quarters';

export function useTaskQuarter(node: AppNode, localName: string) {
    const task = node.data as TaskNodeData;
    const { updateTask, selectedQuarter } = useGraphStore();
    const queryClient = useQueryClient();

    const [localQuarter, setLocalQuarter] = useState<Season>();
    const [isSavingQuarter, setIsSavingQuarter] = useState(false);

    useEffect(() => {
        function isSeason(value: string): value is Season {
            return value in SEASON_MAP;
        }

        const resolvedQuarter = task.quarter && isSeason(task.quarter) ? task.quarter : selectedQuarter;
        setLocalQuarter(resolvedQuarter ?? undefined);
    }, [task.quarter, selectedQuarter]);

    const handleQuarterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newQ = e.target.value as Season;
        setLocalQuarter(newQ);
        setIsSavingQuarter(true);

        const spaceId = useGraphStore.getState().spaceId;
        const queryKey = ['clickup-graph', spaceId];
        const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

        try {
            queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
                if (!oldData) return oldData;
                const newListTasksMap = { ...oldData.listTasksMap };
                let taskFound = false;

                for (const listId in newListTasksMap) {
                    const taskIndex = newListTasksMap[listId].findIndex((t) => t.id === task.taskId);
                    if (taskIndex !== -1) {
                        const originalTask = newListTasksMap[listId][taskIndex];
                        const updatedTask = { ...originalTask, name: localName };

                        if (newQ && SEASON_MAP[newQ]) {
                            const cfIndex = updatedTask.custom_fields?.findIndex((cf) => cf.id === TRIMESTRE_FIELD_ID);
                            const customFields = [...(updatedTask.custom_fields || [])];

                            if (cfIndex !== undefined && cfIndex !== -1) {
                                customFields[cfIndex] = { ...customFields[cfIndex], value: SEASON_MAP[newQ] };
                            } else {
                                customFields.push({ id: TRIMESTRE_FIELD_ID, value: SEASON_MAP[newQ] } as any);
                            }
                            updatedTask.custom_fields = customFields;
                        }

                        newListTasksMap[listId][taskIndex] = updatedTask;
                        taskFound = true;
                        break;
                    }
                }
                return taskFound ? { ...oldData, listTasksMap: newListTasksMap } : oldData;
            });

            await updateTask(task.taskId as string, { name: localName, quarter: newQ });
        } catch (err) {
            console.error('Failed to update task quarter:', err);
            if (previousData) queryClient.setQueryData(queryKey, previousData);
            queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
        } finally {
            setIsSavingQuarter(false);
        }
    };

    return {
        localQuarter,
        setLocalQuarter,
        isSavingQuarter,
        handleQuarterChange,
    };
}