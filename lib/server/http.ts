import { NextResponse } from "next/server";
import { getBootstrapPayload } from "@/lib/server/app-state";
import { TodayLens } from "@/lib/types";

export async function bootstrapJson(
  options?:
    | TodayLens
    | {
        lens?: TodayLens;
        refreshToday?: boolean;
      }
) {
  return NextResponse.json(
    await getBootstrapPayload(
      typeof options === "string" ? { lens: options } : options
    )
  );
}

export function dataJson<T>(data: T) {
  return NextResponse.json(data);
}

export function errorJson(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  return NextResponse.json({ error: message }, { status: 500 });
}
