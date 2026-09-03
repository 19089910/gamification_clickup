import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { TaskNodeData, SubtaskNodeData, AppNode } from '@/types/graph';
import { GraphApiResponse } from '@/types/clickup';
import { getStatus, getCategory } from '@/config/status';
import { shouldUpdateSubtasksOnParentStatusChange, getActiveSubtaskStatus, getDoneSubtaskStatus } from '@/domain/status/statusRules';
import { GraphSyncService } from '@/domain/graph/graphSync.service';
import { useTaskName } from './task/useTaskName';
import { useTaskQuarter } from './task/useTaskQuarter';

export function useTaskDetail(node: AppNode) {
  const { updateTask } = useGraphStore();
  const queryClient = useQueryClient();

  const task = node.data as TaskNodeData;

  const [localStatus, setLocalStatus] = useState<string>('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // --- SUB-HOOKS ---
  const nameState = useTaskName(node);
  const quarterState = useTaskQuarter(node, nameState.localName);

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
    const childNodes = fullNodes.filter(
      n => n.type === 'subtask' && (n.data as SubtaskNodeData).parentId === task.taskId
    );

    // Usa a regra de domínio para verificar se deve propagar o status
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

        childrenToSync = childNodes.filter(n => {
          const childCat = getCategory((n.data as SubtaskNodeData).status);
          return childCat === 'not-started';
        });
      } else if (parentCategory === 'done') {
        childNewStatusId = getDoneSubtaskStatus();
        const doneConfig = getStatus(childNewStatusId);
        childNewColor = doneConfig?.color || '#999';

        childrenToSync = childNodes.filter(n => {
          const childCat = getCategory((n.data as SubtaskNodeData).status);
          return childCat !== 'done';
        });
      }
    }

    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
    const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

    try {
      // Zustand otimista — pai e filhos em cascata via store (SOLID)
      const updates = [
        {
          id: `task-${task.taskId}`,
          status: statusConfig?.id || newLabel,
          color: newColor,
        },
        ...childrenToSync.map(c => ({
          id: c.id,
          status: childNewStatusId,
          color: childNewColor,
        }))
      ];
      useGraphStore.getState().updateNodesStatus(updates);

      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        return GraphSyncService.updateTasksStatusInCache(oldData, updates);
      });

      await Promise.all([
        updateTask(task.taskId as string, { status: statusConfig?.id || newStatusIdOrName }),
        ...childrenToSync.map(n =>
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
    ...nameState,
    ...quarterState,
    localStatus,
    isSaving: nameState.isSavingName || quarterState.isSavingQuarter || isSavingStatus,
    handleStatusChange,
  };
}