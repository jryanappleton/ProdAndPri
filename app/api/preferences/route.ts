import { NextRequest } from "next/server";
import { updatePreferences } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";
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
    const preferences = await updatePreferences(body.key, body.value);
    return dataJson({ preferences });
  } catch (error) {
    return errorJson(error);
  }
}
