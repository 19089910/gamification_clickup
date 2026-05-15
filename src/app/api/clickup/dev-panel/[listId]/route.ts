import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { fetchClickUp } from '@/lib/clickup/api';
import { ClickUpList, ClickUpTask, TasksResponse } from '@/types/clickup';

/**
 * GET /api/clickup/dev-panel/[listId]
 *
 * Returns the list metadata + all top-level tasks (with their subtasks).
 * The client then separates:
 *   - Milestones  → tasks where task.custom_item_id === 1
 *   - Epics       → regular top-level tasks (task.custom_item_id !== 1)
 *   - Issues      → subtasks of Epics
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;

    if (!listId) {
      return NextResponse.json({ error: 'listId is required' }, { status: 400 });
    }

    const [list, tasksData] = await Promise.all([
      fetchClickUp<ClickUpList>(`/list/${listId}`),
      // include_closed=true   → see completed tasks
      // subtasks=true         → expand subtask objects inline
      // milestone=true        → include ClickUp milestone tasks
      fetchClickUp<TasksResponse>(
        `/list/${listId}/task?archived=false&include_closed=true&subtasks=true`
      ),
    ]);

    // Separate top-level tasks (no parent) from subtasks already embedded
    const topLevelTasks = tasksData.tasks.filter((t) => !t.parent);

    return NextResponse.json({
      list,
      tasks: topLevelTasks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
