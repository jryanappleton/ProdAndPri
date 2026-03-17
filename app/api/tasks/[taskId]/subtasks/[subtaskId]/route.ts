import { NextRequest } from "next/server";
import { toggleSubtask } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string; subtaskId: string }> }
) {
  try {
    const { taskId, subtaskId } = await context.params;
    const task = await toggleSubtask(taskId, subtaskId);
    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
