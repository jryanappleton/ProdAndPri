import { randomUUID } from "node:crypto";
import { CommentType, Prisma } from "@prisma/client";
import { z } from "zod";
import { TaskAnalysisResult } from "@/lib/types";

const MAX_HISTORY_BODY_LENGTH = 500;

function clampText(value: unknown, maxLength: number, fallback = "") {
  const trimmed = typeof value === "string" ? value.trim() : fallback;
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

const aiTaskAnalysisOutputSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  recommendedNextAction: z.string().trim().min(1).max(500).nullable().optional(),
  improvedTask: z
    .object({
      title: z.string().trim().min(1).max(500),
      description: z.string().trim().min(1).max(4000)
    })
    .nullable()
    .optional(),
  gaps: z.array(z.string().trim().min(1).max(1000)).max(8),
  blockers: z.array(z.string().trim().min(1).max(1000)).max(8),
  nextSteps: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(500),
        why: z.string().trim().min(1).max(1000),
        confidence: z.enum(["low", "medium", "high"]).default("medium")
      })
    )
    .max(5),
  suggestedNotes: z.array(z.string().trim().min(1).max(1200)).max(5).default([]),
  clarifyingQuestions: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(500),
        why: z.string().trim().min(1).max(1000)
      })
    )
    .max(5)
    .default([]),
  shouldReanalyzeAfterUserAction: z.boolean().default(true)
});

export type TaskAnalysisOutput = z.infer<typeof aiTaskAnalysisOutputSchema>;
export interface TaskAnalysisMeta {
  source: "ai" | "fallback" | null;
  message: string | null;
}

export const meaningfulActivityEventTypes = new Set([
  "task_updated",
  "status_changed",
  "task_placed",
  "task_filed",
  "subtask_toggled",
  "comment_added"
]);

