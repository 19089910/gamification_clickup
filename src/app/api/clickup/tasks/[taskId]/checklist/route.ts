import { NextRequest, NextResponse } from "next/server";
import { BASE_URL, getHeaders } from "@/lib/clickup/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const body = await req.json();
    const { items } = body as {
      items: {
        checklistId: string;
        id: string;
        name: string;
        resolved: boolean;
      }[];
    };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    // Update each checklist item in parallel
    const results = await Promise.all(
      items.map(async (item) => {
        const res = await fetch(
          `${BASE_URL}/checklist/${item.checklistId}/checklist_item/${item.id}`,
          {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify({
              name: item.name,
              resolved: item.resolved,
            }),
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`ClickUp API error [${res.status}] for item ${item.id}: ${error}`);
        }

        return res.json();
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
