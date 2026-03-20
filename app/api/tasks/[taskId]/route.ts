import { NextRequest } from "next/server";
import { deleteTask, updateTask } from "@/lib/server/app-state";
import { bootstrapJson, dataJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      title: string;
      description: string;
      nextAction: string;
      areaId: string | null;
      listId: string | null;
      tagIds: string[];
      lens?: TodayLens;
    };

    await updateTask({
      taskId,
      title: body.title,
      description: body.description,
      nextAction: body.nextAction,
      areaId: body.areaId,
      listId: body.listId,
      tagIds: body.tagIds
    });

    return await bootstrapJson(body.lens);
  } catch (error) {
    return errorJson(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    await deleteTask(taskId);
    return dataJson({ taskId });
  } catch (error) {
    return errorJson(error);
  }
}
