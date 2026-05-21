import { NextRequest, NextResponse } from "next/server";
import { fetchClickUp } from "@/lib/clickup/api";
import { ClickUpTask } from "@/types/clickup";

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
