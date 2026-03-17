import { NextRequest } from "next/server";
import { createList } from "@/lib/server/app-state";
import { dataJson, errorJson } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      areaId: string;
      name: string;
    };
    const list = await createList(body.areaId, body.name);
    return dataJson({ list });
  } catch (error) {
    return errorJson(error);
  }
}
