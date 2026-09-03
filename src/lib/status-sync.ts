import { ClickUpTask } from '@/types/clickup';
import { updateTask } from '@/lib/clickup';
import { getCategory } from '@/config/status';
import {
  checkComplete,
  shouldUpdateSubtasksOnParentStatusChange,
  getActiveSubtaskStatus,
  getDoneSubtaskStatus
} from '@/domain/status/statusRules';

// Chamado quando um filho muda de status
export async function syncParentOnChildUpdate(
  parentId: string,
  allSiblings: ClickUpTask[]
): Promise<void> {
  const siblingStatuses = allSiblings.map(s => s.status.status);
  const allComplete = checkComplete(siblingStatuses);
  if (allComplete) {
    await updateTask(parentId, { status: 'complete' });
  }
}

// Chamado quando o pai muda de status
export async function syncChildrenOnParentUpdate(
  parentStatus: string,
  children: ClickUpTask[]
): Promise<void> {
  const shouldUpdate = shouldUpdateSubtasksOnParentStatusChange(parentStatus);
  if (!shouldUpdate) return;

  const parentCategory = getCategory(parentStatus);
  let childrenToUpdate: ClickUpTask[] = [];
  let childNewStatusId = '';

  if (parentCategory === 'active') {
    childNewStatusId = getActiveSubtaskStatus();
    childrenToUpdate = children.filter(c =>
      getCategory(c.status.status) === 'not-started'
    );
  } else if (parentCategory === 'done') {
    childNewStatusId = getDoneSubtaskStatus();
    childrenToUpdate = children.filter(c =>
      getCategory(c.status.status) !== 'done'
    );
  }

  if (childrenToUpdate.length > 0 && childNewStatusId) {
    await Promise.all(
      childrenToUpdate.map(c => updateTask(c.id, { status: childNewStatusId }))
    );
  }
}

