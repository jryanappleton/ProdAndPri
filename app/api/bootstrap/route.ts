import { NextRequest } from "next/server";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const lens = request.nextUrl.searchParams.get("lens") as TodayLens | null;
    const refreshToday = request.nextUrl.searchParams.get("refreshToday") === "1";
    return await bootstrapJson({
      lens: lens ?? undefined,
      refreshToday
    });
  } catch (error) {
    return errorJson(error);
  }
}
