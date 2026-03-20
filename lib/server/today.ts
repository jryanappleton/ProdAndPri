import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateTodayBriefing, generateTodayTaskAnalysis } from "@/lib/server/ai";
import {
  getTodayAnalysisInput,
  isTodayAnalysisStale,
  parseStoredTodayTaskAnalysis,
  serializeStoredTodayTaskAnalysis,
  serializeTodayTaskAnalysisMeta,
  TaskForTodayAnalysis
} from "@/lib/server/today-analysis";
import { AppState, Task, TodayLens, TodayPlan, TodayPlanItem } from "@/lib/types";

const TODAY_CANDIDATE_LIMIT = 12;
const TODAY_ITEM_LIMIT = 9;
const EXCLUDE_FROM_TODAY_TAG = "lowpri - exclude from today";

const todayTaskInclude = {
  subtasks: {
    orderBy: {
      position: "asc" as const
    }
  },
  comments: {
    orderBy: {
      createdAt: "desc" as const
    }
  },
  activities: {
    orderBy: {
      createdAt: "desc" as const
    }
  },
  aiState: true,
  area: true,
  list: true,
  taskTags: {
    include: {
      tag: true
    }
  },
  githubIssueLink: {
    include: {
      repository: true
    }
  }
} satisfies Prisma.TaskInclude;

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function daysSince(value: string | Date | null) {
  if (!value) return 999;
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function isDeferred(task: Task) {
  return Boolean(task.deferUntil && new Date(task.deferUntil).getTime() > Date.now());
}

function isExcludedFromToday(task: Task, state: AppState) {
  const tagNames = task.tagIds
    .map((tagId) => state.tags.find((tag) => tag.id === tagId)?.name?.trim().toLowerCase())
    .filter(Boolean);

  return tagNames.includes(EXCLUDE_FROM_TODAY_TAG);
}

function prefilterScore(task: Task) {
  let score = 10;

  if (task.dueDate) {
    score += Math.max(10, 45 - daysSince(task.dueDate) * 6);
  }

  if (task.status === "waiting_on") {
    score += 25;
  }

  if (task.waitingSince) {
    score += Math.min(20, daysSince(task.waitingSince) * 2);
  }

  if (task.recurrenceLabel) {
    score += 8;
  }

  score += Math.min(18, daysSince(task.lastWorkedAt) * 1.5);

  if (task.githubLink) {
    score += 4;
  }

  if (task.description.trim()) {
    score += 3;
  }

  return score;
}

function getLensWeights(state: AppState, lens: TodayLens) {
  const preferences = state.preferences;

  const profiles: Record<TodayLens, Record<string, number>> = {
    balanced: {
      revenue: preferences.revenueWeight * 0.6,
      unblock: preferences.unblockWeight * 0.8,
      strategic: preferences.strategicWeight * 0.7,
      admin: preferences.adminWeight * 0.45,
      quick_win: preferences.quickWinsPreference * 0.8,
      deep_work: preferences.deepWorkPreference * 0.8,
      urgency: 70,
      complexity: preferences.deepWorkPreference * 0.35
    },
    revenue: {
      revenue: preferences.revenueWeight * 1.4,
      unblock: preferences.unblockWeight * 0.35,
      strategic: preferences.strategicWeight * 0.4,
      admin: preferences.adminWeight * 0.15,
      quick_win: preferences.quickWinsPreference * 0.3,
      deep_work: preferences.deepWorkPreference * 0.35,
      urgency: 65,
      complexity: 20
    },
    unblock: {
      revenue: preferences.revenueWeight * 0.25,
      unblock: preferences.unblockWeight * 1.4,
      strategic: preferences.strategicWeight * 0.25,
      admin: preferences.adminWeight * 0.25,
      quick_win: 55,
      deep_work: preferences.deepWorkPreference * 0.2,
      urgency: 70,
      complexity: 20
    },
    strategic: {
      revenue: preferences.revenueWeight * 0.35,
      unblock: preferences.unblockWeight * 0.25,
      strategic: preferences.strategicWeight * 1.4,
      admin: preferences.adminWeight * 0.1,
      quick_win: preferences.quickWinsPreference * 0.15,
      deep_work: preferences.deepWorkPreference * 1.1,
      urgency: 55,
      complexity: 60
    },
    admin: {
      revenue: preferences.revenueWeight * 0.1,
      unblock: preferences.unblockWeight * 0.35,
      strategic: preferences.strategicWeight * 0.1,
      admin: preferences.adminWeight * 1.4,
      quick_win: preferences.quickWinsPreference * 0.8,
      deep_work: preferences.deepWorkPreference * 0.15,
      urgency: 60,
      complexity: 20
    }
  };

  return profiles[lens];
}

function deterministicModifiers(task: Task) {
  const due =
    task.dueDate ? Math.max(0, Math.min(18, 18 - daysSince(task.dueDate) * 2)) : 0;
  const waiting =
    task.status === "waiting_on"
      ? 10 + Math.min(12, task.waitingSince ? daysSince(task.waitingSince) * 1.5 : 0)
      : 0;
  const staleWork = Math.min(10, daysSince(task.lastWorkedAt) * 0.8);
  const recurrence = task.recurrenceLabel ? 6 : 0;

  return {
    due: round(due),
    waiting: round(waiting),
    stale_work: round(staleWork),
    recurrence: round(recurrence)
  };
}

function buildPlanReason(
  task: Task,
  item: {
    scoreBreakdown: TodayPlanItem["scoreBreakdown"];
    analysis: NonNullable<Task["todayAnalysis"]>;
  }
) {
  const weightedEntries = Object.entries(item.scoreBreakdown.weightedSignals)
    .sort((left, right) => right[1] - left[1])
    .filter((entry) => entry[1] > 0)
    .slice(0, 2)
    .map(([key]) => {
      const rationale = item.analysis.rationale[key as keyof typeof item.analysis.rationale];
      return rationale;
    });

  const modifierEntries = Object.entries(item.scoreBreakdown.deterministicModifiers)
    .sort((left, right) => right[1] - left[1])
    .find((entry) => entry[1] >= 4);

  const modifierReason = modifierEntries
    ? modifierEntries[0] === "due"
      ? "A near-term due date adds pressure."
      : modifierEntries[0] === "waiting"
        ? "The task is blocked and waiting on follow-through."
        : modifierEntries[0] === "stale_work"
          ? "It has been idle long enough to risk stalling."
          : "Recurrence makes it worth touching today."
    : null;

  const pieces = [...weightedEntries];
  if (modifierReason) {
    pieces.push(modifierReason);
  }

  if (!pieces.length) {
    return task.status === "waiting_on"
      ? "This task is blocked and should be actively followed up."
      : "This task scored well across current planning signals.";
  }

  return pieces.slice(0, 2).join(" ");
}

async function refreshTodayAnalysis(task: TaskForTodayAnalysis) {
  const input = getTodayAnalysisInput(task);
  const analysis = await generateTodayTaskAnalysis(input);

  return prisma.task.update({
    where: {
      id: task.id
    },
    data: {
      aiState: {
        upsert: {
          create: {
            todayClassification: serializeStoredTodayTaskAnalysis(analysis),
            todayMeta: serializeTodayTaskAnalysisMeta({
              source: analysis.source,
              version: analysis.version,
              generatedForTaskUpdatedAt: task.updatedAt.toISOString()
            }),
            todayAnalyzedAt: new Date(analysis.analyzedAt)
          },
          update: {
            todayClassification: serializeStoredTodayTaskAnalysis(analysis),
            todayMeta: serializeTodayTaskAnalysisMeta({
              source: analysis.source,
              version: analysis.version,
              generatedForTaskUpdatedAt: task.updatedAt.toISOString()
            }),
            todayAnalyzedAt: new Date(analysis.analyzedAt)
          }
        }
      }
    },
    include: todayTaskInclude
  });
}

function scoreCandidate(task: Task, state: AppState, lens: TodayLens) {
  const analysis = task.todayAnalysis;
  if (!analysis) {
    return null;
  }

  const weights = getLensWeights(state, lens);
  const weightedSignals = Object.fromEntries(
    Object.entries(weights).map(([key, weight]) => [
      key,
      round((analysis.dimensions[key as keyof typeof analysis.dimensions] * weight) / 100)
    ])
  );
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const baseScore =
    totalWeight === 0
      ? 0
      : (Object.entries(weights).reduce(
          (sum, [key, weight]) =>
            sum + analysis.dimensions[key as keyof typeof analysis.dimensions] * weight,
          0
        ) /
          totalWeight);
  const confidenceMultiplier = round(0.75 + analysis.dimensions.confidence / 400);
  const deterministic = deterministicModifiers(task);
  const score = round(
    baseScore * confidenceMultiplier +
      Object.values(deterministic).reduce((sum, value) => sum + value, 0)
  );

  return {
    score,
    analysis,
    scoreBreakdown: {
      weightedSignals,
      deterministicModifiers: deterministic,
      confidenceMultiplier
    }
  };
}

function groupForItem(
  task: Task,
  analysis: NonNullable<Task["todayAnalysis"]>,
  index: number
): TodayPlanItem["groupKey"] {
  if (task.status === "waiting_on" || analysis.dimensions.unblock >= 75) {
    return "waiting_follow_up";
  }

  if (
    analysis.dimensions.quick_win >= 65 &&
    analysis.dimensions.quick_win > analysis.dimensions.deep_work &&
    index > 1
  ) {
    return "quick_wins";
  }

  return "highest_leverage";
}

function fallbackBriefing(items: TodayPlanItem[], state: AppState, lens: TodayLens) {
  const openCount = state.tasks.filter((task) => task.status === "open").length;
  const waitingCount = state.tasks.filter((task) => task.status === "waiting_on").length;
  const leadTitles = items
    .slice(0, 3)
    .map((item) => state.tasks.find((task) => task.id === item.taskId)?.title)
    .filter(Boolean)
    .join(", ");

  const prefix: Record<TodayLens, string> = {
    balanced: `Today balances momentum across ${openCount} open tasks and ${waitingCount} follow-ups.`,
    revenue: "Today prioritizes the work most likely to move demand or near-term revenue.",
    unblock: "Today focuses on clearing dependencies and pushing stalled work forward.",
    strategic: "Today favors higher-leverage work that benefits from deeper focus.",
    admin: "Today emphasizes operational cleanup and maintenance work."
  };

  return leadTitles ? `${prefix[lens]} Focus first on ${leadTitles}.` : prefix[lens];
}

export async function generateTodayPlan(
  workspaceId: string,
  state: AppState,
  lens: TodayLens
): Promise<TodayPlan> {
  const candidates = state.tasks
    .filter(
      (task) =>
        task.status !== "done" &&
        !task.isInbox &&
        !isDeferred(task) &&
        !isExcludedFromToday(task, state)
    )
    .sort((left, right) => prefilterScore(right) - prefilterScore(left))
    .slice(0, TODAY_CANDIDATE_LIMIT);

  const candidateIds = candidates.map((task) => task.id);
  const records = candidateIds.length
    ? await prisma.task.findMany({
        where: {
          workspaceId,
          id: {
            in: candidateIds
          }
        },
        include: todayTaskInclude
      })
    : [];

  const recordById = new Map(records.map((record) => [record.id, record]));
  const orderedRecords = candidateIds
    .map((id) => recordById.get(id))
    .filter(Boolean) as TaskForTodayAnalysis[];

  const refreshedRecords = await Promise.all(
    orderedRecords.map((record) =>
      isTodayAnalysisStale(record) ? refreshTodayAnalysis(record) : Promise.resolve(record)
    )
  );

  const analysisById = new Map(
    refreshedRecords.map((record) => [
      record.id,
      parseStoredTodayTaskAnalysis(
        record.aiState?.todayClassification,
        record.aiState?.todayAnalyzedAt,
        record.aiState?.todayMeta
      )
    ])
  );

  state.tasks = state.tasks.map((task) => ({
    ...task,
    todayAnalysis: analysisById.get(task.id) ?? task.todayAnalysis
  }));

  const scored = candidates
    .filter((task) => !state.dismissedToday.includes(task.id))
    .map((task) => ({
      task: {
        ...task,
        todayAnalysis: analysisById.get(task.id) ?? null
      },
      result: scoreCandidate(
        {
          ...task,
          todayAnalysis: analysisById.get(task.id) ?? null
        },
        state,
        lens
      )
    }))
    .filter(
      (entry): entry is {
        task: Task & { todayAnalysis: NonNullable<Task["todayAnalysis"]> };
        result: NonNullable<ReturnType<typeof scoreCandidate>>;
      } => Boolean(entry.result && entry.task.todayAnalysis)
    )
    .sort((left, right) => right.result.score - left.result.score)
    .slice(0, TODAY_ITEM_LIMIT);

  const items: TodayPlanItem[] = scored.map(({ task, result }, index) => ({
    taskId: task.id,
    groupKey: groupForItem(task, task.todayAnalysis, index),
    reason: buildPlanReason(task, {
      analysis: task.todayAnalysis,
      scoreBreakdown: result.scoreBreakdown
    }),
    score: result.score,
    scoreBreakdown: result.scoreBreakdown,
    analysisGeneratedAt: task.todayAnalysis.analyzedAt,
    analysisSource: task.todayAnalysis.source
  }));

  const briefing = await generateTodayBriefing({
    lens,
    feedback: state.todayFeedback
      .filter((entry) => entry.lens === lens)
      .map((entry) => entry.body),
    fallback: fallbackBriefing(items, state, lens),
    tasks: items.map((item) => {
      const task = state.tasks.find((entry) => entry.id === item.taskId);
      return {
        title: task?.title ?? "Unknown task",
        reason: item.reason,
        area: state.areas.find((area) => area.id === task?.areaId)?.name ?? "Inbox",
        list: state.lists.find((list) => list.id === task?.listId)?.name ?? "No list"
      };
    })
  });

  return {
    lens,
    briefing,
    items
  };
}
