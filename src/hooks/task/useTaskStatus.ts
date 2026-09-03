import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, TaskNodeData, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/types/clickup';
import { getStatus, getCategory } from '@/config/status';
import {
    shouldUpdateSubtasksOnParentStatusChange,
    getActiveSubtaskStatus,
    getDoneSubtaskStatus,
} from '@/domain/status/statusRules';
import { GraphSyncService } from '@/domain/graph/graphSync.service';

export function useTaskStatus(node: AppNode) {
    const task = node.data as TaskNodeData;
    const { updateTask } = useGraphStore();
    const queryClient = useQueryClient();

    const [localStatus, setLocalStatus] = useState<string>('');
    const [isSavingStatus, setIsSavingStatus] = useState(false);

    useEffect(() => {
        const statusConfig = getStatus(task.status);
        setLocalStatus(statusConfig?.id || task.status.toLowerCase());
    }, [task.status]);

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatusIdOrName = e.target.value;
        setLocalStatus(newStatusIdOrName);
        setIsSavingStatus(true);

        const statusConfig = getStatus(newStatusIdOrName);
        const newColor = statusConfig?.color || task.statusColor;
        const newLabel = statusConfig?.label.toLowerCase() || newStatusIdOrName;

        const { fullNodes } = useGraphStore.getState();
        const taskNodeId = `task-${task.taskId}`;
        const childNodes = fullNodes.filter(
            (n) => n.type === 'subtask' && (n.data as SubtaskNodeData).parentId === taskNodeId
        );

        const shouldUpdateSubtasks = shouldUpdateSubtasksOnParentStatusChange(newStatusIdOrName);
        const parentCategory = getCategory(newStatusIdOrName);

        let childrenToSync: AppNode[] = [];
        let childNewStatusId = '';
        let childNewColor = '';

        if (shouldUpdateSubtasks) {
            if (parentCategory === 'active') {
                childNewStatusId = getActiveSubtaskStatus();
                const activeConfig = getStatus(childNewStatusId);
                childNewColor = activeConfig?.color || '#999';

                childrenToSync = childNodes.filter((n) => {
                    const childCat = getCategory((n.data as SubtaskNodeData).status);
                    return childCat === 'not-started';
                });
            } else if (parentCategory === 'done') {
                childNewStatusId = getDoneSubtaskStatus();
                const doneConfig = getStatus(childNewStatusId);
                childNewColor = doneConfig?.color || '#999';

                childrenToSync = childNodes.filter((n) => {
                    const childCat = getCategory((n.data as SubtaskNodeData).status);
                    return childCat !== 'done';
                });
            }
        }

        const spaceId = useGraphStore.getState().spaceId;
        const queryKey = ['clickup-graph', spaceId];
        const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

        try {
            const updates = [
                {
                    id: `task-${task.taskId}`,
                    status: statusConfig?.id || newLabel,
                    color: newColor,
                },
                ...childrenToSync.map((c) => ({
                    id: c.id,
                    status: childNewStatusId,
                    color: childNewColor,
                })),
            ];
            useGraphStore.getState().updateNodesStatus(updates);

            queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
                return GraphSyncService.updateTasksStatusInCache(oldData, updates);
            });

            await Promise.all([
                updateTask(task.taskId as string, { status: statusConfig?.id || newStatusIdOrName }),
                ...childrenToSync.map((n) =>
                    updateTask((n.data as SubtaskNodeData).taskId, { status: childNewStatusId })
                ),
            ]);
        } catch (err) {
            console.error('Failed to update task status:', err);
            if (previousData) queryClient.setQueryData(queryKey, previousData);
            queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
        } finally {
            setIsSavingStatus(false);
        }
    };

    return {
        localStatus,
        setLocalStatus,
        isSavingStatus,
        handleStatusChange,
    };
}