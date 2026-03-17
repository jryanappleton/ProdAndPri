import { NextResponse } from "next/server";
import { listAccessibleRepositories } from "@/lib/server/github";
import { errorJson } from "@/lib/server/http";

export async function GET() {
  try {
    const repositories = await listAccessibleRepositories();
    return NextResponse.json({ repositories });
  } catch (error) {
    return errorJson(error);
  }
}
