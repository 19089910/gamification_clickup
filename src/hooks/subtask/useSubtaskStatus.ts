import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/types/clickup';
import { getStatus } from '@/config/status'
import { checkComplete } from '@/domain/status/statusRules';

export function useSubtaskStatus(node: AppNode) {
    const subtask = node.data as SubtaskNodeData;
    const queryClient = useQueryClient();

    const [localStatus, setLocalStatus] = useState<string>('');
    const [isSavingStatus, setIsSavingStatus] = useState(false);

    useEffect(() => {
        const statusConfig = getStatus(subtask.status);
        setLocalStatus(statusConfig?.id || subtask.status.toLowerCase());
    }, [subtask.status]);

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setLocalStatus(newStatus);
        setIsSavingStatus(true);

        const parentId = subtask.parentId;
        const subtaskId = subtask.taskId;
        const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
        const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

        try {
            const { fullNodes } = useGraphStore.getState();

            // Mapeia os status de todas as subtasks irmãs considerando o novo status da subtask atual
            const siblingNodes = fullNodes.filter(
                (n) => n.type === 'subtask' && (n.data as SubtaskNodeData).parentId === parentId
            );

            const siblingStatuses = siblingNodes.map((n) => {
                if (n.id === `subtask-${subtaskId}`) return newStatus;
                return (n.data as SubtaskNodeData).status;
            });

            // Avalia a regra de conclusão dos irmãos utilizando a função pura do domínio
            const allSiblingsComplete = checkComplete(siblingStatuses);

            // Atualização Otimista no Zustand Store
            useGraphStore.setState((state) => {
                const config = getStatus(newStatus);
                let updatedFullNodes = state.fullNodes.map((n) => {
                    if (n.id === `subtask-${subtaskId}`) {
                        return {
                            ...n,
                            data: { ...n.data, status: newStatus, statusColor: config?.color || '#999' },
                        } as AppNode;
                    }
                    return n;
                });

                // Se todas as subtasks estiverem concluídas, conclui a Task Pai
                if (allSiblingsComplete) {
                    const parentConfig = getStatus('complete');
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

            // Atualização na Cache do React Query
            queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
                if (!oldData) return oldData;
                const newListTasksMap = { ...oldData.listTasksMap };
                let taskFound = false;

                for (const listId in newListTasksMap) {
                    const taskIndex = newListTasksMap[listId].findIndex((t) => t.id === subtaskId);
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

                        if (allSiblingsComplete) {
                            const parentIndex = newListTasksMap[listId].findIndex((t) => t.id === parentId);
                            if (parentIndex !== -1) {
                                const parentConfig = getStatus('complete');
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

            // Persiste no backend via Store / Mutation
            await useGraphStore.getState().updateTask(subtaskId as string, { status: newStatus });
        } catch (err) {
            console.error('Erro ao atualizar status da subtask:', err);
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