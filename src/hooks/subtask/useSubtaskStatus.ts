import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/hooks/useClickUpData';
import { getStatusFromConfig } from '@/config/status';
import { evaluateSubtaskStatusChange } from '@/domain/status/statusRules';

export function useSubtaskStatus(node: AppNode) {
    const subtask = node.data as SubtaskNodeData;
    const updateTask = useGraphStore((s) => s.updateTask);
    const queryClient = useQueryClient();

    const [localStatus, setLocalStatus] = useState<string>('');
    const [isSavingStatus, setIsSavingStatus] = useState(false);

    useEffect(() => {
        const statusConfig = getStatusFromConfig(subtask.status);
        setLocalStatus(statusConfig?.id || subtask.status.toLowerCase());
    }, [subtask.status]);

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setLocalStatus(newStatus);
        setIsSavingStatus(true);

        const parentId = subtask.parentId;
        const subtaskId = subtask.taskId;
        const spaceId = useGraphStore.getState().spaceId;
        const queryKey = ['clickup-graph', spaceId];
        const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

        try {
            const { fullNodes } = useGraphStore.getState();

            // Apply the Domain Rule:
            const { allSiblingsFeito } = evaluateSubtaskStatusChange(
                subtaskId as string,
                parentId as string,
                newStatus,
                fullNodes
            );

            // 1. Optimistic Update no Zustand
            useGraphStore.setState((state) => {
                const config = getStatusFromConfig(newStatus);
                let updatedFullNodes = state.fullNodes.map((n) => {
                    if (n.id === `subtask-${subtaskId}`) {
                        return {
                            ...n,
                            data: { ...n.data, status: newStatus, statusColor: config?.color || '#999' },
                        } as AppNode;
                    }
                    return n;
                });

                // Business Rule: If all subtasks are marked as 'Done,' the parent task becomes 'Complete'
                if (allSiblingsFeito) {
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

                return {
                    fullNodes: updatedFullNodes,
                    selectedNode: updatedFullNodes.find((n) => n.id === node.id) || null,
                };
            });

            // 2. Optimistic Update no React Query Cache
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
                            status: {
                                ...newListTasksMap[listId][taskIndex].status,
                                status: config?.id || newStatus,
                                color: config?.color || '#999',
                            },
                        };

                        if (allSiblingsFeito) {
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

            await updateTask(subtaskId as string, { status: newStatus });
        } catch (err) {
            console.error('Failed to update subtask status:', err);
            if (previousData) queryClient.setQueryData(queryKey, previousData);
            queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
        } finally {
            setIsSavingStatus(false);
        }
    };

    return { localStatus, isSavingStatus, handleStatusChange };
}