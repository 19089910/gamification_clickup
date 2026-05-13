import { NextRequest, NextResponse } from 'next/server';
import { createList, createTask, addCustomFieldToList } from '@/lib/clickup';
import { TRIMESTRE_FIELD_ID } from '@/config/quarters';

export async function POST(req: NextRequest) {
  try {
    const { folderId, name, quarter } = await req.json();

    if (!folderId || !name) {
      return NextResponse.json({ error: 'folderId and name are required' }, { status: 400 });
    }

    // Step 1: Create the List
    const list = await createList(folderId, name);
    
    // Step 2: Ensure "Trimestres" field exists on the list
    try {
      const fieldResult = await addCustomFieldToList(list.id, TRIMESTRE_FIELD_ID);
      if (fieldResult && fieldResult.err && fieldResult.ECODE !== 'FIELD_198') {
        console.warn("Non-critical error adding custom field:", fieldResult.err);
      }
    } catch (fieldError) {
      console.warn("Failed to contact custom field API:", fieldError);
    }

    // Step 3: Create the "geral" task
    let taskCreated = false;
    let taskError = null;
    
    try {
      await createTask(list.id, "geral", quarter);
      taskCreated = true;
    } catch (error) {
      console.error("Failed to create 'geral' task:", error);
      taskError = error instanceof Error ? error.message : 'Unknown error';
    }


    return NextResponse.json({ 
      list, 
      taskCreated, 
      taskWarning: taskCreated ? null : `List created but failed to create 'geral' task: ${taskError}` 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
