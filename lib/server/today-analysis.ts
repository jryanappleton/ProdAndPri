import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { TodayTaskAnalysis } from "@/lib/types";

export const TODAY_ANALYSIS_VERSION = 1;

const MAX_REASON_LENGTH = 240;

function clampText(value: unknown, maxLength: number, fallback: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

function clampScore(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

const todayDimensionsSchema = z.object({
  revenue: z.number().int().min(0).max(100),
  unblock: z.number().int().min(0).max(100),
  strategic: z.number().int().min(0).max(100),
  admin: z.number().int().min(0).max(100),
  quick_win: z.number().int().min(0).max(100),
  deep_work: z.number().int().min(0).max(100),
  urgency: z.number().int().min(0).max(100),
  complexity: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100)
});

const todayRationaleSchema = z.object({
  revenue: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  unblock: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  strategic: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  admin: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  quick_win: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  deep_work: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  urgency: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  complexity: z.string().trim().min(1).max(MAX_REASON_LENGTH)
});

const todayAnalysisOutputSchema = z.object({
  summary: z.string().trim().min(1).max(240),
  dimensions: todayDimensionsSchema,
  rationale: todayRationaleSchema
});

export interface TodayTaskAnalysisMeta {
  source: "ai" | "fallback";
  version: number;
  generatedForTaskUpdatedAt: string | null;
}

export type TaskForTodayAnalysis = Prisma.TaskGetPayload<{
  include: {
    subtasks: true;
    comments: true;
    activities: true;
    aiState: true;
    taskTags: {
      include: {
        tag: true;
      };
    };
    area: true;
    list: true;
    githubIssueLink: {
      include: {
        repository: true;
      };
    };
  };
}>;

function textIncludesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function scoreFromBooleans(...checks: Array<[boolean, number]>) {
  return Math.max(
    0,
    Math.min(
      100,
      checks.reduce((total, [condition, weight]) => total + (condition ? weight : 0), 0)
    )
  );
}

function daysSince(value: Date | null | undefined) {
  if (!value) {
    return 999;
  }

  const diff = Date.now() - value.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function buildFallbackTodayAnalysisFromSnapshot(task: {
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  waitingReason: string | null;
  recurrenceLabel: string | null;
  lastWorkedAt: string | null;
  githubLink: { title: string } | null;
  tags: string[];
  area: string | null;
  list: string | null;
  comments: string[];
  subtasks: Array<{ title: string; isDone: boolean }>;
}) {
  const text = [
    task.title,
    task.description ?? "",
    task.waitingReason ?? "",
    task.area ?? "",
    task.list ?? "",
    ...task.comments,
    ...task.subtasks.map((entry) => entry.title),
    ...task.tags
  ]
    .join(" ")
    .toLowerCase();

  const revenue = scoreFromBooleans(
    [textIncludesAny(text, ["revenue", "sales", "occupancy", "pricing", "marketing", "newsletter", "partner", "customer", "booking", "demand"]), 70],
    [Boolean(task.dueDate), 10],
    [Boolean(task.githubLink), 5]
  );

  const unblock = scoreFromBooleans(
    [task.status === "waiting_on", 60],
    [Boolean(task.waitingReason), 20],
    [textIncludesAny(text, ["blocked", "waiting", "follow up", "dependency", "quote", "approval"]), 20]
  );

  const strategic = scoreFromBooleans(
    [textIncludesAny(text, ["strategy", "roadmap", "positioning", "plan", "system", "architecture", "policy", "narrative"]), 65],
    [daysSince(task.lastWorkedAt ? new Date(task.lastWorkedAt) : null) > 7, 10],
    [task.subtasks.length >= 3, 10]
  );

  const admin = scoreFromBooleans(
    [textIncludesAny(text, ["tax", "account", "reconcile", "admin", "bookkeeping", "filing", "invoice", "expense", "paperwork"]), 75],
    [Boolean(task.recurrenceLabel), 10]
  );

  const quickWin = scoreFromBooleans(
    [textIncludesAny(text, ["email", "call", "follow up", "review", "post", "ship", "fix", "reply"]), 40],
    [task.subtasks.filter((entry) => !entry.isDone).length <= 1, 20],
    [((task.description ?? "").length || task.title.length) < 140, 15]
  );

  const deepWork = scoreFromBooleans(
    [task.subtasks.length >= 3, 25],
    [textIncludesAny(text, ["plan", "design", "strategy", "architecture", "narrative", "workflow"]), 40],
    [((task.description ?? "").length || 0) > 200, 15]
  );

  const urgency = Math.max(
    0,
    Math.min(
      100,
      (task.dueDate ? Math.max(10, 70 - daysSince(new Date(task.dueDate)) * 8) : 0) +
        (task.status === "waiting_on" ? 15 : 0) +
        (task.recurrenceLabel ? 10 : 0)
    )
  );

  const complexity = Math.max(
    0,
    Math.min(
      100,
        task.subtasks.length * 10 +
        Math.min(30, Math.round(((task.description ?? "").length || 0) / 25)) +
        (task.githubLink ? 10 : 0)
    )
  );

  const confidence = scoreFromBooleans(
    [Boolean(task.description?.trim()), 35],
    [task.comments.length > 0, 15],
    [task.subtasks.length > 0, 15],
    [Boolean(task.area), 10],
    [Boolean(task.list), 10]
  );

  return todayAnalysisOutputSchema.parse({
    summary: clampText(
      task.status === "waiting_on"
        ? "This task is mostly about moving a blocked dependency forward."
        : "This task has enough structure to rank using task facts and recent history.",
      240,
      "This task has enough structure to rank using task facts and recent history."
    ),
    dimensions: {
      revenue,
      unblock,
      strategic,
      admin,
      quick_win: quickWin,
      deep_work: deepWork,
      urgency,
      complexity,
      confidence
    },
    rationale: {
      revenue: revenue
        ? "The task language suggests a direct link to demand, customers, pricing, or growth."
        : "The task does not strongly indicate near-term revenue impact.",
      unblock: unblock
        ? "The task appears tied to an external dependency, follow-up, or blocked handoff."
        : "The task is not primarily blocked by an external dependency.",
      strategic: strategic
        ? "The task looks like higher-leverage planning, system design, or longer-horizon work."
        : "The task looks more tactical than strategic.",
      admin: admin
        ? "The task reads like operational or administrative maintenance."
        : "The task does not look primarily administrative.",
      quick_win: quickWin
        ? "The task appears small enough to produce progress quickly."
        : "The task likely needs more than a quick pass.",
      deep_work: deepWork
        ? "The task likely benefits from focused concentration and a longer block."
        : "The task does not strongly require deep-focus time.",
      urgency: urgency
        ? "Due dates, waiting state, or recurrence make this more time-sensitive."
        : "There is limited evidence that this task is time-sensitive right now.",
      complexity: complexity
        ? "The task appears multi-step or context-heavy."
        : "The task appears relatively straightforward."
    }
  });
}

function buildFallbackTodayAnalysis(task: TaskForTodayAnalysis) {
  return buildFallbackTodayAnalysisFromSnapshot({
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    dueDate: task.dueDate?.toISOString() ?? null,
    waitingReason: task.waitingReason,
    recurrenceLabel: task.recurrenceLabel,
    lastWorkedAt: task.lastWorkedAt?.toISOString() ?? null,
    githubLink: task.githubIssueLink
      ? {
          title: task.githubIssueLink.githubTitle
        }
      : null,
    tags: task.taskTags.map((entry) => entry.tag.name),
    area: task.area?.name ?? null,
    list: task.list?.name ?? null,
    comments: task.comments.map((entry) => entry.body),
    subtasks: task.subtasks.map((entry) => ({
      title: entry.title,
      isDone: entry.isDone
    }))
  });
}

export function parseTodayTaskAnalysisMeta(
  raw: string | null | undefined
): TodayTaskAnalysisMeta | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TodayTaskAnalysisMeta>;
    return {
      source: parsed.source === "fallback" ? "fallback" : "ai",
      version:
        typeof parsed.version === "number" && Number.isFinite(parsed.version)
          ? parsed.version
          : TODAY_ANALYSIS_VERSION,
      generatedForTaskUpdatedAt:
        typeof parsed.generatedForTaskUpdatedAt === "string"
          ? parsed.generatedForTaskUpdatedAt
          : null
    };
  } catch {
    return null;
  }
}

