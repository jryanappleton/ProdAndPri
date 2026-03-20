import { NextRequest } from "next/server";
import { toggleSubtask, updateSubtaskTitle } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string; subtaskId: string }> }
) {
  try {
    const { taskId, subtaskId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      lens?: TodayLens;
    };
    if (typeof body.title === "string") {
      await updateSubtaskTitle(taskId, subtaskId, body.title);
    } else {
      await toggleSubtask(taskId, subtaskId);
    }
    return await bootstrapJson(body.lens);
  } catch (error) {
    return errorJson(error);
  }
}
