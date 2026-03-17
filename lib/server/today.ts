import { AppState, TodayLens, TodayPlan } from "@/lib/types";
import { generateTodayPlan as generateFallbackPlan } from "@/lib/today";
import { generateTodayBriefing } from "@/lib/server/ai";

export async function generateTodayPlan(
  state: AppState,
  lens: TodayLens
): Promise<TodayPlan> {
  const fallback = generateFallbackPlan(state, lens);
  const tasks = fallback.items
    .map((item) => ({
      task: state.tasks.find((task) => task.id === item.taskId),
      reason: item.reason
    }))
    .filter((entry) => entry.task);

  const briefing = await generateTodayBriefing({
    lens,
    feedback: state.todayFeedback
      .filter((entry) => entry.lens === lens)
      .map((entry) => entry.body),
    fallback: fallback.briefing,
    tasks: tasks.map((entry) => ({
      title: entry.task!.title,
      reason: entry.reason,
      area: state.areas.find((area) => area.id === entry.task!.areaId)?.name ?? "Inbox",
      list: state.lists.find((list) => list.id === entry.task!.listId)?.name ?? "No list"
    }))
  });

  return {
    ...fallback,
    briefing
  };
}
