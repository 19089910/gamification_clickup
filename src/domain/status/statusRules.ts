import { STATUS_CONFIG, getCategory, StatusCategory } from '@/config/status';

/**
 * Retorna o ID do status inicial da categoria 'not-started' (ex: 'planning').
 */
export function getInitialSubtaskStatus(): string {
  const initial = STATUS_CONFIG.find((item) => item.category === 'not-started');
  return initial ? initial.id : 'planning';
}

/**
 * Retorna o primeiro status da categoria 'active' (ex: 'in progress' / 'in-progress').
 * Usado para mover subtasks em standby quando a Task Pai inicia.
 */
export function getActiveSubtaskStatus(): string {
  const active = STATUS_CONFIG.find((item) => item.category === 'active');
  return active ? active.id : 'in progress';
}

/**
 * Retorna o primeiro status da categoria 'done' (ex: 'complete').
 */
export function getDoneSubtaskStatus(): string {
  const done = STATUS_CONFIG.find((item) => item.category === 'done');
  return done ? done.id : 'complete';
}

/**
 * Verifica se todas as subtasks filhas estão na categoria 'done'.
 */
export function checkComplete(siblingStatuses: string[]): boolean {
  if (siblingStatuses.length === 0) return false;
  return siblingStatuses.every((status) => getCategory(status) === 'done');
}

/**
 * Regra: Determina se a alteração do status da Task Pai exige atualização em cascata nas subtasks.
 * Retorna true quando a Task Pai vai para 'active' ou 'done'.
 */
export function shouldUpdateSubtasksOnParentStatusChange(newParentStatus: string): boolean {
  const category = getCategory(newParentStatus);
  return category === 'active' || category === 'done';
}