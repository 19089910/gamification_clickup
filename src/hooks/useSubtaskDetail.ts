import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/hooks/useClickUpData';
import { getStatusFromConfig } from '@/config/status';

export function useSubtaskDetail(node: AppNode) {
  const { updateTask } = useGraphStore();
  const queryClient = useQueryClient();
  const subtask = node.data as SubtaskNodeData;

  const [localStatus, setLocalStatus] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const statusConfig = getStatusFromConfig(subtask.status);
    setLocalStatus(statusConfig?.id || subtask.status.toLowerCase());
  }, [subtask.status]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setLocalStatus(newStatus);
    setIsSaving(true);

    const parentId = subtask.parentId;
    const subtaskId = subtask.taskId;

    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
    const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);

    try {
      const { fullNodes } = useGraphStore.getState();
      
      // Find all siblings (subtasks of the same parent)
      const siblingNodes = fullNodes.filter(
        (n) => n.type === 'subtask' && (n.data as SubtaskNodeData).parentId === parentId
      );

      // Check if all siblings are complete (including this one's new status)
      const allSiblingsComplete = siblingNodes.every((n) => {
        if (n.id === `subtask-${subtaskId}`) return newStatus === 'complete';
        return (n.data as SubtaskNodeData).status.toLowerCase() === 'complete';
      });

      // 1. Optimistic Update inside Zustand
      useGraphStore.setState((state) => {
        const config = getStatusFromConfig(newStatus);
        let updatedFullNodes = state.fullNodes.map((n) => {
          if (n.id === `subtask-${subtaskId}`) {
            return {
              ...n,
              data: {
                ...n.data,
                status: newStatus,
                statusColor: config?.color || '#999',
              },
            } as AppNode;
          }
          return n;
        });

        // If all siblings are complete, parent also becomes complete
        if (allSiblingsComplete) {
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

        // Find the newly updated selectedNode
        const updatedSelectedNode = updatedFullNodes.find((n) => n.id === node.id) || null;

        return {
          fullNodes: updatedFullNodes,
          selectedNode: updatedSelectedNode,
        };
      });

      // 2. Optimistic Update inside React Query cache
      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        if (!oldData) return oldData;
        const newListTasksMap = { ...oldData.listTasksMap };
        let taskFound = false;

        for (const listId in newListTasksMap) {
          const taskIndex = newListTasksMap[listId].findIndex((t) => t.id === subtaskId);
          if (taskIndex !== -1) {
            const originalTask = newListTasksMap[listId][taskIndex];
            const config = getStatusFromConfig(newStatus);
            const updatedTask = {
              ...originalTask,
              status: {
                ...originalTask.status,
                status: config?.id || newStatus,
                color: config?.color || '#999',
              },
            };
            newListTasksMap[listId][taskIndex] = updatedTask;

            // Also check if we should update the parent task in the query cache
            if (allSiblingsComplete) {
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

      // 3. API update call
      await updateTask(subtaskId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update subtask status:', err);
      // Rollback to previous state on error
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    localStatus,
    isSaving,
    handleStatusChange,
  };
}
