import { NextRequest } from "next/server";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const lens = request.nextUrl.searchParams.get("lens") as TodayLens | null;
    return await bootstrapJson(lens ?? undefined);
  } catch (error) {
    return errorJson(error);
  }
}
