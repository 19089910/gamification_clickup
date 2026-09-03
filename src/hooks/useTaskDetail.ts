import { AppNode } from '@/types/graph';
import { useTaskName } from './task/useTaskName';
import { useTaskQuarter } from './task/useTaskQuarter';
import { useTaskStatus } from './task/useTaskStatus';

export function useTaskDetail(node: AppNode) {
  const nameState = useTaskName(node);
  const quarterState = useTaskQuarter(node, nameState.localName);
  const statusState = useTaskStatus(node);

  const isSaving =
    nameState.isSavingName ||
    quarterState.isSavingQuarter ||
    statusState.isSavingStatus;

  return {
    ...nameState,
    ...quarterState,
    ...statusState,
    isSaving,
  };
}