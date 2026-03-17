import { NextRequest } from "next/server";
import { deleteTask, updateTask } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      title: string;
      description: string;
      areaId: string | null;
      listId: string | null;
    };

    const task = await updateTask({
      taskId,
      title: body.title,
      description: body.description,
      areaId: body.areaId,
      listId: body.listId
    });

    return dataJson({ task });
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
