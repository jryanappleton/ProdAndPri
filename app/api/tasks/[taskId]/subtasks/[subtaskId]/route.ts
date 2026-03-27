import { NextRequest } from "next/server";
import {
  setSubtaskAsNextAction,
  toggleSubtask,
  updateSubtaskTitle
} from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string; subtaskId: string }> }
) {
  try {
    const { taskId, subtaskId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      action?: "toggle" | "set_next_action";
    };
    if (body.action === "set_next_action") {
      const task = await setSubtaskAsNextAction(taskId, subtaskId);
      return dataJson({ task });
    }

    if (typeof body.title === "string") {
      const task = await updateSubtaskTitle(taskId, subtaskId, body.title);
      return dataJson({ task });
    } else {
      const task = await toggleSubtask(taskId, subtaskId);
      return dataJson({ task });
    }
  } catch (error) {
    return errorJson(error);
  }
}
