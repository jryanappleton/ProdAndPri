import { NextRequest } from "next/server";
import { updateTaskStatus } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      status: "open" | "waiting_on" | "done";
    };
    const task = await updateTaskStatus(taskId, body.status);
    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
