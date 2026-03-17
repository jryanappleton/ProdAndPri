import { NextRequest } from "next/server";
import { addTodayFeedback, dismissTaskFromToday } from "@/lib/server/app-state";
import { bootstrapJson, errorJson } from "@/lib/server/http";
import { TodayLens } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as
      | {
          action: "feedback";
          body: string;
          lens: TodayLens;
        }
      | {
          action: "dismiss";
          taskId: string;
          lens: TodayLens;
        };

    if (body.action === "feedback") {
      await addTodayFeedback(body.lens, body.body);
    } else {
      await dismissTaskFromToday(body.taskId, body.lens);
    }

    return await bootstrapJson(body.lens);
  } catch (error) {
    return errorJson(error);
  }
}
