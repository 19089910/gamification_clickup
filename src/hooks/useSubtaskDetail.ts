import { AppNode } from '@/types/graph';
import { useSubtaskName } from './subtask/useSubtaskName';
import { useSubtaskStatus } from './subtask/useSubtaskStatus';
import { useSubtaskChecklist } from './subtask/useSubtaskChecklist';
import { useSubtaskTimer } from './subtask/useSubtaskTimer';

export function useSubtaskDetail(node: AppNode) {
  // Single Responsibility Principle (SRP) sub-hooks
  // --- SUB-HOOKS ---
  const nameState = useSubtaskName(node);
  const statusState = useSubtaskStatus(node);
  const checklistState = useSubtaskChecklist(node);
  const timerState = useSubtaskTimer(node);

  return {
    ...nameState,
    ...statusState,
    ...checklistState,
    ...timerState,

    // Unified flag for text/status saving states in UI
    isSaving: nameState.isSavingName || statusState.isSavingStatus,
  };
}