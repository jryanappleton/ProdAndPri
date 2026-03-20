import {
  AppState,
  Task,
  TodayFeedbackMessage,
  TodayLens,
  TodayPlan,
  TodayPlanItem
} from "@/lib/types";

function hasTag(task: Task, tagId: string) {
  return task.tagIds.includes(tagId);
}

function daysSince(date: string | null) {
  if (!date) return 999;
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function scoreTask(task: Task, lens: TodayLens, state: AppState) {
  let score = 30;

  if (task.status === "done") return -1000;
  if (task.deferUntil) return -500;

  if (task.dueDate) score += 20;
  if (task.recurrenceLabel) score += 8;
  if (task.status === "waiting_on") score += 14;
  if (task.waitingSince) score += Math.min(15, daysSince(task.waitingSince) * 2);
  score += Math.min(16, daysSince(task.lastWorkedAt) * 1.5);
  if (hasTag(task, "tag-quick")) score += 10;
  if (hasTag(task, "tag-deep")) score += 7;
  if (hasTag(task, "tag-strategic")) score += 10;
  if (hasTag(task, "tag-revenue")) score += 9;

  switch (lens) {
    case "revenue":
      if (hasTag(task, "tag-revenue")) score += 18;
      break;
    case "unblock":
      if (task.status === "waiting_on") score += 18;
      if (daysSince(task.lastWorkedAt) > 5) score += 12;
      break;
    case "strategic":
      if (hasTag(task, "tag-strategic")) score += 20;
      if (hasTag(task, "tag-deep")) score += 10;
      if (hasTag(task, "tag-quick")) score -= 4;
      break;
    case "admin":
      if (task.areaId === "area-pa") score += 16;
      if (hasTag(task, "tag-quick")) score += 8;
      break;
    default:
      score += Math.round(state.preferences.quickWinsPreference / 15);
      score += Math.round(state.preferences.deepWorkPreference / 20);
  }

  if (state.dismissedToday.includes(task.id)) score -= 100;

  return score;
}

function reasonForTask(task: Task, lens: TodayLens) {
  if (task.status === "waiting_on") return "Needs follow-up to keep momentum.";
  if (task.dueDate) return "Time-sensitive and likely to matter today.";
  if (task.recurrenceLabel) return "Recurring responsibility due for attention.";
  if (lens === "strategic") return "High-leverage work that can move the bigger picture.";
  if (lens === "revenue") return "Likely to influence near-term revenue or demand.";
  if (task.tagIds.includes("tag-quick")) return "A quick win that clears useful surface area.";
  return "Worth moving now before it stalls further.";
}

function briefingForLens(
  lens: TodayLens,
  tasks: Task[],
  feedback: TodayFeedbackMessage[]
) {
  const openCount = tasks.filter((task) => task.status === "open").length;
  const waitingCount = tasks.filter((task) => task.status === "waiting_on").length;
  const feedbackText = feedback.at(-1)?.body;

  const summaries: Record<TodayLens, string> = {
    balanced: `Today balances leverage with enough quick movement to keep momentum. You have ${openCount} open tasks and ${waitingCount} active follow-ups in play.`,
    revenue: "Today's emphasis is revenue and demand-moving work across the portfolio.",
    unblock: "Today's emphasis is clearing stuck work and nudging blocked items forward.",
    strategic: "Today's emphasis is long-term leverage and meaningful deeper work.",
    admin: "Today's emphasis is cleanup and operational clarity."
  };

  return feedbackText ? `${summaries[lens]} Context noted: "${feedbackText}"` : summaries[lens];
}

export function generateTodayPlan(state: AppState, lens: TodayLens): TodayPlan {
  const eligible = state.tasks
    .filter((task) => task.status !== "done" && !task.isInbox)
    .map((task) => ({
      task,
      score: scoreTask(task, lens, state)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 9);

  const items: TodayPlanItem[] = eligible.map(({ task, score }, index) => {
    const groupKey: TodayPlanItem["groupKey"] =
      task.status === "waiting_on"
        ? "waiting_follow_up"
        : hasTag(task, "tag-quick") && index > 1
          ? "quick_wins"
          : "highest_leverage";

    return {
      taskId: task.id,
      groupKey,
      reason: reasonForTask(task, lens),
      score,
      scoreBreakdown: {
        weightedSignals: {},
        deterministicModifiers: {},
        confidenceMultiplier: 1
      },
      analysisGeneratedAt: null,
      analysisSource: null
    };
  });

  return {
    lens,
    briefing: briefingForLens(
      lens,
      state.tasks,
      state.todayFeedback.filter((feedback) => feedback.lens === lens)
    ),
    items
  };
}
