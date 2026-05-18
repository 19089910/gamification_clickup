import { NextRequest, NextResponse } from "next/server";
import { addDependency } from "@/lib/clickup/dependencies";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const { dependsOnId, type } = await req.json();

    if (!dependsOnId) {
      return NextResponse.json({ error: "dependsOnId is required" }, { status: 400 });
    }

    const result = await addDependency(taskId, dependsOnId, type || "waiting_on");
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
