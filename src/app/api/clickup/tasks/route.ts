import { NextRequest, NextResponse } from 'next/server';
import { createTask, getMe } from '@/lib/clickup';

export async function POST(req: NextRequest) {
  try {
    const { listId, name, quarter } = await req.json();

    if (!listId || !name) {
      return NextResponse.json({ error: 'listId and name are required' }, { status: 400 });
    }

    // Buscar o usuário logado para atribuir como responsável automático
    let assignees: number[] = [];
    try {
      const me = await getMe();
      if (me?.user?.id) {
        assignees = [me.user.id];
      }
    } catch (err) {
      console.warn('Could not fetch user for default assignee:', err);
    }

    const task = await createTask(listId, name, quarter, assignees);
    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
