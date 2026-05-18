import { NextRequest, NextResponse } from "next/server";
import { BASE_URL, getHeaders, getTask } from "@/lib/clickup/api";
import { ClickUpTask } from "@/types/clickup";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await req.json();

    const { name, status, assignee_ids, due_date, description } = body as {
      name: string;
      status?: string;
      assignee_ids?: number[];
      due_date?: string; // YYYY-MM-DD
      description?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // 1. Get the Epic task to find its list_id
    const task = await getTask(taskId);
    const listId = task.list.id;

    // 2. Prepare payload for subtask
    const payload: any = {
      name: name.trim(),
      parent: taskId,
    };

    if (status) payload.status = status;
    if (assignee_ids && assignee_ids.length > 0) payload.assignees = assignee_ids;
    if (due_date) {
      payload.due_date = new Date(due_date).getTime();
      payload.due_date_time = false;
    }
    if (description) payload.description = description;

    // 3. Create subtask
    const res = await fetch(`${BASE_URL}/list/${listId}/task`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: `ClickUp API error [${res.status}]: ${error}` },
        { status: res.status }
      );
    }

    const newSubtask = (await res.json()) as ClickUpTask;
    return NextResponse.json(newSubtask, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
