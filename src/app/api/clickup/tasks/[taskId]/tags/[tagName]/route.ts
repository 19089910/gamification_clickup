import { NextRequest, NextResponse } from 'next/server';
import { addTagToTask, removeTagFromTask } from '@/lib/clickup';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string; tagName: string }> }
) {
  try {
    const { taskId, tagName } = await params;

    if (!taskId || !tagName) {
      return NextResponse.json({ error: 'taskId and tagName are required' }, { status: 400 });
    }

    await addTagToTask(taskId, tagName);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string; tagName: string }> }
) {
  try {
    const { taskId, tagName } = await params;

    if (!taskId || !tagName) {
      return NextResponse.json({ error: 'taskId and tagName are required' }, { status: 400 });
    }

    await removeTagFromTask(taskId, tagName);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