export function serializeTodayTaskAnalysisMeta(meta: TodayTaskAnalysisMeta) {
  return JSON.stringify(meta);
}

export function parseStoredTodayTaskAnalysis(
  raw: string | null | undefined,
  analyzedAt: Date | null | undefined,
  metaRaw: string | null | undefined
): TodayTaskAnalysis | null {
  if (!raw || !analyzedAt) {
    return null;
  }

  try {
    const parsed = todayAnalysisOutputSchema.parse(JSON.parse(raw));
    const meta = parseTodayTaskAnalysisMeta(metaRaw);
    return {
      summary: parsed.summary,
      dimensions: parsed.dimensions,
      rationale: parsed.rationale,
      analyzedAt: analyzedAt.toISOString(),
      source: meta?.source ?? "ai",
      version: meta?.version ?? TODAY_ANALYSIS_VERSION
    };
  } catch {
    return null;
  }
}

export function serializeStoredTodayTaskAnalysis(analysis: TodayTaskAnalysis) {
  return JSON.stringify({
    summary: analysis.summary,
    dimensions: analysis.dimensions,
    rationale: analysis.rationale
  });
}

export function getTodayAnalysisInput(task: TaskForTodayAnalysis) {
  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      area: task.area?.name ?? null,
      list: task.list?.name ?? null,
      tags: task.taskTags.map((entry) => entry.tag.name),
      dueDate: task.dueDate?.toISOString() ?? null,
      deferUntil: task.deferUntil?.toISOString() ?? null,
      waitingReason: task.waitingReason,
      waitingSince: task.waitingSince?.toISOString() ?? null,
      recurrenceLabel: task.recurrenceLabel,
      lastWorkedAt: task.lastWorkedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      githubLink: task.githubIssueLink
        ? {
            repository: `${task.githubIssueLink.repository.owner}/${task.githubIssueLink.repository.repo}`,
            title: task.githubIssueLink.githubTitle,
            state: task.githubIssueLink.githubState,
            updatedAt: task.githubIssueLink.githubUpdatedAt?.toISOString() ?? null
          }
        : null
    },
    subtasks: task.subtasks.map((entry) => ({
      id: randomUUID(),
      title: entry.title,
      isDone: entry.isDone
    })),
    comments: task.comments.map((entry) => ({
      createdAt: entry.createdAt.toISOString(),
      body: clampText(entry.body, 500, "")
    })),
    activity: task.activities.map((entry) => ({
      createdAt: entry.createdAt.toISOString(),
      eventType: entry.eventType,
      payload: clampText(entry.payload, 300, "")
    }))
  };
}

