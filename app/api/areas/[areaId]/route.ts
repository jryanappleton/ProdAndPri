import { NextRequest } from "next/server";
import { deleteArea } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ areaId: string }> }
) {
  try {
    const { areaId } = await context.params;
    const lens = request.nextUrl.searchParams.get("lens") as TodayLens | null;
    await deleteArea(areaId);
    return await bootstrapJson(lens ?? undefined);
  } catch (error) {
    return errorJson(error);
  }
}
