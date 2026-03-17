import { NextRequest } from "next/server";
import { fileTaskFromInbox } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      areaId: string | null;
      listId: string | null;
    };

    const task = await fileTaskFromInbox({
      taskId,
      areaId: body.areaId,
      listId: body.listId
    });

    return dataJson({ task });
  } catch (error) {
    return errorJson(error);
  }
}