export function validateAiTodayAnalysisOutput(raw: string) {
  const parsed = JSON.parse(raw) as {
    summary?: unknown;
    dimensions?: Record<string, unknown>;
    rationale?: Record<string, unknown>;
  };

  return todayAnalysisOutputSchema.parse({
    summary: clampText(
      parsed.summary,
      240,
      "This task can be ranked using its current context and execution signals."
    ),
    dimensions: {
      revenue: clampScore(parsed.dimensions?.revenue),
      unblock: clampScore(parsed.dimensions?.unblock),
      strategic: clampScore(parsed.dimensions?.strategic),
      admin: clampScore(parsed.dimensions?.admin),
      quick_win: clampScore(parsed.dimensions?.quick_win),
      deep_work: clampScore(parsed.dimensions?.deep_work),
      urgency: clampScore(parsed.dimensions?.urgency),
      complexity: clampScore(parsed.dimensions?.complexity),
      confidence: clampScore(parsed.dimensions?.confidence)
    },
    rationale: {
      revenue: clampText(
        parsed.rationale?.revenue,
        MAX_REASON_LENGTH,
        "Revenue impact is not strongly signaled from the current task data."
      ),
      unblock: clampText(
        parsed.rationale?.unblock,
        MAX_REASON_LENGTH,
        "Blocked-work signals are limited in the current task data."
      ),
      strategic: clampText(
        parsed.rationale?.strategic,
        MAX_REASON_LENGTH,
        "Strategic leverage is not strongly signaled from the current task data."
      ),
      admin: clampText(
        parsed.rationale?.admin,
        MAX_REASON_LENGTH,
        "Administrative load is not strongly signaled from the current task data."
      ),
      quick_win: clampText(
        parsed.rationale?.quick_win,
        MAX_REASON_LENGTH,
        "Quick-win potential is unclear from the current task data."
      ),
      deep_work: clampText(
        parsed.rationale?.deep_work,
        MAX_REASON_LENGTH,
        "Deep-work demand is unclear from the current task data."
      ),
      urgency: clampText(
        parsed.rationale?.urgency,
        MAX_REASON_LENGTH,
        "Urgency is not strongly signaled from the current task data."
      ),
      complexity: clampText(
        parsed.rationale?.complexity,
        MAX_REASON_LENGTH,
        "Complexity is not strongly signaled from the current task data."
      )
    }
  });
}

