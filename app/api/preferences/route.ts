import { NextRequest } from "next/server";
import { updatePreferences } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      key:
        | "defaultLens"
        | "quickWinsPreference"
        | "deepWorkPreference"
        | "revenueWeight"
        | "unblockWeight"
        | "strategicWeight"
        | "adminWeight";
      value: number | TodayLens;
      lens?: TodayLens;
    };
    await updatePreferences(body.key, body.value);
    return await bootstrapJson(body.lens);
  } catch (error) {
    return errorJson(error);
  }
}
