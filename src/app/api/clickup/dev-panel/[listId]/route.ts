import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { fetchClickUp } from '@/lib/clickup/api';
import { ClickUpList, ClickUpTask, TasksResponse } from '@/types/clickup';

/**
 * GET /api/clickup/dev-panel/[listId]
 *
 * Returns list metadata + top-level tasks with subtasks properly nested.
 *
 * ClickUp's ?subtasks=true returns subtasks as FLAT siblings in the array
 * (each with a `parent` field), NOT nested inside the parent task.
 * We manually build the tree here so the client always gets:
 *
 *   task.subtasks = ClickUpTask[]   ← populated for Epics
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
      fetchClickUp<TasksResponse>(
        `/list/${listId}/task?archived=false&include_closed=true&subtasks=true`
      ),
    ]);

    const allTasks: ClickUpTask[] = tasksData.tasks;

    // ── Build parent → children map ──────────────────────────────────────
    // ClickUp returns subtasks flat with task.parent = parentTaskId (string)
    const childrenMap = new Map<string, ClickUpTask[]>();

    for (const task of allTasks) {
      const parentId = typeof task.parent === 'string'
        ? task.parent
        : (task.parent as any)?.id ?? null;

      if (parentId) {
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
        childrenMap.get(parentId)!.push(task);
      }
    }

    // ── Attach subtasks to each top-level task ────────────────────────────
    const topLevel = allTasks
      .filter((t) => {
        const parentId = typeof t.parent === 'string'
          ? t.parent
          : (t.parent as any)?.id ?? null;
        return !parentId;
      })
      .map((task) => ({
        ...task,
        subtasks: childrenMap.get(task.id) ?? [],
      }));

    return NextResponse.json({
      list,
      tasks: topLevel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}