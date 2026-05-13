import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { TaskNodeData } from '@/types/graph';
import { GraphApiResponse } from '@/hooks/useClickUpData';
import { getStatusFromConfig } from '@/config/status';
import { TRIMESTRE_FIELD_ID, SEASON_MAP, type Season } from '@/config/quarters';
import { extractTagsFromName } from '@/utils/label-parser';


export function useTaskDetail(node: any) {
  const { updateTask, selectedQuarter, setSidebarOpen, updateNodeTags } = useGraphStore();
  const queryClient = useQueryClient();

  const task = node.data as TaskNodeData;

  const [localName, setLocalName] = useState(task.label as string);
  const [localQuarter, setLocalQuarter] = useState<Season>();
  const [localStatus, setLocalStatus] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function isSeason(value: string): value is Season {
      return value in SEASON_MAP;
    }

    setLocalName(task.label as string);
    const resolvedQuarter = task.quarter && isSeason(task.quarter) ? task.quarter : selectedQuarter;
    setLocalQuarter(resolvedQuarter ?? undefined);
    
    const statusConfig = getStatusFromConfig(task.status);
    setLocalStatus(statusConfig?.id || task.status.toLowerCase());
  }, [task.label, task.quarter, task.status, selectedQuarter]);

  const handleSaveTask = async () => {
    if (!localName.trim()) return;

    const queryKey = ['clickup-graph', useGraphStore.getState().spaceId];
    const previousData = queryClient.getQueryData<GraphApiResponse>(queryKey);
    const newTags = extractTagsFromName(localName);
    const existingTags = (task.tags || []).map(t => t.name);
    const tagsToAdd = newTags.filter(t => !existingTags.includes(t));

    setIsSaving(true);
    try {
      const updates = { name: localName, quarter: localQuarter };
      // 1. Optimistic update no React Query cache
      queryClient.setQueryData(queryKey, (oldData: GraphApiResponse | undefined) => {
        if (!oldData) return oldData;
        const newListTasksMap = { ...oldData.listTasksMap };
        let taskFound = false;

        for (const listId in newListTasksMap) {
          const taskIndex = newListTasksMap[listId].findIndex(t => t.id === task.taskId);
          if (taskIndex !== -1) {
            const originalTask = newListTasksMap[listId][taskIndex];
            const updatedTask = { ...originalTask, name: localName };
            
            if (localQuarter && SEASON_MAP[localQuarter]) {
              const cfIndex = updatedTask.custom_fields?.findIndex(cf => cf.id === TRIMESTRE_FIELD_ID);
              const customFields = [...(updatedTask.custom_fields || [])];
              
              if (cfIndex !== undefined && cfIndex !== -1) {
                customFields[cfIndex] = { ...customFields[cfIndex], value: SEASON_MAP[localQuarter] };
              }
              else {
                customFields.push({ id: TRIMESTRE_FIELD_ID, value: SEASON_MAP[localQuarter] } as any);
              }
              updatedTask.custom_fields = customFields;
            }
            // 2. Optimistic update das tags no Zustand
            if (tagsToAdd.length > 0) {
              updateNodeTags(task.taskId, newTags);
            }
            
            newListTasksMap[listId][taskIndex] = updatedTask;
            taskFound = true;
            break;
          }
        }
        return taskFound ? { ...oldData, listTasksMap: newListTasksMap } : oldData;
      });
    // 3. API call
    await updateTask(task.taskId as string, { ...updates, tags: tagsToAdd });
    } catch (err) {
      console.error('Failed to update task:', err);
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTaskKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); await handleSaveTask(); }
    if (e.key === 'Escape') setSidebarOpen(false);
  };

  const handleQuarterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQ = e.target.value as Season;
    setLocalQuarter(newQ);
    setIsSaving(true);
    
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
            const updatedTask = { ...originalTask, name: localName };
            
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

      await updateTask(task.taskId as string, { name: localName, quarter: newQ });
    } catch (err) {
      console.error('Failed to update task quarter:', err);
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatusIdOrName = e.target.value;
    setLocalStatus(newStatusIdOrName);
    setIsSaving(true);
    
    const statusConfig = getStatusFromConfig(newStatusIdOrName);
    const newColor = statusConfig?.color || task.statusColor;
    const newLabel = statusConfig?.label.toLowerCase() || newStatusIdOrName;

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
            const updatedTask = { 
              ...originalTask, 
              status: { 
                ...originalTask.status, 
                status: statusConfig?.id || newLabel,
                color: newColor 
              } 
            };
            newListTasksMap[listId][taskIndex] = updatedTask;
            taskFound = true;
            break;
          }
        }
        return taskFound ? { ...oldData, listTasksMap: newListTasksMap } : oldData;
      });

      await updateTask(task.taskId as string, { status: statusConfig?.id || newStatusIdOrName });
    } catch (err) {
      console.error('Failed to update task status:', err);
      if (previousData) queryClient.setQueryData(queryKey, previousData);
      queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    localName,
    setLocalName,
    localQuarter,
    localStatus,
    isSaving,
    handleTaskKeyDown,
    handleQuarterChange,
    handleStatusChange,
  };
}
