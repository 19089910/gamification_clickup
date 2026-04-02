import { NextRequest, NextResponse } from 'next/server';
import { getFolders, getFolderlessLists, getLists, getTasks } from '@/lib/clickup';
import { ClickUpList, ClickUpTask } from '@/types/clickup';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const spaceId = searchParams.get('spaceId');

  if (!spaceId) {
    return NextResponse.json({ error: 'spaceId is required' }, { status: 400 });
  }

  try {
    // Fetch folders and folderless lists in parallel
    const [folders, folderlessLists] = await Promise.all([
      getFolders(spaceId),
      getFolderlessLists(spaceId),
    ]);

    // Fetch lists for all folders in parallel
    const folderListsEntries = await Promise.all(
      folders.map(async (folder) => {
        const lists = await getLists(folder.id);
        return [folder.id, lists] as [string, ClickUpList[]];
      })
    );
    const folderListsMap = Object.fromEntries(folderListsEntries);

    // Collect all list IDs (from folders + folderless)
    const allLists: ClickUpList[] = [
      ...folderListsEntries.flatMap(([, lists]) => lists),
      ...folderlessLists,
    ];

    // Fetch tasks for all lists in parallel
    const listTasksEntries = await Promise.all(
      allLists.map(async (list) => {
        const tasks = await getTasks(list.id);
        return [list.id, tasks] as [string, ClickUpTask[]];
      })
    );
    const listTasksMap = Object.fromEntries(listTasksEntries);

    return NextResponse.json({
      folders,
      folderlessLists,
      folderListsMap,
      listTasksMap,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
