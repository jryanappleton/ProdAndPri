import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { buildMockSuggestions } from "@/lib/classify";
import { env, hasOpenAiConfig } from "@/lib/env";
import { TodayLens } from "@/lib/types";
import {
  buildFallbackStoredTodayAnalysisFromInput,
  TODAY_ANALYSIS_VERSION,
  validateAiTodayAnalysisOutput
} from "@/lib/server/today-analysis";
import {
  normalizeTaskAnalysisOutput,
  TaskAnalysisMeta,
  TaskAnalysisOutput,
  validateAiTaskAnalysisOutput
} from "@/lib/server/task-analysis";

interface SuggestionOption {
  label: string;
  value: string;
  field: "title" | "areaId" | "listId" | "tagId" | "nextStep";
}

let client: OpenAI | null = null;

function getClient() {
  if (!hasOpenAiConfig()) {
    return null;
  }

  client ??= new OpenAI({
    apiKey: env.openAiApiKey
  });

  return client;
}

function normalizeSuggestions(items: SuggestionOption[]) {
  return items.map((item) => ({
    ...item,
    id: randomUUID(),
    state: "suggested" as const
  }));
}

export async function suggestTaskUpdates(input: {
  title: string;
  areas: string[];
  lists: string[];
  tags: string[];
}) {
  const openAi = getClient();
  if (!openAi) {
    return buildMockSuggestions(input.title);
  }

  try {
    const response = await openAi.responses.create({
      model: env.openAiClassifyModel,
      input: [
        {
          role: "system",
          content:
            "You classify rough productivity inbox tasks. Return JSON only with a suggestions array. Each suggestion must include label, value, and field. field must be one of title, areaId, listId, tagId, nextStep. Use human-readable names for areas, lists, and tags."
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ]
    });

    const parsed = JSON.parse(response.output_text || "{}") as {
      suggestions?: SuggestionOption[];
    };

    if (parsed.suggestions?.length) {
      return normalizeSuggestions(parsed.suggestions);
    }
  } catch (error) {
    console.warn("Falling back to heuristic task suggestions.", error);
  }

  return buildMockSuggestions(input.title);
}

function buildFallbackTaskDescription(input: {
  task: {
    title: string;
    area: string | null;
    list: string | null;
    waitingReason: string | null;
    dueDate: string | null;
    recurrenceLabel: string | null;
  };
  comments: Array<{ body: string }>;
  subtasks: Array<{ title: string; isDone: boolean }>;
  activity: Array<{ eventType: string; payload: string | null }>;
}) {
  const parts: string[] = [];

  if (input.task.area || input.task.list) {
    parts.push(
      `Context: ${[input.task.area, input.task.list].filter(Boolean).join(" > ")}.`
    );
  }

  const openSubtasks = input.subtasks.filter((entry) => !entry.isDone).map((entry) => entry.title);
  if (openSubtasks.length) {
    parts.push(`Open work: ${openSubtasks.slice(0, 3).join("; ")}.`);
  }

  if (input.comments.length) {
    parts.push(`Recent notes: ${input.comments.slice(0, 2).map((entry) => entry.body.trim()).join(" ")}`);
  }

  if (input.task.waitingReason) {
    parts.push(`Blocker: ${input.task.waitingReason}.`);
  }

  if (input.task.dueDate) {
    parts.push("This task has a due date and should keep moving.");
  }

  if (input.task.recurrenceLabel) {
    parts.push(`Recurs: ${input.task.recurrenceLabel}.`);
  }

  const description = parts.join(" ").trim();
  return description || `Clarify the outcome, context, and next step needed to complete "${input.task.title}".`;
}

export async function generateTaskDescription(input: {
  task: {
    title: string;
    currentDescription: string;
    status: "open" | "waiting_on" | "done";
    area: string | null;
    list: string | null;
    tags: string[];
    waitingReason: string | null;
    dueDate: string | null;
    recurrenceLabel: string | null;
    githubLink: {
      repository: string;
      title: string;
      state: string;
    } | null;
  };
  comments: Array<{ createdAt: string; body: string }>;
  subtasks: Array<{ title: string; isDone: boolean }>;
  activity: Array<{ createdAt: string; eventType: string; payload: string | null }>;
}) {
  const openAi = getClient();
  if (!openAi) {
    return buildFallbackTaskDescription({
      task: {
        title: input.task.title,
        area: input.task.area,
        list: input.task.list,
        waitingReason: input.task.waitingReason,
        dueDate: input.task.dueDate,
        recurrenceLabel: input.task.recurrenceLabel
      },
      comments: input.comments,
      subtasks: input.subtasks,
      activity: input.activity
    });
  }

  try {
    const response = await openAi.responses.create({
      model: env.openAiClassifyModel,
      input: [
        {
          role: "system",
          content:
            "Write a concise, practical task description using the provided task history. Return plain text only. Keep it under 600 characters. Focus on execution context, current blockers, and the most relevant next work. Do not add bullet points."
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ]
    });

    const description = response.output_text?.trim();
    if (description) {
      return description;
    }
  } catch (error) {
    console.warn("Falling back to deterministic task description generation.", error);
  }

  return buildFallbackTaskDescription({
    task: {
      title: input.task.title,
      area: input.task.area,
      list: input.task.list,
      waitingReason: input.task.waitingReason,
      dueDate: input.task.dueDate,
      recurrenceLabel: input.task.recurrenceLabel
    },
    comments: input.comments,
    subtasks: input.subtasks,
    activity: input.activity
  });
}

export async function generateTodayBriefing(input: {
  lens: TodayLens;
  tasks: Array<{ title: string; reason: string; area: string; list: string }>;
  feedback: string[];
  fallback: string;
}) {
  const openAi = getClient();
  if (!openAi) {
    return input.fallback;
  }

  try {
    const response = await openAi.responses.create({
      model: env.openAiTodayModel,
      input: [
        {
          role: "system",
          content:
            "Write one concise uplifting briefing for a Today plan. Keep it under 45 words, grounded, and not chatty."
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ]
    });

    const text = response.output_text?.trim();
    if (text) {
      return text;
    }
  } catch (error) {
    console.warn("Falling back to deterministic Today briefing.", error);
  }

  return input.fallback;
}

export async function generateTodayTaskAnalysis(input: {
  task: {
    id: string;
    title: string;
    description: string;
    status: "open" | "waiting_on" | "done";
    area: string | null;
    list: string | null;
    tags: string[];
    dueDate: string | null;
    deferUntil: string | null;
    waitingReason: string | null;
    waitingSince: string | null;
    recurrenceLabel: string | null;
    lastWorkedAt: string | null;
    createdAt: string;
    updatedAt: string;
    githubLink: {
      repository: string;
      title: string;
      state: string;
      updatedAt: string | null;
    } | null;
  };
  subtasks: Array<{ id: string; title: string; isDone: boolean }>;
  comments: Array<{ createdAt: string; body: string }>;
  activity: Array<{ createdAt: string; eventType: string; payload: string }>;
}) {
  const openAi = getClient();
  if (!openAi) {
    return buildFallbackStoredTodayAnalysisFromInput(input);
  }

  try {
    const response = await openAi.responses.create({
      model: env.openAiTodayModel,
      input: [
        {
          role: "system",
          content:
            `You classify a task for a daily planning system. Return JSON only.

Provide:
- summary: one concise sentence
- dimensions: numeric scores from 0 to 100 for revenue, unblock, strategic, admin, quick_win, deep_work, urgency, complexity, confidence
- rationale: one concise sentence for each dimension explaining the score

Use only the provided task data. Do not invent missing facts. Judge the task's likely fit for each dimension:
- revenue: near-term effect on revenue, demand, customers, or pipeline
- unblock: importance for removing blockers, dependencies, or waiting states
- strategic: long-term leverage, systems, positioning, architecture, planning
- admin: operational maintenance, paperwork, reconciliation, cleanup
- quick_win: likely to produce useful progress quickly
- deep_work: likely to benefit from focused time
- urgency: time pressure from due dates, waiting state, or recurrence
- complexity: number of moving parts and coordination load
- confidence: confidence in your scoring given the task data

Keep rationale concrete and under 240 characters each.`
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ]
    });

    const parsed = validateAiTodayAnalysisOutput(response.output_text || "{}");
    return {
      summary: parsed.summary,
      dimensions: parsed.dimensions,
      rationale: parsed.rationale,
      analyzedAt: new Date().toISOString(),
      source: "ai" as const,
      version: TODAY_ANALYSIS_VERSION
    };
  } catch (error) {
    console.warn("Falling back to deterministic Today task analysis.", error);
    return buildFallbackStoredTodayAnalysisFromInput(input);
  }
}

function buildFallbackTaskAnalysis(input: {
  task: {
    title: string;
    description: string;
    nextAction: string;
    waitingReason: string | null;
  };
  comments: Array<{ body: string; type: string }>;
  subtasks: Array<{ title: string; isDone: boolean }>;
}): TaskAnalysisOutput {
  const blockers = new Set<string>();
  const gaps = new Set<string>();
  const nextSteps: TaskAnalysisOutput["nextSteps"] = [];
  const commentBodies = input.comments.map((entry) => entry.body.toLowerCase());
  const hasDescription = input.task.description.trim().length > 0;
  const hasNextAction = input.task.nextAction.trim().length > 0;
  const openSubtasks = input.subtasks.filter((entry) => !entry.isDone);
  const clarifyingQuestions: TaskAnalysisOutput["clarifyingQuestions"] = [];

  if (!hasDescription) {
    gaps.add("The task does not yet capture enough context to work from confidently.");
    clarifyingQuestions.push({
      question: "What outcome would count as this task being done?",
      why: "A clear definition of done makes it easier to suggest a specific solution."
    });
  }

  if (input.task.waitingReason) {
    blockers.add(input.task.waitingReason);
  }

  if (commentBodies.some((body) => body.includes("waiting") || body.includes("need"))) {
    gaps.add("Important dependencies appear in the history and may need to be reflected in the task.");
    clarifyingQuestions.push({
      question: "Who or what is the main dependency, and what exactly do you need back from them?",
      why: "Naming the dependency helps turn the blocker into a concrete follow-up action."
    });
  }

  if (openSubtasks.length) {
    nextSteps.push({
      title: openSubtasks[0].title,
      why: "This is already identified as unfinished work on the task.",
      confidence: "high"
    });
  }

  if (!nextSteps.length) {
    nextSteps.push({
      title: `Define the next concrete step for "${input.task.title}"`,
      why: "The task still benefits from a clear immediate action.",
      confidence: "medium"
    });
  }

  if (hasDescription) {
    nextSteps.push({
      title: "Turn the most recent blocker into a concrete outreach or decision step",
      why: "The fastest way to move the task is usually to resolve the open dependency directly.",
      confidence: "medium"
    });
  }

  return {
    summary:
      blockers.size || gaps.size
        ? "This task needs a more forceful move forward: either resolve the blocker directly or answer the missing question that is preventing a confident plan."
        : "This task is reasonably clear; the main opportunity is to pick the most useful next move and make it explicit.",
    recommendedNextAction: hasNextAction
      ? openSubtasks[0]?.title ?? "Replace the current next action with a sharper concrete move if needed."
      : openSubtasks[0]?.title ?? `Define the first concrete action for "${input.task.title}".`,
    improvedTask: {
      title: input.task.title,
      description:
        input.task.description.trim() ||
        "Capture the missing context, dependency, and next step needed to move this task forward."
    },
    gaps: Array.from(gaps),
    blockers: Array.from(blockers),
    nextSteps: nextSteps.slice(0, 3),
    suggestedNotes: gaps.size
      ? ["Reflect the key dependency or missing information directly in the task description."]
      : [],
    clarifyingQuestions: clarifyingQuestions.slice(0, 3),
    shouldReanalyzeAfterUserAction: true
  };
}

export async function analyzeTaskForExecution(input: object) {
  const openAi = getClient();
  if (!openAi) {
    return {
      result: normalizeTaskAnalysisOutput(
        buildFallbackTaskAnalysis(
          input as {
            task: {
              title: string;
              description: string;
              nextAction: string;
              waitingReason: string | null;
            };
            comments: Array<{ body: string; type: string }>;
            subtasks: Array<{ title: string; isDone: boolean }>;
          }
        )
      ),
      meta: {
        source: "fallback",
        message: "OpenAI is not configured, so this insight used the deterministic fallback."
      } satisfies TaskAnalysisMeta
    };
  }

  try {
    const response = await openAi.responses.create({
      model: env.openAiTodayModel,
      input: [
        {
          role: "system",
          content:
            "You are helping improve a personal productivity task so it becomes clearer, more complete, and easier to execute.\n\nYou will receive the current task plus its full known history, including comments, activity, and subtask state.\n\nReturn JSON only.\n\nYour job is to:\n- infer what has already been tried or discussed from the task history\n- recommend concrete ways to move the task forward now\n- propose one task-level next action the user could see directly on the task card\n- identify blockers or dependencies only when that helps produce a better action plan\n- ask a few sharply targeted clarifying questions only if answering them would materially improve the plan\n- optionally suggest a clearer task title and description if helpful\n\nGuidelines:\n- Solutions first. Do not stop at saying there are gaps.\n- The recommended next action should be a single concrete move, short enough to display directly on a task card.\n- Every next step should be an actual move the user can take now.\n- Keep each next-step title short and scannable, ideally under 120 characters.\n- Use clarifying questions only when the task truly lacks enough information for a strong recommendation.\n- Clarifying questions must be specific and answerable, not generic prompts for more detail.\n- Use the full history to avoid repeating shallow advice.\n- Pay attention to repeated blockers, stalled progress, and unresolved dependencies.\n- Prefer concrete, near-term actions over broad advice.\n- Suggest 1 to 3 next steps unless more are truly necessary.\n- Do not invent facts not supported by the input.\n- Preserve the user's intent and scope.\n- If the task is already clear and actionable, say so and return minimal changes.\n- Return valid JSON matching the required schema exactly."
        },
        {
          role: "user",
          content: `Analyze this task and improve it for execution readiness using the current task state and full task history.\n\nReturn:\n- a short summary\n- one recommended task-level next action\n- blockers or dependencies only if they matter\n- 1 to 3 concrete next steps that would actually move the task forward now\n- optional improved title/description\n- optional note text worth attaching to the task\n- optional clarifying questions that would unlock a stronger recommendation if the current context is still insufficient\n\nTask analysis input:\n${JSON.stringify(input, null, 2)}`
        }
      ]
    });

    return {
      result: normalizeTaskAnalysisOutput(
        validateAiTaskAnalysisOutput(response.output_text || "{}")
      ),
      meta: {
        source: "ai",
        message: null
      } satisfies TaskAnalysisMeta
    };
  } catch (error) {
    console.warn("Falling back to deterministic task analysis.", error);
    const fallbackMessage =
      error instanceof Error
        ? `AI analysis failed, so this task is showing the deterministic fallback instead: ${error.message}`
        : "AI analysis failed, so this task is showing the deterministic fallback instead.";
    return {
      result: normalizeTaskAnalysisOutput(
        buildFallbackTaskAnalysis(
          input as {
            task: {
              title: string;
              description: string;
              nextAction: string;
              waitingReason: string | null;
            };
            comments: Array<{ body: string; type: string }>;
            subtasks: Array<{ title: string; isDone: boolean }>;
          }
        )
      ),
      meta: {
        source: "fallback",
        message: fallbackMessage
      } satisfies TaskAnalysisMeta
    };
  }
}
