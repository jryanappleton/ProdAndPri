import { NextRequest } from "next/server";
import { updateTaskPlacement } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      areaId: string | null;
      listId: string | null;
      lens?: TodayLens;
    };
    await updateTaskPlacement({
      taskId,
      areaId: body.areaId,
      listId: body.listId
    });
    return await bootstrapJson(body.lens);
  } catch (error) {
    return errorJson(error);
  }
}