export function getLatestTodayRelevantAt(task: TaskForTodayAnalysis) {
  const timestamps = [
    task.updatedAt.getTime(),
    ...task.subtasks.map((entry) => entry.updatedAt.getTime()),
    ...task.comments.map((entry) => entry.createdAt.getTime()),
    ...task.activities.map((entry) => entry.createdAt.getTime()),
    task.githubIssueLink?.githubUpdatedAt?.getTime() ?? 0
  ].filter(Boolean);

  return new Date(Math.max(...timestamps));
}

export function isTodayAnalysisStale(task: TaskForTodayAnalysis) {
  const meta = parseTodayTaskAnalysisMeta(task.aiState?.todayMeta);
  if (!task.aiState?.todayClassification || !task.aiState?.todayAnalyzedAt) {
    return true;
  }

  if (!meta || meta.version !== TODAY_ANALYSIS_VERSION) {
    return true;
  }

  return getLatestTodayRelevantAt(task) > task.aiState.todayAnalyzedAt;
}

export function buildFallbackStoredTodayAnalysis(task: TaskForTodayAnalysis): TodayTaskAnalysis {
  const result = buildFallbackTodayAnalysis(task);

  return {
    summary: result.summary,
    dimensions: result.dimensions,
    rationale: result.rationale,
    analyzedAt: new Date().toISOString(),
    source: "fallback",
    version: TODAY_ANALYSIS_VERSION
  };
}

export function buildFallbackStoredTodayAnalysisFromInput(input: {
  task: {
    title: string;
    description: string;
    status: string;
    area: string | null;
    list: string | null;
    tags: string[];
    dueDate: string | null;
    waitingReason: string | null;
    recurrenceLabel: string | null;
    lastWorkedAt: string | null;
    githubLink: { title: string } | null;
  };
  comments: Array<{ body: string }>;
  subtasks: Array<{ title: string; isDone: boolean }>;
}): TodayTaskAnalysis {
  const result = buildFallbackTodayAnalysisFromSnapshot({
    title: input.task.title,
    description: input.task.description,
    status: input.task.status,
    dueDate: input.task.dueDate,
    waitingReason: input.task.waitingReason,
    recurrenceLabel: input.task.recurrenceLabel,
    lastWorkedAt: input.task.lastWorkedAt,
    githubLink: input.task.githubLink,
    tags: input.task.tags,
    area: input.task.area,
    list: input.task.list,
    comments: input.comments.map((entry) => entry.body),
    subtasks: input.subtasks
  });

  return {
    summary: result.summary,
    dimensions: result.dimensions,
    rationale: result.rationale,
    analyzedAt: new Date().toISOString(),
    source: "fallback",
    version: TODAY_ANALYSIS_VERSION
  };
}
