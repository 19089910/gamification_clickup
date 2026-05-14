import { ClickUpTask } from '@/types/clickup';

export function hasDevTag(task: ClickUpTask): boolean {
  return task.tags?.some(t => t.name.toLowerCase() === 'dev') ?? false;
}

export function isDevList(tasks: ClickUpTask[]): boolean {
  return tasks.some(hasDevTag);
}
