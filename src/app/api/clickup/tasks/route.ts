import { NextRequest, NextResponse } from 'next/server';
import { createTask } from '@/lib/clickup';

export async function POST(req: NextRequest) {
  try {
    const { listId, name, quarter } = await req.json();

    if (!listId || !name) {
      return NextResponse.json({ error: 'listId and name are required' }, { status: 400 });
    }

    const task = await createTask(listId, name, quarter);
    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
