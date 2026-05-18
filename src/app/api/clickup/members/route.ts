import { NextRequest, NextResponse } from "next/server";
import { getTeams, getMembers } from "@/lib/clickup/api";

export async function GET(req: NextRequest) {
  try {
    const teams = await getTeams();
    if (teams.length === 0) {
      return NextResponse.json({ error: "No teams found" }, { status: 404 });
    }
    const teamId = teams[0].id; // Use first team as default
    const members = await getMembers(teamId);
    return NextResponse.json(members);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
