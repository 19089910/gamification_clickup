import { NextRequest, NextResponse } from "next/server";
import { addDependency, removeDependency } from "@/lib/clickup/dependencies";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const { depends_on, dependency_type } = await req.json();

    if (!depends_on) {
      return NextResponse.json({ error: "depends_on is required" }, { status: 400 });
    }

    const result = await addDependency(taskId, depends_on, dependency_type || "waiting_on");
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const { searchParams } = new URL(req.url);
    const depends_on = searchParams.get("depends_on");
    const dependency_type = (searchParams.get("dependency_type") as "waiting_on" | "blocking") || "waiting_on";

    if (!depends_on) {
      return NextResponse.json({ error: "depends_on query param is required" }, { status: 400 });
    }

    const result = await removeDependency(taskId, depends_on, dependency_type);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
