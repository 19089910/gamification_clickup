import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { TaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/types/clickup';
import { getStatus, getCategory } from '@/config/status';
import { TRIMESTRE_FIELD_ID, SEASON_MAP } from '@/config/quarters';
import { SubtaskNodeData, AppNode, Season } from '@/types/graph';
import { shouldUpdateSubtasksOnParentStatusChange, getActiveSubtaskStatus, getDoneSubtaskStatus } from '@/domain/status/statusRules';
import { GraphSyncService } from '@/domain/graph/graphSync.service';
import { useTaskName } from './task/useTaskName';

export function useTaskDetail(node: AppNode) {
  const { updateTask, selectedQuarter } = useGraphStore();
  const queryClient = useQueryClient();

  const task = node.data as TaskNodeData;

  const [localQuarter, setLocalQuarter] = useState<Season>();
  const [localStatus, setLocalStatus] = useState<string>('');
  const [isSavingOther, setIsSavingOther] = useState(false);

  // --- SUB-HOOK: Name & Tags ---
  const nameState = useTaskName(node, localQuarter);

  useEffect(() => {
    function isSeason(value: string): value is Season {
      return value in SEASON_MAP;
    }

    const resolvedQuarter = task.quarter && isSeason(task.quarter) ? task.quarter : selectedQuarter;
    setLocalQuarter(resolvedQuarter ?? undefined);

    const statusConfig = getStatus(task.status);
    setLocalStatus(statusConfig?.id || task.status.toLowerCase());
  }, [task.quarter, task.status, selectedQuarter]);

  const handleQuarterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQ = e.target.value as Season;
    setLocalQuarter(newQ);
    setIsSavingOther(true);

    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
    const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

    try {
      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        if (!oldData) return oldData;
        const newListTasksMap = { ...oldData.listTasksMap };
        let taskFound = false;

        for (const listId in newListTasksMap) {
          const taskIndex = newListTasksMap[listId].findIndex(t => t.id === task.taskId);
          if (taskIndex !== -1) {
            const originalTask = newListTasksMap[listId][taskIndex];
            const updatedTask = { ...originalTask, name: nameState.localName };

            if (newQ && SEASON_MAP[newQ]) {
              const cfIndex = updatedTask.custom_fields?.findIndex(cf => cf.id === TRIMESTRE_FIELD_ID);
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

      await updateTask(task.taskId as string, { name: nameState.localName, quarter: newQ });
    } catch (err) {
      console.error('Failed to update task quarter:', err);
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSavingOther(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatusIdOrName = e.target.value;
    setLocalStatus(newStatusIdOrName);
    setIsSavingOther(true);

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
      setIsSavingOther(false);
    }
  };

  return {
    ...nameState,
    localQuarter,
    localStatus,
    isSaving: nameState.isSavingName || setIsSavingOther,
    handleQuarterChange,
    handleStatusChange,
  };
}