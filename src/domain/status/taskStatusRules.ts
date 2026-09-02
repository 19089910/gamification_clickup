import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, TaskNodeData, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/types/clickup';
import { getStatus, getCategory } from '@/config/status';
import {
    getActiveSubtaskStatus,
    getDoneSubtaskStatus,
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
        const parentCategory = getCategory(newStatus);
        setLocalStatus(newStatus);
        setIsSavingStatus(true);

        const taskId = task.taskId;
        const rawCleanId = taskId.replace(/^(task|subtask)-/, '');
        const spaceId = useGraphStore.getState().spaceId;
        const queryKey = ['clickup-graph', spaceId];
        const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

        try {
            const shouldPropagate = shouldUpdateSubtasksOnParentStatusChange(newStatus);
            const targetActiveStatus = getActiveSubtaskStatus();
            const targetDoneStatus = getDoneSubtaskStatus();

            // 1. Atualização Otimista no Zustand State
            useGraphStore.setState((state) => {
                const parentConfig = getStatus(newStatus);

                const updatedNodes = state.fullNodes.map((n) => {
                    const nodeRawId = n.id.replace(/^(task|subtask)-/, '');

                    // A) Atualiza o próprio nó alterado (Pai ou Filha)
                    if (nodeRawId === rawCleanId) {
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                status: newStatus,
                                statusColor: parentConfig?.color || '#999',
                                isOptimistic: true, // Protege contra resets na refetch
                            },
                        } as AppNode;
                    }

                    // B) Propagação em cascata da Task Pai para as Subtasks filhas
                    if (shouldPropagate && n.type === 'subtask') {
                        const subtaskData = n.data as SubtaskNodeData;
                        const subtaskParentClean = subtaskData.parentId?.replace(/^(task|subtask)-/, '');

                        if (subtaskParentClean === rawCleanId) {
                            const currentSubCategory = getCategory(subtaskData.status);

                            // Regra 1: Pai vai para 'active' -> Subtasks em 'not-started' mudam para 'active'
                            if (parentCategory === 'active' && currentSubCategory === 'not-started') {
                                const activeConfig = getStatus(targetActiveStatus);
                                return {
                                    ...n,
                                    data: {
                                        ...n.data,
                                        status: targetActiveStatus,
                                        statusColor: activeConfig?.color || '#999',
                                        isOptimistic: true,
                                    },
                                } as AppNode;
                            }

                            // Regra 2: Pai vai para 'done' -> Todas as subtasks filhas concluem ('done')
                            if (parentCategory === 'done' && currentSubCategory !== 'done') {
                                const doneConfig = getStatus(targetDoneStatus);
                                return {
                                    ...n,
                                    data: {
                                        ...n.data,
                                        status: targetDoneStatus,
                                        statusColor: doneConfig?.color || '#999',
                                        isOptimistic: true,
                                    },
                                } as AppNode;
                            }
                        }
                    }

                    return n;
                });

                return {
                    fullNodes: updatedNodes,
                    selectedNode: updatedNodes.find((n) => n.id === node.id) || null,
                };
            });

            // 2. Atualização Otimista na Cache do React Query
            queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
                if (!oldData) return oldData;
                const newListTasksMap = { ...oldData.listTasksMap };

                for (const listId in newListTasksMap) {
                    const taskIndex = newListTasksMap[listId].findIndex(
                        (t) => t.id === rawCleanId
                    );
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

            // 3. Chamada de Persistência HTTP via Store
            await useGraphStore.getState().updateTask(rawCleanId, { status: newStatus });
        } catch (err) {
            console.error('Erro ao atualizar status da task:', err);
            // Rollback para estado anterior da cache
            if (previousData) {
                queryClient.setQueryData(queryKey, previousData);
            }
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