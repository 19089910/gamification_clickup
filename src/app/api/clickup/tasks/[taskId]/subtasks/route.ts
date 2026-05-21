import { NextRequest, NextResponse } from "next/server";
import { fetchClickUp } from "@/lib/clickup/api";
import { ClickUpTask } from "@/types/clickup";
import { BASE_URL, getHeaders } from "@/lib/clickup/api";

// === 1. FLUXO DE BUSCA (GET subtasks) ===
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const task = await fetchClickUp<ClickUpTask>(`/task/${taskId}?include_subtasks=true`);
    return NextResponse.json(task.subtasks || []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// === 2. FLUXO DE CRIAÇÃO (POST subtask) ===
export async function POST(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const taskId = resolvedParams?.taskId;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, status, assignee_ids, due_date, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Buscamos a task pai para descobrir a lista de destino automaticamente
    const taskRes = await fetch(`${BASE_URL}/task/${taskId}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!taskRes.ok) {
      return NextResponse.json({ error: "Parent task not found in ClickUp" }, { status: 404 });
    }

    const parentTask = await taskRes.json();
    const listId = parentTask?.list?.id || parentTask?.list_id;

    if (!listId) {
      return NextResponse.json({ error: "Could not find a valid list_id for the parent task" }, { status: 400 });
    }

    // Monta o payload padrão para o ClickUp
    const payload: any = {
      name: name.trim(),
      parent: taskId, // Vincula como subtask da tarefa pai
    };

    if (status) payload.status = status;
    if (assignee_ids && assignee_ids.length > 0) payload.assignees = assignee_ids;
    if (due_date) {
      payload.due_date = new Date(due_date).getTime();
      payload.due_date_time = false;
    }
    if (description) payload.description = description;

    // Dispara a criação na lista correta
    const res = await fetch(`${BASE_URL}/list/${listId}/task`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `ClickUp API Subtask creation failed: ${errorText}` },
        { status: res.status }
      );
    }

    const newSubtask = await res.json();
    return NextResponse.json(newSubtask, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}