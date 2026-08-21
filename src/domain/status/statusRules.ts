import { STATUS_CONFIG, getCategory, StatusCategory } from '@/config/status';


/**
 * Retorna o ID do status inicial para uma subtask (primeiro da categoria 'not-started').
 * Fallback para 'planning' se não encontrar.
 */
export function getInitialSubtaskStatus(): string {
  const initial = STATUS_CONFIG.find((item) => item.category === 'not-started');
  return initial ? initial.id : 'planning';
}

/**
 * Verifica se todas as subtasks filhas estão concluídas (categoria 'done').
 */
export function checkComplete(siblingStatuses: string[]): boolean {
  if (siblingStatuses.length === 0) return false;
  return siblingStatuses.every((status) => getCategory(status) === 'done');
}

/**
 * Regra: Determina se a alteração do status da Task Pai exige atualização das subtasks.
 * Retorna true quando a Task Pai assume qualquer status da categoria 'active'.
 */
export function shouldUpdateSubtasksOnParentStatusChange(newParentStatus: string): boolean {
  return getCategory(newParentStatus) === 'active';
}