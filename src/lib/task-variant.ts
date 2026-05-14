import { hasDevTag } from './dev-mode';
import { ClickUpTask } from '@/types/clickup';

export type TaskVariant = 'default' | 'epic';

export function getTaskVariant(task: ClickUpTask): TaskVariant {
  if (hasDevTag(task)) return 'epic';
  return 'default';
}
