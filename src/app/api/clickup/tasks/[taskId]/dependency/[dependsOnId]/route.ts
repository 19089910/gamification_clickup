import { NextRequest, NextResponse } from "next/server";
import { removeDependency } from "@/lib/clickup/dependencies";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string; dependsOnId: string }> }
) {
  try {
    const { taskId, dependsOnId } = await params;
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") as "waiting_on" | "blocking") || "waiting_on";

    const result = await removeDependency(taskId, dependsOnId, type);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
