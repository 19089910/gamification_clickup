import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/types/clickup';
import { getStatus } from '@/config/status'
import { checkComplete } from '@/domain/status/statusRules';
import { GraphSyncService } from '@/domain/graph/graphSync.service';

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

            // Atualização Otimista no Zustand Store via Store (SOLID)
            const config = getStatus(newStatus);
            const updates = [
                {
                    id: `subtask-${subtaskId}`,
                    status: newStatus,
                    color: config?.color || '#999',
                }
            ];

            if (allSiblingsComplete) {
                const parentConfig = getStatus('complete');
                updates.push({
                    id: parentId,  // ← parentId já é 'task-86e2hvrwc', não precisa do prefixo
                    status: 'complete',
                    color: parentConfig?.color || '#0f9d9f',
                });
            }

            useGraphStore.getState().updateNodesStatus(updates);
            console.log('parentId:', parentId);
            console.log('updates:', updates);
            // Atualização na Cache do React Query (SOLID)
            queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
                return GraphSyncService.updateTasksStatusInCache(oldData, updates);
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