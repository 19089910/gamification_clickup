import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, TaskNodeData, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/hooks/useClickUpData';
import { getStatus } from '@/config/status';
import {
    getInitialSubtaskStatus,
    shouldUpdateSubtasksOnParentStatusChange,
} from '@/domain/status/statusRules';

export function useTaskStatus(node: AppNode) {
    const task = node.data as TaskNodeData;
    const queryClient = useQueryClient();

    const [localStatus, setLocalStatus] = useState<string>('');
    const [isSavingStatus, setIsSavingStatus] = useState(false);

    useEffect(() => {
        const statusConfig = getStatus(task.status);
        setLocalStatus(statusConfig?.id || task.status.toLowerCase());
    }, [task.status]);

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setLocalStatus(newStatus);
        setIsSavingStatus(true);

        const taskId = task.taskId;
        const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
        const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

        try {
            const initialSubtaskStatus = getInitialSubtaskStatus();
            const shouldPropagateToSubtasks = shouldUpdateSubtasksOnParentStatusChange(newStatus);

            // Atualização Otimista no Zustand
            useGraphStore.setState((state) => {
                const config = getStatus(newStatus);

                const updatedNodes = state.fullNodes.map((n) => {
                    // Atualiza a Task Pai
                    if (n.id === `task-${taskId}`) {
                        return {
                            ...n,
                            data: { ...n.data, status: newStatus, statusColor: config?.color || '#999' },
                        } as AppNode;
                    }

                    // Propaga para subtasks que estiverem em 'not-started' quando a Task Pai for para 'active'
                    if (
                        shouldPropagateToSubtasks &&
                        n.type === 'subtask' &&
                        (n.data as SubtaskNodeData).parentId === taskId
                    ) {
                        const subtaskData = n.data as SubtaskNodeData;
                        const subtaskConfig = getStatus(subtaskData.status);

                        if (!subtaskConfig || subtaskConfig.category === 'not-started') {
                            const initConfig = getStatus(initialSubtaskStatus);
                            return {
                                ...n,
                                data: {
                                    ...n.data,
                                    status: initialSubtaskStatus,
                                    statusColor: initConfig?.color || '#999',
                                },
                            } as AppNode;
                        }
                    }

                    return n;
                });

                return {
                    fullNodes: updatedNodes,
                    selectedNode: updatedNodes.find((n) => n.id === node.id) || null,
                };
            });

            // Atualização na Cache do React Query
            queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
                if (!oldData) return oldData;
                const newListTasksMap = { ...oldData.listTasksMap };

                for (const listId in newListTasksMap) {
                    const taskIndex = newListTasksMap[listId].findIndex((t) => t.id === taskId);
                    if (taskIndex !== -1) {
                        const config = getStatus(newStatus);
                        newListTasksMap[listId][taskIndex] = {
                            ...newListTasksMap[listId][taskIndex],
                            status: {
                                ...newListTasksMap[listId][taskIndex].status,
                                status: config?.id || newStatus,
                                color: config?.color || '#999',
                            },
                        };
                        break;
                    }
                }
                return { ...oldData, listTasksMap: newListTasksMap };
            });

            // Persiste via Mutation/Store
            await useGraphStore.getState().updateTask(taskId as string, { status: newStatus });
        } catch (err) {
            console.error('Erro ao atualizar status da task:', err);
            if (previousData) queryClient.setQueryData(queryKey, previousData);
            queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
        } finally {
            setIsSavingStatus(false);
        }
    };

    return {
        localStatus,
        isSavingStatus,
        handleStatusChange,
    };
}