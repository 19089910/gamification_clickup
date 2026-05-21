import { ClickUpTask } from '@/types/clickup';
import { updateTask } from '@/lib/clickup';

export function getStatusCategory(statusId: string): 'inactive' | 'active' | 'done' {
  const normalized = statusId.toLowerCase();
  // 'planning'                           → 'inactive'
  // 'in progress'|'at risk'|...          → 'active'  
  // 'complete'                           → 'done'
  if (normalized === 'planning') {
    return 'inactive';
  }
  if (normalized === 'complete') {
    return 'done';
  }
  return 'active';
}

// Chamado quando um filho muda de status
export async function syncParentOnChildUpdate(
  parentId: string,
  allSiblings: ClickUpTask[]
): Promise<void> {
  const allComplete = allSiblings.every(s => s.status.status.toLowerCase() === 'complete');
  if (allComplete) {
    await updateTask(parentId, { status: 'complete' });
  }
}

// Chamado quando o pai muda de status
export async function syncChildrenOnParentUpdate(
  parentStatus: string,
  children: ClickUpTask[]
): Promise<void> {
  const parentCategory = getStatusCategory(parentStatus);
  if (parentCategory !== 'active') return;

  const childrenToUpdate = children.filter(c => 
    getStatusCategory(c.status.status) === 'inactive'
    // 'planning' → atualiza. 'complete' ou já 'active' → não toca
  );

  await Promise.all(
    childrenToUpdate.map(c => updateTask(c.id, { status: parentStatus }))
  );
}