function truncateBody(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (trimmed.length <= MAX_HISTORY_BODY_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_HISTORY_BODY_LENGTH - 3)}...`;
}

function isUserComment(commentType: CommentType) {
  return commentType === CommentType.note || commentType === CommentType.update;
}

function formatCommentType(commentType: CommentType) {
  if (commentType === CommentType.ai_feedback) return "ai_feedback";
  if (commentType === CommentType.update) return "update";
  if (commentType === CommentType.system_event) return "system_event";
  return "note";
}

type TaskForAnalysis = Prisma.TaskGetPayload<{
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
  };
}>;

export function parseStoredTaskAnalysis(
  raw: string | null | undefined
): TaskAnalysisResult | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as TaskAnalysisResult;
    return {
      summary: parsed.summary,
      recommendedNextAction:
        parsed.recommendedNextAction &&
        typeof parsed.recommendedNextAction.value === "string" &&
        parsed.recommendedNextAction.value.trim()
          ? {
              value: parsed.recommendedNextAction.value,
              applied: Boolean(parsed.recommendedNextAction.applied)
            }
          : null,
      improvedTask: parsed.improvedTask
        ? {
            title: parsed.improvedTask.title,
            description: parsed.improvedTask.description,
            applied: Boolean(parsed.improvedTask.applied)
          }
        : null,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
      nextSteps: Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps.map((step) => ({
            id: step.id ?? randomUUID(),
            title: step.title,
            why: step.why,
            confidence:
              step.confidence === "low" ||
              step.confidence === "medium" ||
              step.confidence === "high"
                ? step.confidence
                : "medium",
            applied: Boolean(step.applied)
          }))
        : [],
      suggestedNotes: Array.isArray(parsed.suggestedNotes)
        ? parsed.suggestedNotes.map((note) => ({
            id: note.id ?? randomUUID(),
            body: note.body,
            applied: Boolean(note.applied)
          }))
        : [],
      clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions)
        ? parsed.clarifyingQuestions.map((question) => ({
            id: question.id ?? randomUUID(),
            question: question.question,
            why: question.why
          }))
        : [],
      shouldReanalyzeAfterUserAction:
        parsed.shouldReanalyzeAfterUserAction !== false
    };
  } catch {
    return null;
  }
}

export function serializeStoredTaskAnalysis(result: TaskAnalysisResult) {
  return JSON.stringify(result);
}

export function parseTaskAnalysisMeta(
  raw: string | null | undefined
): TaskAnalysisMeta {
  if (!raw) {
    return {
      source: null,
      message: null
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TaskAnalysisMeta>;
    return {
      source: parsed.source === "ai" || parsed.source === "fallback" ? parsed.source : ("ai" as const),
      message: typeof parsed.message === "string" && parsed.message.trim() ? parsed.message : null
    };
  } catch {
    return {
      source: null,
      message: null
    };
  }
}

export function serializeTaskAnalysisMeta(meta: TaskAnalysisMeta) {
  return JSON.stringify(meta);
}

export function normalizeTaskAnalysisOutput(
  output: TaskAnalysisOutput
): TaskAnalysisResult {
  return {
    summary: output.summary,
    recommendedNextAction: output.recommendedNextAction
      ? {
          value: output.recommendedNextAction,
          applied: false
        }
      : null,
    improvedTask: output.improvedTask
      ? {
          ...output.improvedTask,
          applied: false
        }
      : null,
    gaps: output.gaps,
    blockers: output.blockers,
    nextSteps: output.nextSteps.map((step) => ({
      id: randomUUID(),
      title: step.title,
      why: step.why,
      confidence: step.confidence,
      applied: false
    })),
    suggestedNotes: output.suggestedNotes.map((body) => ({
      id: randomUUID(),
      body,
      applied: false
    })),
    clarifyingQuestions: output.clarifyingQuestions.map((question) => ({
      id: randomUUID(),
      question: question.question,
      why: question.why
    })),
    shouldReanalyzeAfterUserAction: output.shouldReanalyzeAfterUserAction
  };
}

export function buildTaskAnalysisInput(task: TaskForAnalysis) {
  const comments = [...task.comments]
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map((comment) => ({
      createdAt: comment.createdAt.toISOString(),
      type: formatCommentType(comment.commentType),
      body: truncateBody(comment.body)
    }));

  const activity = [...task.activities]
    .filter((entry) => meaningfulActivityEventTypes.has(entry.eventType))
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map((entry) => ({
      createdAt: entry.createdAt.toISOString(),
      type: entry.eventType,
      payload: truncateBody(entry.payload)
    }));

  const lastAnalyzedAt = task.aiState?.lastAnalyzedAt ?? null;
  const userCommentTimes = task.comments
    .filter((comment) => isUserComment(comment.commentType))
    .map((comment) => comment.createdAt.getTime());
  const userActivityTimes = task.activities
    .filter((entry) => meaningfulActivityEventTypes.has(entry.eventType))
    .map((entry) => entry.createdAt.getTime());
  const lastUserActivityAtMs = [...userCommentTimes, ...userActivityTimes].sort((a, b) => b - a)[0];
  const lastUserActivityAt = lastUserActivityAtMs
    ? new Date(lastUserActivityAtMs)
    : null;

  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      nextAction: task.nextAction ?? "",
      status: task.status,
      area: task.area?.name ?? null,
      list: task.list?.name ?? null,
      tags: task.taskTags.map((entry) => entry.tag.name),
      dueDate: task.dueDate?.toISOString() ?? null,
      waitingReason: task.waitingReason,
      waitingSince: task.waitingSince?.toISOString() ?? null,
      recurrenceLabel: task.recurrenceLabel,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      lastWorkedAt: task.lastWorkedAt?.toISOString() ?? null
    },
    subtasks: task.subtasks.map((subtask) => ({
      title: subtask.title,
      isDone: subtask.isDone
    })),
    comments,
    activity,
    analysisContext: {
      goal: "Make the task more actionable and execution-ready",
      userActivitySinceLastAnalysis: lastAnalyzedAt
        ? Boolean(lastUserActivityAt && lastUserActivityAt > lastAnalyzedAt)
        : true
    }
  };
}

export function computeTaskAnalysisState(task: TaskForAnalysis) {
  const latest = parseStoredTaskAnalysis(task.aiState?.clarificationSuggestion);
  const lastAnalyzedAt = task.aiState?.lastAnalyzedAt ?? null;
  const meta = parseTaskAnalysisMeta(task.aiState?.nextStepSuggestion);

  const userCommentTimes = task.comments
    .filter((comment) => isUserComment(comment.commentType))
    .map((comment) => comment.createdAt.getTime());
  const userActivityTimes = task.activities
    .filter((entry) => meaningfulActivityEventTypes.has(entry.eventType))
    .map((entry) => entry.createdAt.getTime());

  const lastUserActivityAtMs = [...userCommentTimes, ...userActivityTimes].sort((a, b) => b - a)[0];
  const lastUserActivityAt = lastUserActivityAtMs
    ? new Date(lastUserActivityAtMs)
    : null;

  if (!lastAnalyzedAt) {
    return {
      freshness: "never_analyzed" as const,
      isEligible: true,
      lastAnalyzedAt: null,
      lastUserActivityAt: lastUserActivityAt?.toISOString() ?? null,
      latest,
      lastRunSource: meta.source,
      lastRunMessage: meta.message
    };
  }

  const hasNewUserActivity = Boolean(
    lastUserActivityAt && lastUserActivityAt > lastAnalyzedAt
  );

  if (hasNewUserActivity) {
    return {
      freshness: "ready_for_refresh" as const,
      isEligible: true,
      lastAnalyzedAt: lastAnalyzedAt.toISOString(),
      lastUserActivityAt: lastUserActivityAt?.toISOString() ?? null,
      latest,
      lastRunSource: meta.source,
      lastRunMessage: meta.message
    };
  }

  return {
    freshness: latest ? ("fresh" as const) : ("waiting_for_activity" as const),
    isEligible: !latest,
    lastAnalyzedAt: lastAnalyzedAt.toISOString(),
    lastUserActivityAt: lastUserActivityAt?.toISOString() ?? null,
    latest,
    lastRunSource: meta.source,
    lastRunMessage: meta.message
  };
}

export function formatAnalysisComment(result: TaskAnalysisResult) {
  const sections = [
    `AI insight: ${result.summary}`,
    result.recommendedNextAction
      ? `Recommended next action: ${result.recommendedNextAction.value}`
      : null,
    result.gaps.length ? `Gaps: ${result.gaps.join(" | ")}` : null,
    result.blockers.length ? `Blockers: ${result.blockers.join(" | ")}` : null,
    result.nextSteps.length
      ? `Next steps: ${result.nextSteps.map((step) => step.title).join(" | ")}`
      : null,
    result.suggestedNotes.length
      ? `Suggested notes: ${result.suggestedNotes.map((note) => note.body).join(" | ")}`
      : null,
    result.clarifyingQuestions.length
      ? `Questions to answer: ${result.clarifyingQuestions.map((question) => question.question).join(" | ")}`
      : null
  ].filter(Boolean);

  return sections.join("\n");
}

export function validateAiTaskAnalysisOutput(raw: string) {
  const parsed = JSON.parse(raw) as {
    summary?: unknown;
    recommendedNextAction?: unknown;
    improvedTask?: unknown;
    gaps?: unknown;
    blockers?: unknown;
    nextSteps?: unknown;
    suggestedNotes?: unknown;
    clarifyingQuestions?: unknown;
    shouldReanalyzeAfterUserAction?: unknown;
  };

  const normalized = {
    summary: clampText(
      parsed.summary,
      1000,
      "This task can move forward with a clearer immediate action."
    ),
    recommendedNextAction:
      parsed.recommendedNextAction === null || parsed.recommendedNextAction === undefined
        ? null
        : clampText(
            parsed.recommendedNextAction,
            500,
            "Define the most useful next action and make it explicit."
          ),
    improvedTask:
      parsed.improvedTask && typeof parsed.improvedTask === "object"
        ? {
            title: clampText(
              (parsed.improvedTask as { title?: unknown }).title,
              500,
              "Refine this task into a clearer execution-ready version"
            ),
            description: clampText(
              (parsed.improvedTask as { description?: unknown }).description,
              4000,
              "Capture the most useful next action and the context needed to execute it."
            )
          }
        : null,
    gaps: Array.isArray(parsed.gaps)
      ? parsed.gaps.map((gap) => clampText(gap, 1000)).filter(Boolean)
      : [],
    blockers: Array.isArray(parsed.blockers)
      ? parsed.blockers.map((blocker) => clampText(blocker, 1000)).filter(Boolean)
      : [],
    nextSteps: Array.isArray(parsed.nextSteps)
      ? parsed.nextSteps.map((step) =>
          typeof step === "string"
            ? {
                title: clampText(step, 500, "Define the next concrete step"),
                why: "This was returned as a proposed move from the task analysis.",
                confidence: "medium"
              }
            : {
                ...step,
                title: clampText(
                  (step as { title?: unknown }).title,
                  500,
                  "Define the next concrete step"
                ),
                why: clampText(
                  (step as { why?: unknown }).why,
                  1000,
                  "This move should help push the task forward."
                )
              }
        )
      : [],
    suggestedNotes: Array.isArray(parsed.suggestedNotes)
      ? parsed.suggestedNotes.map((note) => clampText(note, 1200)).filter(Boolean)
      : [],
    clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions)
      ? parsed.clarifyingQuestions.map((question) =>
          typeof question === "string"
            ? {
                question: clampText(question, 500, "What is the missing detail here?"),
                why: "Answering this would help produce a stronger recommendation."
              }
            : {
                ...question,
                question: clampText(
                  (question as { question?: unknown }).question,
                  500,
                  "What is the missing detail here?"
                ),
                why: clampText(
                  (question as { why?: unknown }).why,
                  1000,
                  "Answering this would help produce a stronger recommendation."
                )
              }
        )
      : [],
    shouldReanalyzeAfterUserAction: parsed.shouldReanalyzeAfterUserAction
  };

  return aiTaskAnalysisOutputSchema.parse(normalized);
}
