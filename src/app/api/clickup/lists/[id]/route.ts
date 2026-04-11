import { NextRequest, NextResponse } from 'next/server';
import { updateList } from '@/lib/clickup';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params;
    const body = await req.json();

    if (!listId) {
      return NextResponse.json({ error: 'listId is required' }, { status: 400 });
    }

    const result = await updateList(listId, body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params });
}
