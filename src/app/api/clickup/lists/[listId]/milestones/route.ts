import { NextRequest, NextResponse } from 'next/server';
import { BASE_URL, getHeaders } from '@/lib/clickup/api';
import { ClickUpTask } from '@/types/clickup';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    const body = await req.json();

    const { name, start_date, due_date, description } = body as {
      name: string;
      start_date?: string; // "YYYY-MM-DD"
      due_date?: string;   // "YYYY-MM-DD"
      description?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      custom_item_id: 1, // 1 = Milestone type
    };

    // Convert "YYYY-MM-DD" → Unix timestamp in ms (what ClickUp expects)
    if (start_date) {
      payload.start_date = new Date(start_date).getTime();
      payload.start_date_time = false;
    }

    if (due_date) {
      payload.due_date = new Date(due_date).getTime();
      payload.due_date_time = false; // date only, no time component
    }

    if (description?.trim()) {
      payload.description = description.trim();
    }

    const res = await fetch(`${BASE_URL}/list/${listId}/task`, {
      method: 'POST',
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

    const task = (await res.json()) as ClickUpTask;
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
