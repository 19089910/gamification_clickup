import { NodeState } from '@/types/graph';

export function getNodeState(quarters: string[], selectedQuarter: string | null): NodeState {
  if (!selectedQuarter || selectedQuarter === 'All') return 'active';
  return quarters.includes(selectedQuarter) ? 'active' : 'inactive';
}

export function cleanListName(name: string): string {
  // Removes strings like [TAG] or (TAG) from the start/middle of the list name
  return name.replace(/\[.*?\]|\(.*?\)/g, '').trim();
}

type NodeType = 'space' | 'folder' | 'list' | 'task' | 'subtask';

export function getDefaultCollapsed(type: NodeType): boolean {
  switch (type) {
    case 'space':
      return false;
    case 'folder':
      return true; // Folders iniciam fechados
    case 'list':
      return false;
    case 'task':
      return false;
    case 'subtask':
      return false;
    default:
      return false;
  }
}
