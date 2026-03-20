import { NextRequest } from "next/server";
import { updateTaskStatus } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      status: "open" | "waiting_on" | "done";
      lens?: TodayLens;
    };
    await updateTaskStatus(taskId, body.status);
    return await bootstrapJson(body.lens);
  } catch (error) {
    return errorJson(error);
  }
}
