import { NextRequest } from "next/server";
import { deleteList } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await context.params;
    const lens = request.nextUrl.searchParams.get("lens") as TodayLens | null;
    await deleteList(listId);
    return await bootstrapJson(lens ?? undefined);
  } catch (error) {
    return errorJson(error);
  }
}
