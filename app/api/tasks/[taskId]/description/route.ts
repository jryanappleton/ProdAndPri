import { NextRequest } from "next/server";
import { generateTaskDescriptionForTask } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      lens?: TodayLens;
    };

    await generateTaskDescriptionForTask(taskId);
    return await bootstrapJson(body.lens);
  } catch (error) {
    return errorJson(error);
  }
}
