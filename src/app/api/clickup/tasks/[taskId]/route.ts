import { NextRequest, NextResponse } from 'next/server';
import { updateTask } from '@/lib/clickup';
import { fetchClickUp } from '@/lib/clickup/api';
import { ClickUpTask, TasksResponse } from '@/types/clickup';
import { syncParentOnChildUpdate, syncChildrenOnParentUpdate } from '@/lib/status-sync';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const result = await updateTask(taskId, body);

    // Call status sync if status is updated
    if (body.status) {
      try {
        const task = await fetchClickUp<ClickUpTask>(`/task/${taskId}`);
        if (task.parent) {
          // If it's a subtask (child), fetch siblings and sync parent
          const listTasks = await fetchClickUp<TasksResponse>(
            `/list/${task.list.id}/task?archived=false&subtasks=true`
          );
          const siblings = listTasks.tasks.filter(t => t.parent === task.parent);
          // Manually update the status of the current task in the siblings list
          // to make sure we reflect the updated status immediately
          const updatedSiblings = siblings.map(s => {
            if (s.id === taskId) {
              return { ...s, status: { ...s.status, status: body.status } };
            }
            return s;
          });
          await syncParentOnChildUpdate(task.parent, updatedSiblings);
        } else {
          // If it's a parent task, fetch children and sync them
          const listTasks = await fetchClickUp<TasksResponse>(
            `/list/${task.list.id}/task?archived=false&subtasks=true`
          );
          const children = listTasks.tasks.filter(t => t.parent === taskId);
          await syncChildrenOnParentUpdate(body.status, children);
        }
      } catch (syncErr) {
        console.error('Error in status synchronization:', syncErr);
        // Do not fail the main request if sync fails
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return PATCH(req, { params });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const task = await fetchClickUp<ClickUpTask>(`/task/${taskId}?include_subtasks=true`);
    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
