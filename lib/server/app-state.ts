import { randomUUID } from "node:crypto";
import {
  CommentType,
  Prisma,
  TaskChatMessageRole,
  TaskSourceType,
  TaskStatus,
  TodayGroupKey,
  TodayLens,
  TodayPlanStatus
} from "@prisma/client";
import { env, hasGitHubConfig, hasOpenAiConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  Area,
  AppState,
  BootstrapPayload,
  Preferences,
  SuggestionState,
  TaskChat,
  TaskChatDraft,
  TaskChatMessage,
  Task as ClientTask,
  TaskSuggestion,
  TaskList,
  TodayLens as ClientTodayLens,
  TodayPlan as ClientTodayPlan
} from "@/lib/types";
import {
  analyzeTaskForExecution,
  continueTaskChat,
  createTaskChatConversation,
  generateTaskChatDraft,
  generateTaskDescription,
  suggestTaskUpdates
} from "@/lib/server/ai";
import { createRepositoryIssue, fetchRepositoryIssues } from "@/lib/server/github";
import { ensureWorkspaceSeeded } from "@/lib/server/seed-workspace";
import {
  buildTaskAnalysisInput,
  computeTaskAnalysisState,
  formatAnalysisComment,
  parseStoredTaskAnalysis,
  serializeTaskAnalysisMeta,
  serializeStoredTaskAnalysis
} from "@/lib/server/task-analysis";
import {
  parseStoredTaskChatDraft,
  serializeTaskChatDraft
} from "@/lib/server/task-chat";
import { parseStoredTodayTaskAnalysis } from "@/lib/server/today-analysis";
import { generateTodayPlan } from "@/lib/server/today";

const workspaceInclude = {
  areas: {
    orderBy: {
      position: "asc" as const
    }
  },
  lists: {
    orderBy: {
      position: "asc" as const
    }
  },
  tags: {
    orderBy: {
      name: "asc" as const
    }
  },
  tasks: {
    orderBy: {
      createdAt: "desc" as const
    },
    include: {
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
      area: true,
      aiState: true,
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
    }
  },
  feedback: {
    orderBy: {
      createdAt: "asc" as const
    }
  },
  preferences: true,
  githubConnection: true,
  repositories: {
    orderBy: [{ owner: "asc" as const }, { repo: "asc" as const }]
  },
  imports: {
    orderBy: {
      createdAt: "desc" as const
    }
  }
} satisfies Prisma.WorkspaceInclude;

type WorkspaceRecord = Prisma.WorkspaceGetPayload<{
  include: typeof workspaceInclude;
}>;

const taskInclude = {
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
  area: true,
  aiState: true,
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

type TaskRecord = Prisma.TaskGetPayload<{
  include: typeof taskInclude;
}>;

const taskChatInclude = {
  messages: {
    orderBy: {
      createdAt: "asc" as const
    }
  }
} satisfies Prisma.TaskChatInclude;

type TaskChatRecord = Prisma.TaskChatGetPayload<{
  include: typeof taskChatInclude;
}>;

function startOfTodayUtc() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function endOfTodayUtc() {
  const date = startOfTodayUtc();
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function parseSuggestions(
  raw: string | null | undefined
): TaskSuggestion[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as {
      suggestions?: Array<
        Omit<TaskSuggestion, "id" | "state"> & {
          id?: string;
          state?: SuggestionState;
        }
      >;
    };

    return (parsed.suggestions ?? []).map((entry) => ({
      id: entry.id ?? randomUUID(),
      label: entry.label,
      value: entry.value,
      field: entry.field,
      state: entry.state ?? "suggested"
    }));
  } catch {
    return [];
  }
}

function serializeSuggestions(suggestions: TaskSuggestion[]) {
  return JSON.stringify({
    suggestions
  });
}

function mapArea(area: WorkspaceRecord["areas"][number]): Area {
  return {
    id: area.id,
    name: area.name,
    description: area.description ?? ""
  };
}

function mapList(list: WorkspaceRecord["lists"][number]): TaskList {
  return {
    id: list.id,
    areaId: list.areaId,
    name: list.name
  };
}

function mapPreferences(
  preferences: WorkspaceRecord["preferences"]
): Preferences {
  return {
    defaultLens:
      (preferences?.defaultLens as ClientTodayLens | undefined) ?? "balanced",
    quickWinsPreference: preferences?.quickWinsPreference ?? 60,
    deepWorkPreference: preferences?.deepWorkPreference ?? 70,
    revenueWeight: preferences?.revenueWeight ?? 65,
    unblockWeight: preferences?.unblockWeight ?? 60,
    strategicWeight: preferences?.strategicWeight ?? 70,
    adminWeight: preferences?.adminWeight ?? 45
  };
}

function formatTaskActivity(
  task: TaskRecord,
  activity: TaskRecord["activities"][number]
) {
  const currentAreaName = task.area?.name ?? "Inbox";
  const currentListName = task.list?.name ?? null;
  const currentPath = currentListName
    ? `${currentAreaName} > ${currentListName}`
    : currentAreaName;

  switch (activity.eventType) {
    case "task_captured":
      return activity.payload ?? "Captured into Inbox";
    case "task_filed":
      return `Filed into ${currentPath}`;
    case "task_placed":
      return currentListName ? `Moved to ${currentPath}` : `Moved to ${currentAreaName}`;
    case "task_updated":
      return "Updated task details";
    case "status_changed":
      if (activity.payload === "done") return "Marked done";
      if (activity.payload === "waiting on") return "Marked waiting on";
      if (activity.payload === "open") return "Reopened task";
      return "Updated task status";
    case "subtask_added":
      return activity.payload ? `Added subtask: ${activity.payload}` : "Added subtask";
    case "subtask_updated":
      return activity.payload ? `Renamed subtask: ${activity.payload}` : "Updated subtask";
    case "subtask_toggled":
      return activity.payload ? `Updated subtask: ${activity.payload}` : "Updated subtask";
    case "subtask_next_action":
      return activity.payload
        ? `Set next action to: ${activity.payload}`
        : "Updated active next action";
    case "comment_added":
      return "Added a note";
    case "description_generated":
      return "Generated a task description";
    case "task_analyzed":
      return "Generated an execution insight";
    case "analysis_applied":
      return activity.payload ?? "Applied an AI suggestion";
    case "task_chat_applied":
      return activity.payload ?? "Applied an AI chat suggestion";
    case "suggestion_staged":
      return activity.payload ? `Accepted suggestion: ${activity.payload}` : "Accepted suggestion";
    case "task_imported":
      return "Imported task";
    case "github_issue_imported":
      return activity.payload ? `Imported GitHub issue: ${activity.payload}` : "Imported GitHub issue";
    case "github_issue_created":
      return activity.payload ? `Created GitHub issue: ${activity.payload}` : "Created GitHub issue";
    default:
      return activity.payload
        ? `${activity.eventType.replaceAll("_", " ")}: ${activity.payload}`
        : activity.eventType.replaceAll("_", " ");
  }
}

function mapTask(task: TaskRecord): ClientTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    nextAction: task.nextAction ?? "",
    nextActionSubtaskId: task.nextActionSubtaskId,
    status: task.status,
    source: task.sourceType,
    areaId: task.areaId,
    listId: task.listId,
    tagIds: task.taskTags.map((taskTag) => taskTag.tagId),
    isInbox: task.isInbox,
    dueDate: task.dueDate?.toISOString() ?? null,
    deferUntil: task.deferUntil?.toISOString() ?? null,
    recurrenceLabel: task.recurrenceLabel,
    waitingReason: task.waitingReason,
    waitingSince: task.waitingSince?.toISOString() ?? null,
    githubLink: task.githubIssueLink
      ? {
          repositoryId: task.githubIssueLink.repositoryId,
          repository: `${task.githubIssueLink.repository.owner}/${task.githubIssueLink.repository.repo}`,
          issueNumber: task.githubIssueLink.githubIssueNumber,
          title: task.githubIssueLink.githubTitle,
          state: task.githubIssueLink.githubState === "closed" ? "closed" : "open",
          url: task.githubIssueLink.githubIssueUrl,
          updatedAt:
            task.githubIssueLink.githubUpdatedAt?.toISOString() ?? task.updatedAt.toISOString()
        }
      : null,
    subtasks: task.subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      isDone: subtask.isDone
    })),
    comments: task.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      type:
        comment.commentType === CommentType.ai_feedback
          ? "feedback"
          : comment.commentType === CommentType.update
            ? "update"
            : "note"
    })),
    activity: task.activities.map((activity) => ({
      id: activity.id,
      body: formatTaskActivity(task, activity),
      createdAt: activity.createdAt.toISOString()
    })),
    suggestions: parseSuggestions(task.aiState?.classification),
    analysis: computeTaskAnalysisState(task),
    todayAnalysis: parseStoredTodayTaskAnalysis(
      task.aiState?.todayClassification,
      task.aiState?.todayAnalyzedAt,
      task.aiState?.todayMeta
    ),
    completedAt: task.completedAt?.toISOString() ?? null,
    lastWorkedAt: task.lastWorkedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function emptyTaskChat(taskId: string): TaskChat {
  return {
    taskId,
    conversationId: null,
    resetCount: 0,
    createdAt: null,
    updatedAt: null,
    messages: [],
    draft: null
  };
}

function mapTaskChatMessage(
  message: TaskChatRecord["messages"][number]
): TaskChatMessage {
  return {
    id: message.id,
    role: message.role,
    body: message.body,
    createdAt: message.createdAt.toISOString()
  };
}

function mapTaskChat(taskId: string, chat: TaskChatRecord | null): TaskChat {
  if (!chat) {
    return emptyTaskChat(taskId);
  }

  return {
    taskId,
    conversationId: chat.openAiConversationId,
    resetCount: chat.resetCount,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    messages: chat.messages.map(mapTaskChatMessage),
    draft: parseStoredTaskChatDraft(chat.draftJson)
  };
}

function mapWorkspaceToState(
  workspace: WorkspaceRecord,
  lens: ClientTodayLens
): AppState {
  return {
    areas: workspace.areas.map(mapArea),
    lists: workspace.lists.map(mapList),
    tags: workspace.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      tone: (
        tag.slug === "revenue" || tag.slug === "github"
          ? "accent"
          : tag.slug === "follow-up"
            ? "warm"
            : tag.slug === "quick-win"
              ? "success"
              : "neutral"
      ) as "accent" | "warm" | "neutral" | "success"
    })),
    tasks: workspace.tasks.map(mapTask),
    preferences: mapPreferences(workspace.preferences),
    activeLens: lens,
    todayFeedback: workspace.feedback
      .filter((entry) => entry.date >= startOfTodayUtc())
      .map((entry) => ({
        id: entry.id,
        body: entry.body,
        lens: entry.lens as ClientTodayLens,
        createdAt: entry.createdAt.toISOString()
      })),
    dismissedToday: [] as string[],
    githubConnected: Boolean(workspace.githubConnection?.encryptedToken || hasGitHubConfig()),
    githubRepositories: workspace.repositories.map((repository) => ({
      id: repository.id,
      owner: repository.owner,
      repo: repository.repo,
      label: `${repository.owner}/${repository.repo}`
    })),
    importHistory: workspace.imports.map(
      (entry) =>
        entry.summary ??
        `${entry.originalFilename} (${entry.status.replaceAll("_", " ")})`
    )
  };
}

async function getWorkspaceRecord() {
  await ensureWorkspaceSeeded(prisma);
  return prisma.workspace.findFirstOrThrow({
    include: workspaceInclude
  });
}

async function getTaskRecord(taskId: string) {
  return prisma.task.findUniqueOrThrow({
    where: {
      id: taskId
    },
    include: taskInclude
  });
}

async function getTaskChatRecord(taskId: string) {
  return prisma.taskChat.findUnique({
    where: {
      taskId
    },
    include: taskChatInclude
  });
}

export async function getTaskSnapshot(taskId: string) {
  return mapTask(await getTaskRecord(taskId));
}

export async function getTaskChatSnapshot(taskId: string) {
  return mapTaskChat(taskId, await getTaskChatRecord(taskId));
}

function parsePersistedScoreBreakdown(raw: string | null) {
  if (!raw) {
    return {
      weightedSignals: {},
      deterministicModifiers: {},
      confidenceMultiplier: 1
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      weightedSignals?: Record<string, number>;
      deterministicModifiers?: Record<string, number>;
      confidenceMultiplier?: number;
    };

    return {
      weightedSignals: parsed.weightedSignals ?? {},
      deterministicModifiers: parsed.deterministicModifiers ?? {},
      confidenceMultiplier:
        typeof parsed.confidenceMultiplier === "number"
          ? parsed.confidenceMultiplier
          : 1
    };
  } catch {
    return {
      weightedSignals: {},
      deterministicModifiers: {},
      confidenceMultiplier: 1
    };
  }
}

function buildCachedTodayPlan(input: {
  state: AppState;
  existingPlan: Prisma.TodayPlanGetPayload<{
    include: {
      items: true;
    };
  }> | null;
  lens: ClientTodayLens;
}): ClientTodayPlan {
  const { existingPlan, lens, state } = input;

  if (!existingPlan) {
    return {
      lens,
      briefing: "Refresh to build a Today plan from your latest task changes.",
      items: []
    };
  }

  return {
    lens,
    briefing: existingPlan.briefing,
    items: existingPlan.items
      .filter((item) => !item.dismissed)
      .sort((left, right) => left.rank - right.rank)
      .map((item) => {
        const task = state.tasks.find((entry) => entry.id === item.taskId);

        return {
          taskId: item.taskId,
          groupKey: item.groupKey as TodayGroupKey,
          reason: item.reasonSummary,
          score: item.finalScore,
          scoreBreakdown: parsePersistedScoreBreakdown(item.reasonCodes),
          analysisGeneratedAt: item.analysisGeneratedAt?.toISOString() ?? null,
          analysisSource: task?.todayAnalysis?.source ?? null
        };
      })
  };
}

export async function getBootstrapPayload(
  options?: {
    lens?: ClientTodayLens;
    refreshToday?: boolean;
  }
): Promise<BootstrapPayload> {
  const workspace = await getWorkspaceRecord();
  const todayDate = startOfTodayUtc();
  const activeLens =
    options?.lens ??
    (workspace.preferences?.defaultLens as ClientTodayLens | undefined) ??
    "balanced";
  const state = mapWorkspaceToState(workspace, activeLens);
  const existingPlan = await prisma.todayPlan.findUnique({
    where: {
      workspaceId_date_lens: {
        workspaceId: workspace.id,
        date: todayDate,
        lens: activeLens
      }
    },
    include: {
      items: true
    }
  });

  state.dismissedToday = existingPlan?.items
    .filter((item) => item.dismissed)
    .map((item) => item.taskId) ?? [];
  const refreshToday = options?.refreshToday ?? false;
  const todayPlan = refreshToday
    ? await generateTodayPlan(workspace.id, state, activeLens)
    : buildCachedTodayPlan({
        state,
        existingPlan,
        lens: activeLens
      });

  if (refreshToday) {
    const persistedTodayItems = [
      ...todayPlan.items.map((item, index) => ({
        taskId: item.taskId,
        groupKey: item.groupKey as TodayGroupKey,
        rank: index + 1,
        reasonSummary: item.reason,
        reasonCodes: JSON.stringify(item.scoreBreakdown),
        finalScore: item.score,
        dismissed: state.dismissedToday.includes(item.taskId),
        analysisGeneratedAt: item.analysisGeneratedAt
          ? new Date(item.analysisGeneratedAt)
          : null
      })),
      ...state.dismissedToday
        .filter((taskId) => !todayPlan.items.some((item) => item.taskId === taskId))
        .map((taskId, index) => ({
          taskId,
          groupKey: "highest_leverage" as TodayGroupKey,
          rank: todayPlan.items.length + index + 1,
          reasonSummary: "Dismissed from Today.",
          reasonCodes: null,
          finalScore: -1,
          dismissed: true,
          analysisGeneratedAt: null
        }))
    ];

    const persistedPlan = existingPlan
      ? await prisma.todayPlan.update({
          where: {
            id: existingPlan.id
          },
          data: {
            briefing: todayPlan.briefing,
            status: TodayPlanStatus.ready,
            generatedAt: new Date(),
            items: {
              deleteMany: {},
              create: persistedTodayItems
            }
          },
          include: {
            items: true
          }
        })
      : await prisma.todayPlan.upsert({
          where: {
            workspaceId_date_lens: {
              workspaceId: workspace.id,
              date: todayDate,
              lens: activeLens
            }
          },
          create: {
            workspaceId: workspace.id,
            date: todayDate,
            lens: activeLens,
            briefing: todayPlan.briefing,
            status: TodayPlanStatus.ready,
            items: {
              create: persistedTodayItems
            }
          },
          update: {
            briefing: todayPlan.briefing,
            status: TodayPlanStatus.ready,
            generatedAt: new Date(),
            items: {
              deleteMany: {},
              create: persistedTodayItems
            }
          },
          include: {
            items: true
          }
        });

    state.dismissedToday = persistedPlan.items
      .filter((item) => item.dismissed)
      .map((item) => item.taskId);
  }

  return {
    state,
    todayPlan,
    integrations: {
      database: {
        provider: "postgres",
        ready: true
      },
      openAi: {
        configured: hasOpenAiConfig(),
        classifyModel: env.openAiClassifyModel,
        todayModel: env.openAiTodayModel,
        transcriptionModel: env.openAiTranscriptionModel
      },
      github: {
        configured: hasGitHubConfig(),
        connected: state.githubConnected,
        repositories: workspace.repositories.map((repo) => `${repo.owner}/${repo.repo}`)
      }
    }
  };
}

function buildActivity(eventType: string, payload?: string) {
  return {
    eventType,
    payload
  };
}

async function buildTaskChatContext(taskId: string) {
  const workspace = await prisma.workspace.findFirstOrThrow({
    include: {
      tags: {
        orderBy: {
          name: "asc"
        }
      }
    }
  });
  const task = await getTaskRecord(taskId);

  return {
    workspaceId: workspace.id,
    task: {
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      nextAction: task.nextAction ?? "",
      status: task.status,
      area: task.area?.name ?? null,
      list: task.list?.name ?? null,
      tags: task.taskTags.map((entry) => entry.tag.name),
      availableTags: workspace.tags.map((tag) => ({
        id: tag.id,
        name: tag.name
      })),
      waitingReason: task.waitingReason,
      recurrenceLabel: task.recurrenceLabel,
      githubLink: task.githubIssueLink
        ? {
            repository: `${task.githubIssueLink.repository.owner}/${task.githubIssueLink.repository.repo}`,
            title: task.githubIssueLink.githubTitle,
            state: task.githubIssueLink.githubState
          }
        : null
    },
    subtasks: task.subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      isDone: subtask.isDone
    })),
    comments: [...task.comments]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 8)
      .map((comment) => ({
        createdAt: comment.createdAt.toISOString(),
        body: comment.body
      })),
    activity: [...task.activities]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 10)
      .map((entry) => ({
        createdAt: entry.createdAt.toISOString(),
        eventType: entry.eventType,
        payload: entry.payload
      }))
  };
}

function resolveTaskChatDraftTagIds(input: {
  draft: TaskChatDraft;
  existingTagIds: string[];
  workspaceTags: Array<{ id: string; name: string }>;
}) {
  if (!input.draft.tags.length) {
    return [];
  }

  const existingTagIds = new Set(input.existingTagIds);
  const tagsById = new Map(input.workspaceTags.map((tag) => [tag.id, tag.id]));
  const tagsByName = new Map(
    input.workspaceTags.map((tag) => [tag.name.trim().toLowerCase(), tag.id])
  );
  const resolved = new Set<string>();

  for (const draftTag of input.draft.tags) {
    if (draftTag.applied) {
      continue;
    }

    if (draftTag.tagId && tagsById.has(draftTag.tagId) && !existingTagIds.has(draftTag.tagId)) {
      resolved.add(draftTag.tagId);
      continue;
    }

    const match = tagsByName.get(draftTag.name.trim().toLowerCase());
    if (match && !existingTagIds.has(match)) {
      resolved.add(match);
    }
  }

  return Array.from(resolved);
}

async function syncTaskNextActionLink(
  tx: Prisma.TransactionClient,
  task: {
    id: string;
    nextAction: string | null;
    nextActionSubtaskId: string | null;
    subtasks: Array<{ id: string; title: string; isDone: boolean; position: number }>;
  },
  nextActionInput: string
) {
  const trimmedNextAction = nextActionInput.trim();
  const linkedSubtask =
    task.nextActionSubtaskId
      ? task.subtasks.find((subtask) => subtask.id === task.nextActionSubtaskId) ?? null
      : null;
  const activeLinkedSubtask =
    linkedSubtask && !linkedSubtask.isDone ? linkedSubtask : null;

  if (!trimmedNextAction) {
    return {
      nextAction: "",
      nextActionSubtaskId: null
    };
  }

  const reusableSubtask =
    activeLinkedSubtask ??
    task.subtasks.find((subtask) => !subtask.isDone && subtask.title === trimmedNextAction) ??
    null;

  if (reusableSubtask) {
    if (reusableSubtask.title !== trimmedNextAction) {
      await tx.subtask.update({
        where: {
          id: reusableSubtask.id
        },
        data: {
          title: trimmedNextAction
        }
      });
    }

    return {
      nextAction: trimmedNextAction,
      nextActionSubtaskId: reusableSubtask.id
    };
  }

  const createdSubtask = await tx.subtask.create({
    data: {
      taskId: task.id,
      title: trimmedNextAction,
      position: task.subtasks.length
    }
  });

  return {
    nextAction: trimmedNextAction,
    nextActionSubtaskId: createdSubtask.id
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createTask(input: {
  title: string;
  source?: TaskSourceType;
}) {
  const workspace = await prisma.workspace.findFirstOrThrow({
    include: {
      areas: true,
      lists: true,
      tags: true
    }
  });
  const title = input.title.trim();
  const suggestions = await suggestTaskUpdates({
    title,
    areas: workspace.areas.map((area) => area.name),
    lists: workspace.lists.map((list) => list.name),
    tags: workspace.tags.map((tag) => tag.name)
  });

  const task = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      title,
      normalizedTitle: title.toLowerCase(),
      description: "",
      nextAction: "",
      nextActionSubtaskId: null,
      status: TaskStatus.open,
      sourceType: input.source ?? TaskSourceType.manual,
      isInbox: true,
      aiState: {
        create: {
          classification: serializeSuggestions(suggestions)
        }
      },
      activities: {
        create: buildActivity("task_captured", "Captured into Inbox")
      }
    },
    include: taskInclude
  });

  return mapTask(task);
}

export async function createArea(name: string) {
  const workspace = await prisma.workspace.findFirstOrThrow();
  const trimmed = name.trim();
  const position = await prisma.area.count({
    where: {
      workspaceId: workspace.id
    }
  });

  const area = await prisma.area.create({
    data: {
      workspaceId: workspace.id,
      name: trimmed,
      slug: slugify(trimmed),
      position
    }
  });

  return mapArea(area);
}

export async function createList(areaId: string, name: string) {
  const workspace = await prisma.workspace.findFirstOrThrow();
  const trimmed = name.trim();
  const position = await prisma.taskList.count({
    where: {
      workspaceId: workspace.id,
      areaId
    }
  });

  const list = await prisma.taskList.create({
    data: {
      workspaceId: workspace.id,
      areaId,
      name: trimmed,
      slug: slugify(trimmed),
      position
    }
  });

  return mapList(list);
}

export async function createTag(name: string) {
  const workspace = await prisma.workspace.findFirstOrThrow();
  const trimmed = name.trim();

  const tag = await prisma.tag.create({
    data: {
      workspaceId: workspace.id,
      name: trimmed,
      slug: slugify(trimmed)
    }
  });

  return {
    id: tag.id,
    name: tag.name,
    tone: "neutral" as const
  };
}

export async function deleteArea(areaId: string) {
  await prisma.$transaction(async (tx) => {
    const affectedTasks = await tx.task.findMany({
      where: {
        OR: [
          {
            areaId
          },
          {
            list: {
              areaId
            }
          }
        ]
      },
      select: {
        id: true
      }
    });

    await tx.task.updateMany({
      where: {
        OR: [
          {
            areaId
          },
          {
            list: {
              areaId
            }
          }
        ]
      },
      data: {
        areaId: null,
        listId: null,
        isInbox: true,
        updatedAt: new Date()
      }
    });

    if (affectedTasks.length) {
      await tx.taskActivity.createMany({
        data: affectedTasks.map((task) => ({
          taskId: task.id,
          eventType: "area_deleted",
          payload: areaId
        }))
      });
    }

    await tx.area.delete({
      where: {
        id: areaId
      }
    });
  });
}

export async function deleteList(listId: string) {
  await prisma.$transaction(async (tx) => {
    const affectedTasks = await tx.task.findMany({
      where: {
        listId
      },
      select: {
        id: true
      }
    });

    await tx.task.updateMany({
      where: {
        listId
      },
      data: {
        areaId: null,
        listId: null,
        isInbox: true,
        updatedAt: new Date()
      }
    });

    if (affectedTasks.length) {
      await tx.taskActivity.createMany({
        data: affectedTasks.map((task) => ({
          taskId: task.id,
          eventType: "list_deleted",
          payload: listId
        }))
      });
    }

    await tx.taskList.delete({
      where: {
        id: listId
      }
    });
  });
}

export async function updateTaskPlacement(input: {
  taskId: string;
  areaId: string | null;
  listId: string | null;
}) {
  await prisma.task.update({
    where: {
      id: input.taskId
    },
    data: {
      areaId: input.areaId,
      listId: input.listId,
      isInbox: input.areaId ? false : true,
      updatedAt: new Date(),
      activities: {
        create: buildActivity(
          "task_placed",
          JSON.stringify({
            areaId: input.areaId,
            listId: input.listId
          })
        )
      }
    }
  });

  return getTaskSnapshot(input.taskId);
}

export async function updateTask(input: {
  taskId: string;
  title: string;
  description: string;
  nextAction: string;
  areaId: string | null;
  listId: string | null;
  tagIds: string[];
}) {
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({
      where: {
        id: input.taskId
      },
      include: {
        subtasks: {
          orderBy: {
            position: "asc"
          }
        }
      }
    });

    const nextActionState = await syncTaskNextActionLink(
      tx,
      {
        id: task.id,
        nextAction: task.nextAction,
        nextActionSubtaskId: task.nextActionSubtaskId,
        subtasks: task.subtasks
      },
      input.nextAction
    );

    await tx.task.update({
      where: {
        id: input.taskId
      },
      data: {
        title: input.title.trim(),
        normalizedTitle: input.title.trim().toLowerCase(),
        description: input.description.trim(),
        nextAction: nextActionState.nextAction,
        nextActionSubtaskId: nextActionState.nextActionSubtaskId,
        areaId: input.areaId,
        listId: input.listId,
        isInbox: input.areaId ? false : true,
        updatedAt: new Date(),
        taskTags: {
          deleteMany: {},
          create: input.tagIds.map((tagId) => ({
            tagId
          }))
        },
        activities: {
          create: buildActivity(
            "task_updated",
            JSON.stringify({
              nextAction: nextActionState.nextAction,
              nextActionSubtaskId: nextActionState.nextActionSubtaskId,
              areaId: input.areaId,
              listId: input.listId,
              tagIds: input.tagIds
            })
          )
        }
      }
    });
  });

  return getTaskSnapshot(input.taskId);
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({
    where: {
      id: taskId
    }
  });
}

export async function createVoiceCapture() {
  return createTask({
    title:
      "voice memo: follow up on website homepage copy and maybe split into subtasks",
    source: TaskSourceType.voice
  });
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const data: Prisma.TaskUpdateInput = {
    status,
    updatedAt: new Date(),
    lastWorkedAt: new Date()
  };

  if (status === TaskStatus.done) {
    data.completedAt = new Date();
    data.waitingReason = null;
    data.waitingSince = null;
  } else if (status === TaskStatus.waiting_on) {
    data.completedAt = null;
    data.waitingReason = data.waitingReason ?? null;
    data.waitingSince = new Date();
  } else {
    data.completedAt = null;
    data.waitingReason = null;
    data.waitingSince = null;
  }

  await prisma.task.update({
    where: {
      id: taskId
    },
    data: {
      ...data,
      activities: {
        create: buildActivity("status_changed", status.replaceAll("_", " "))
      }
    }
  });

  return getTaskSnapshot(taskId);
}

export async function toggleSubtask(taskId: string, subtaskId: string) {
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({
      where: {
        id: taskId
      },
      select: {
        nextActionSubtaskId: true
      }
    });
    const subtask = await tx.subtask.findUniqueOrThrow({
      where: {
        id: subtaskId
      }
    });
    const nextIsDone = !subtask.isDone;
    const isLinkedNextActionSubtask = task.nextActionSubtaskId === subtaskId;

    await tx.subtask.update({
      where: {
        id: subtaskId
      },
      data: {
        isDone: nextIsDone
      }
    });

    await tx.task.update({
      where: {
        id: taskId
      },
      data: {
        nextAction:
          isLinkedNextActionSubtask && nextIsDone ? "" : undefined,
        nextActionSubtaskId:
          isLinkedNextActionSubtask && nextIsDone ? null : undefined,
        activities: {
          create: buildActivity(
            "subtask_toggled",
            isLinkedNextActionSubtask && nextIsDone
              ? `${subtask.title} (completed active next action)`
              : subtask.title
          )
        }
      }
    });
  });

  return getTaskSnapshot(taskId);
}

export async function updateSubtaskTitle(taskId: string, subtaskId: string, title: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("Subtask title cannot be empty.");
  }

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({
      where: {
        id: taskId
      },
      select: {
        nextActionSubtaskId: true
      }
    });

    await tx.subtask.update({
      where: {
        id: subtaskId
      },
      data: {
        title: trimmedTitle
      }
    });

    await tx.task.update({
      where: {
        id: taskId
      },
      data: {
        nextAction: task.nextActionSubtaskId === subtaskId ? trimmedTitle : undefined,
        activities: {
          create: buildActivity("subtask_updated", trimmedTitle)
        }
      }
    });
  });

  return getTaskSnapshot(taskId);
}

export async function createSubtask(taskId: string, title: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("Subtask title cannot be empty.");
  }

  await prisma.$transaction(async (tx) => {
    const position = await tx.subtask.count({
      where: {
        taskId
      }
    });

    await tx.subtask.create({
      data: {
        taskId,
        title: trimmedTitle,
        position
      }
    });

    await tx.task.update({
      where: {
        id: taskId
      },
      data: {
        activities: {
          create: buildActivity("subtask_added", trimmedTitle)
        }
      }
    });
  });

  return getTaskSnapshot(taskId);
}

export async function setSubtaskAsNextAction(taskId: string, subtaskId: string) {
  await prisma.$transaction(async (tx) => {
    const subtask = await tx.subtask.findUniqueOrThrow({
      where: {
        id: subtaskId
      }
    });

    if (subtask.taskId !== taskId) {
      throw new Error("That subtask does not belong to this task.");
    }

    if (subtask.isDone) {
      throw new Error("Completed subtasks cannot be the active next action.");
    }

    await tx.task.update({
      where: {
        id: taskId
      },
      data: {
        nextAction: subtask.title,
        nextActionSubtaskId: subtask.id,
        activities: {
          create: buildActivity("subtask_next_action", subtask.title)
        }
      }
    });
  });

  return getTaskSnapshot(taskId);
}

export async function addComment(taskId: string, body: string) {
  await prisma.task.update({
    where: {
      id: taskId
    },
    data: {
      comments: {
        create: {
          body: body.trim(),
          commentType: CommentType.note
        }
      },
      activities: {
        create: buildActivity("comment_added")
      }
    }
  });

  return getTaskSnapshot(taskId);
}

export async function sendTaskChatMessage(taskId: string, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Message cannot be empty.");
  }

  const task = await getTaskRecord(taskId);
  let chat = await getTaskChatRecord(taskId);

  if (!chat) {
    const conversationId = await createTaskChatConversation({
      taskId: task.id
    }).catch(() => null);

    chat = await prisma.taskChat.create({
      data: {
        taskId,
        openAiConversationId: conversationId
      },
      include: taskChatInclude
    });
  } else if (hasOpenAiConfig() && !chat.openAiConversationId) {
    const conversationId = await createTaskChatConversation({
      taskId: task.id,
      resetCount: String(chat.resetCount)
    }).catch(() => null);

    chat = await prisma.taskChat.update({
      where: {
        id: chat.id
      },
      data: {
        openAiConversationId: conversationId
      },
      include: taskChatInclude
    });
  }

  await prisma.taskChatMessage.create({
    data: {
      taskChatId: chat.id,
      role: TaskChatMessageRole.user,
      body: trimmedBody
    }
  });

  const taskSnapshot = await buildTaskChatContext(taskId);
  const reply = await continueTaskChat({
    conversationId: chat.openAiConversationId,
    userMessage: trimmedBody,
    taskSnapshot
  });

  await prisma.taskChatMessage.create({
    data: {
      taskChatId: chat.id,
      role: TaskChatMessageRole.assistant,
      body: reply.output.replyText,
      openAiResponseId: reply.responseId
    }
  });

  return getTaskChatSnapshot(taskId);
}

export async function resetTaskChat(taskId: string) {
  const existing = await getTaskChatRecord(taskId);
  if (!existing) {
    return emptyTaskChat(taskId);
  }

  const nextResetCount = existing.resetCount + 1;
  const conversationId = await createTaskChatConversation({
    taskId,
    resetCount: String(nextResetCount)
  }).catch(() => null);

  await prisma.taskChat.update({
    where: {
      id: existing.id
    },
    data: {
      draftJson: null,
      draftGeneratedAt: null,
      openAiConversationId: conversationId,
      resetCount: nextResetCount,
      messages: {
        deleteMany: {}
      }
    }
  });

  return getTaskChatSnapshot(taskId);
}

export async function generateTaskChatDraftForTask(taskId: string) {
  let chat = await getTaskChatRecord(taskId);

  if (!chat) {
    const conversationId = await createTaskChatConversation({
      taskId
    }).catch(() => null);

    chat = await prisma.taskChat.create({
      data: {
        taskId,
        openAiConversationId: conversationId
      },
      include: taskChatInclude
    });
  }

  const taskSnapshot = await buildTaskChatContext(taskId);
  const transcript = chat.messages.map((message) => ({
    role: message.role,
    body: message.body
  }));
  const draft = await generateTaskChatDraft({
    conversationId: chat.openAiConversationId,
    taskSnapshot,
    transcript
  });
  const draftWithTimestamp: TaskChatDraft = {
    ...draft,
    generatedAt: new Date().toISOString()
  };

  await prisma.taskChat.update({
    where: {
      id: chat.id
    },
    data: {
      draftJson: serializeTaskChatDraft(draftWithTimestamp),
      draftGeneratedAt: new Date()
    }
  });

  return getTaskChatSnapshot(taskId);
}

export async function dismissTaskChatDraft(taskId: string) {
  const chat = await getTaskChatRecord(taskId);
  if (!chat) {
    return emptyTaskChat(taskId);
  }

  await prisma.taskChat.update({
    where: {
      id: chat.id
    },
    data: {
      draftJson: null,
      draftGeneratedAt: null
    }
  });

  return getTaskChatSnapshot(taskId);
}

export async function applyTaskChatDraft(
  taskId: string,
  action: "next_action" | "description" | "note" | "subtask" | "tag",
  itemId?: string
) {
  const chat = await prisma.taskChat.findUniqueOrThrow({
    where: {
      taskId
    }
  });
  const draft = parseStoredTaskChatDraft(chat.draftJson);
  if (!draft) {
    throw new Error("No draft is available for this task.");
  }

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({
      where: {
        id: taskId
      },
      include: {
        subtasks: {
          orderBy: {
            position: "asc"
          }
        }
      }
    });

    switch (action) {
      case "next_action": {
        const value = draft.nextAction?.value.trim();
        if (!value || draft.nextAction?.applied) {
          throw new Error("No unapplied next action is available.");
        }
        const nextActionDraft = draft.nextAction!;

        const nextActionState = await syncTaskNextActionLink(
          tx,
          {
            id: task.id,
            nextAction: task.nextAction,
            nextActionSubtaskId: task.nextActionSubtaskId,
            subtasks: task.subtasks
          },
          value
        );

        await tx.task.update({
          where: {
            id: taskId
          },
          data: {
            nextAction: nextActionState.nextAction,
            nextActionSubtaskId: nextActionState.nextActionSubtaskId,
            activities: {
              create: buildActivity("task_chat_applied", `Updated next action to: ${nextActionState.nextAction}`)
            }
          }
        });

        draft.nextAction = {
          value: nextActionDraft.value,
          applied: true
        };
        break;
      }
      case "description": {
        const value = draft.description?.value.trim();
        if (!value || draft.description?.applied) {
          throw new Error("No unapplied description is available.");
        }
        const descriptionDraft = draft.description!;

        await tx.task.update({
          where: {
            id: taskId
          },
          data: {
            description: value,
            activities: {
              create: buildActivity("task_chat_applied", "Updated task description from AI draft")
            }
          }
        });

        draft.description = {
          value: descriptionDraft.value,
          applied: true
        };
        break;
      }
      case "note": {
        const note = draft.notes.find((entry) => entry.id === itemId);
        if (!note || note.applied) {
          throw new Error("No unapplied note is available.");
        }

        await tx.task.update({
          where: {
            id: taskId
          },
          data: {
            comments: {
              create: {
                body: note.body,
                commentType: CommentType.note
              }
            },
            activities: {
              create: buildActivity("task_chat_applied", "Added note from AI draft")
            }
          }
        });

        note.applied = true;
        break;
      }
      case "subtask": {
        const subtask = draft.subtasks.find((entry) => entry.id === itemId);
        if (!subtask || subtask.applied) {
          throw new Error("No unapplied subtask is available.");
        }

        const position = await tx.subtask.count({
          where: {
            taskId
          }
        });

        await tx.subtask.create({
          data: {
            taskId,
            title: subtask.title,
            position
          }
        });

        await tx.task.update({
          where: {
            id: taskId
          },
          data: {
            activities: {
              create: buildActivity("task_chat_applied", `Added subtask from AI draft: ${subtask.title}`)
            }
          }
        });

        subtask.applied = true;
        break;
      }
      case "tag": {
        const tagDraft = draft.tags.find((entry) => entry.id === itemId);
        if (!tagDraft || tagDraft.applied) {
          throw new Error("No unapplied tag is available.");
        }

        const workspaceTags = await tx.tag.findMany({
          where: {
            workspaceId: task.workspaceId
          },
          select: {
            id: true,
            name: true
          }
        });
        const tagIdsToAdd = resolveTaskChatDraftTagIds({
          draft: {
            ...draft,
            tags: [tagDraft]
          },
          existingTagIds: (await tx.taskTag.findMany({
            where: {
              taskId
            },
            select: {
              tagId: true
            }
          })).map((entry) => entry.tagId),
          workspaceTags
        });

        if (!tagIdsToAdd.length) {
          throw new Error("No valid new tag is available.");
        }

        await tx.taskTag.create({
          data: {
            taskId,
            tagId: tagIdsToAdd[0]
          }
        });

        await tx.task.update({
          where: {
            id: taskId
          },
          data: {
            activities: {
              create: buildActivity("task_chat_applied", `Added tag from AI draft: ${tagDraft.name}`)
            }
          }
        });

        tagDraft.applied = true;
        tagDraft.tagId = tagIdsToAdd[0];
        break;
      }
      default:
        throw new Error("Unsupported draft action.");
    }

    await tx.taskChat.update({
      where: {
        id: chat.id
      },
      data: {
        draftJson: serializeTaskChatDraft(draft)
      }
    });
  });

  return {
    chat: await getTaskChatSnapshot(taskId),
    task: await getTaskSnapshot(taskId)
  };
}

export async function generateTaskDescriptionForTask(taskId: string) {
  const task = await prisma.task.findUniqueOrThrow({
    where: {
      id: taskId
    },
    include: taskInclude
  });

  const description = await generateTaskDescription({
    task: {
      title: task.title,
      currentDescription: task.description ?? "",
      status: task.status,
      area: task.area?.name ?? null,
      list: task.list?.name ?? null,
      tags: task.taskTags.map((entry) => entry.tag.name),
      waitingReason: task.waitingReason,
      dueDate: task.dueDate?.toISOString() ?? null,
      recurrenceLabel: task.recurrenceLabel,
      githubLink: task.githubIssueLink
        ? {
            repository: `${task.githubIssueLink.repository.owner}/${task.githubIssueLink.repository.repo}`,
            title: task.githubIssueLink.githubTitle,
            state: task.githubIssueLink.githubState
          }
        : null
    },
    comments: [...task.comments]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 6)
      .map((entry) => ({
        createdAt: entry.createdAt.toISOString(),
        body: entry.body
      })),
    subtasks: task.subtasks.map((entry) => ({
      title: entry.title,
      isDone: entry.isDone
    })),
    activity: [...task.activities]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 8)
      .map((entry) => ({
        createdAt: entry.createdAt.toISOString(),
        eventType: entry.eventType,
        payload: entry.payload
      }))
  });

  await prisma.task.update({
    where: {
      id: taskId
    },
    data: {
      description,
      updatedAt: new Date(),
      activities: {
        create: buildActivity("description_generated", "AI generated task description")
      }
    }
  });

  return getTaskSnapshot(taskId);
}

export async function analyzeTask(taskId: string) {
  const task = await prisma.task.findUniqueOrThrow({
    where: {
      id: taskId
    },
    include: {
      area: true,
      list: true,
      subtasks: {
        orderBy: {
          position: "asc"
        }
      },
      comments: {
        orderBy: {
          createdAt: "asc"
        }
      },
      activities: {
        orderBy: {
          createdAt: "asc"
        }
      },
      aiState: true,
      taskTags: {
        include: {
          tag: true
        }
      }
    }
  });

  const analysisState = computeTaskAnalysisState(task);
  if (!analysisState.isEligible) {
    throw new Error("This task needs new user activity before AI should analyze it again.");
  }

  const analysisInput = buildTaskAnalysisInput(task);
  const { result: analysisResult, meta: analysisMeta } = await analyzeTaskForExecution(
    analysisInput
  );
  const commentBody = formatAnalysisComment(analysisResult);

  await prisma.task.update({
    where: {
      id: taskId
    },
    data: {
      comments: {
        create: {
          body: commentBody,
          commentType: CommentType.ai_feedback
        }
      },
      aiState: {
        upsert: {
          create: {
            clarificationSuggestion: serializeStoredTaskAnalysis(analysisResult),
            nextStepSuggestion: serializeTaskAnalysisMeta(analysisMeta),
            lastAnalyzedAt: new Date()
          },
          update: {
            clarificationSuggestion: serializeStoredTaskAnalysis(analysisResult),
            nextStepSuggestion: serializeTaskAnalysisMeta(analysisMeta),
            lastAnalyzedAt: new Date()
          }
        }
      },
      activities: {
        create: buildActivity("task_analyzed", "AI generated a fresh execution insight")
      }
    }
  });

  return getTaskSnapshot(taskId);
}

export async function applyTaskAnalysisSuggestion(input: {
  taskId: string;
  action: "task_next_action" | "next_step" | "suggested_note" | "improved_task";
  itemId?: string;
}) {
  const task = await prisma.task.findUniqueOrThrow({
    where: {
      id: input.taskId
    },
    include: {
      aiState: true,
      subtasks: true
    }
  });

  const latest = parseStoredTaskAnalysis(task.aiState?.clarificationSuggestion);
  if (!latest) {
    throw new Error("No AI insight is available for this task yet.");
  }

  if (input.action === "improved_task") {
    if (!latest.improvedTask || latest.improvedTask.applied) {
      throw new Error("The improved task suggestion has already been applied.");
    }

    latest.improvedTask.applied = true;

    await prisma.task.update({
      where: {
        id: input.taskId
      },
      data: {
        title: latest.improvedTask.title,
        normalizedTitle: latest.improvedTask.title.toLowerCase(),
        description: latest.improvedTask.description,
        aiState: {
          upsert: {
            create: {
              clarificationSuggestion: serializeStoredTaskAnalysis(latest),
              lastAnalyzedAt: task.aiState?.lastAnalyzedAt ?? new Date()
            },
            update: {
              clarificationSuggestion: serializeStoredTaskAnalysis(latest)
            }
          }
        },
        activities: {
          create: buildActivity("analysis_applied", "Applied improved task framing")
        }
      }
    });
    return getTaskSnapshot(input.taskId);
  }

  if (input.action === "task_next_action") {
    if (!latest.recommendedNextAction || latest.recommendedNextAction.applied) {
      throw new Error("The recommended next action has already been applied.");
    }

    latest.recommendedNextAction.applied = true;

    await prisma.$transaction(async (tx) => {
      const nextActionState = await syncTaskNextActionLink(
        tx,
        {
          id: task.id,
          nextAction: task.nextAction,
          nextActionSubtaskId: task.nextActionSubtaskId,
          subtasks: task.subtasks
        },
        latest.recommendedNextAction?.value ?? ""
      );

      await tx.task.update({
        where: {
          id: input.taskId
        },
        data: {
          nextAction: nextActionState.nextAction,
          nextActionSubtaskId: nextActionState.nextActionSubtaskId,
          aiState: {
            upsert: {
              create: {
                clarificationSuggestion: serializeStoredTaskAnalysis(latest),
                lastAnalyzedAt: task.aiState?.lastAnalyzedAt ?? new Date()
              },
              update: {
                clarificationSuggestion: serializeStoredTaskAnalysis(latest)
              }
            }
          },
          activities: {
            create: buildActivity(
              "analysis_applied",
              `Saved next action: ${nextActionState.nextAction}`
            )
          }
        }
      });
    });
    return getTaskSnapshot(input.taskId);
  }

  if (!input.itemId) {
    throw new Error("Choose a specific AI recommendation to apply.");
  }

  if (input.action === "next_step") {
    const step = latest.nextSteps.find((entry) => entry.id === input.itemId);
    if (!step || step.applied) {
      throw new Error("That next-step suggestion is no longer available.");
    }

    step.applied = true;
    const position = task.subtasks.length;

    await prisma.task.update({
      where: {
        id: input.taskId
      },
      data: {
        subtasks: {
          create: {
            title: step.title,
            position
          }
        },
        aiState: {
          upsert: {
            create: {
              clarificationSuggestion: serializeStoredTaskAnalysis(latest),
              lastAnalyzedAt: task.aiState?.lastAnalyzedAt ?? new Date()
            },
            update: {
              clarificationSuggestion: serializeStoredTaskAnalysis(latest)
            }
          }
        },
        activities: {
          create: buildActivity("analysis_applied", `Added subtask: ${step.title}`)
        }
      }
    });
    return getTaskSnapshot(input.taskId);
  }

  const note = latest.suggestedNotes.find((entry) => entry.id === input.itemId);
  if (!note || note.applied) {
    throw new Error("That suggested note is no longer available.");
  }

  note.applied = true;
  await prisma.task.update({
    where: {
      id: input.taskId
    },
    data: {
      comments: {
        create: {
          body: note.body,
          commentType: CommentType.note
        }
      },
      aiState: {
        upsert: {
          create: {
            clarificationSuggestion: serializeStoredTaskAnalysis(latest),
            lastAnalyzedAt: task.aiState?.lastAnalyzedAt ?? new Date()
          },
          update: {
            clarificationSuggestion: serializeStoredTaskAnalysis(latest)
          }
        }
      },
      activities: {
        create: buildActivity("analysis_applied", "Saved AI note into task comments")
      }
    }
  });

  return getTaskSnapshot(input.taskId);
}

export async function applySuggestion(taskId: string, suggestionId: string) {
  const task = await prisma.task.findUniqueOrThrow({
    where: {
      id: taskId
    },
    include: {
      aiState: true,
      taskTags: true
    }
  });
  const suggestions = parseSuggestions(task.aiState?.classification);
  const suggestion = suggestions.find((entry) => entry.id === suggestionId);

  if (!suggestion) {
    return;
  }

  const updatedSuggestions = suggestions.map((entry) => {
    if (entry.id === suggestionId) {
      return { ...entry, state: "accepted" as const };
    }

    if (
      entry.field === suggestion.field &&
      suggestion.field !== "tagId" &&
      suggestion.field !== "nextStep" &&
      entry.state === "accepted"
    ) {
      return { ...entry, state: "suggested" as const };
    }

    return entry;
  });

  await prisma.task.update({
    where: {
      id: taskId
    },
    data: {
      updatedAt: new Date(),
      aiState: {
        upsert: {
          create: {
            classification: serializeSuggestions(updatedSuggestions)
          },
          update: {
            classification: serializeSuggestions(updatedSuggestions)
          }
        }
      },
      activities: {
        create: buildActivity("suggestion_staged", suggestion.label)
      }
    }
  });

  return getTaskSnapshot(taskId);
}

export async function ignoreSuggestion(taskId: string, suggestionId: string) {
  const task = await prisma.task.findUniqueOrThrow({
    where: {
      id: taskId
    },
    include: {
      aiState: true
    }
  });

  const updated = parseSuggestions(task.aiState?.classification).map((entry) =>
    entry.id === suggestionId ? { ...entry, state: "ignored" as const } : entry
  );

  await prisma.task.update({
    where: {
      id: taskId
    },
    data: {
      aiState: {
        upsert: {
          create: {
            classification: serializeSuggestions(updated)
          },
          update: {
            classification: serializeSuggestions(updated)
          }
        }
      }
    }
  });

  return getTaskSnapshot(taskId);
}

export async function fileTaskFromInbox(input: {
  taskId: string;
  areaId: string | null;
  listId: string | null;
}) {
  const workspace = await prisma.workspace.findFirstOrThrow({
    include: {
      tags: true,
      areas: true,
      lists: true
    }
  });
  const task = await prisma.task.findUniqueOrThrow({
    where: {
      id: input.taskId
    },
    include: {
      aiState: true,
      taskTags: true,
      subtasks: {
        orderBy: {
          position: "asc"
        }
      }
    }
  });

  const suggestions = parseSuggestions(task.aiState?.classification);
  const accepted = suggestions.filter((entry) => entry.state === "accepted");
  const acceptedTitle = accepted.find((entry) => entry.field === "title");
  const acceptedArea = accepted.find((entry) => entry.field === "areaId");
  const acceptedList = accepted.find((entry) => entry.field === "listId");
  const acceptedTags = accepted.filter((entry) => entry.field === "tagId");
  const acceptedNextStep = accepted.find((entry) => entry.field === "nextStep");

  const resolvedAreaId =
    input.areaId ??
    workspace.areas.find((entry) => entry.name === acceptedArea?.value)?.id ??
    task.areaId;
  const resolvedListId =
    input.listId ??
    workspace.lists.find((entry) => entry.name === acceptedList?.value)?.id ??
    task.listId;

  if (!resolvedAreaId || !resolvedListId) {
    throw new Error("Choose both an area and a list before filing this task.");
  }

  const nextTagIds = new Set(task.taskTags.map((entry) => entry.tagId));
  acceptedTags.forEach((entry) => {
    const tag = workspace.tags.find((candidate) => candidate.name === entry.value);
    if (tag) {
      nextTagIds.add(tag.id);
    }
  });

  await prisma.$transaction(async (tx) => {
    const nextActionState = await syncTaskNextActionLink(
      tx,
      {
        id: task.id,
        nextAction: task.nextAction,
        nextActionSubtaskId: task.nextActionSubtaskId,
        subtasks: task.subtasks
      },
      acceptedNextStep?.value ?? task.nextAction ?? ""
    );

    await tx.task.update({
      where: {
        id: input.taskId
      },
      data: {
        title: acceptedTitle?.value ?? task.title,
        normalizedTitle: (acceptedTitle?.value ?? task.title).toLowerCase(),
        nextAction: nextActionState.nextAction,
        nextActionSubtaskId: nextActionState.nextActionSubtaskId,
        areaId: resolvedAreaId,
        listId: resolvedListId,
        isInbox: false,
        updatedAt: new Date(),
        taskTags: {
          deleteMany: {},
          create: Array.from(nextTagIds).map((tagId) => ({
            tagId
          }))
        },
        aiState: {
          upsert: {
            create: {
              classification: serializeSuggestions(
                suggestions.map((entry) =>
                  entry.state === "accepted" ? { ...entry, state: "suggested" as const } : entry
                )
              )
            },
            update: {
              classification: serializeSuggestions(
                suggestions.map((entry) =>
                  entry.state === "accepted" ? { ...entry, state: "suggested" as const } : entry
                )
              )
            }
          }
        },
        activities: {
          create: buildActivity(
            "task_filed",
            JSON.stringify({
              areaId: resolvedAreaId,
              listId: resolvedListId,
              nextActionSubtaskId: nextActionState.nextActionSubtaskId
            })
          )
        }
      }
    });
  });

  return getTaskSnapshot(input.taskId);
}

export async function addTodayFeedback(lens: ClientTodayLens, body: string) {
  const workspace = await prisma.workspace.findFirstOrThrow();
  await prisma.todayFeedbackMessage.create({
    data: {
      workspaceId: workspace.id,
      date: new Date(),
      lens,
      body: body.trim()
    }
  });
}

export async function dismissTaskFromToday(
  taskId: string,
  lens: ClientTodayLens
) {
  const workspace = await prisma.workspace.findFirstOrThrow();
  const plan = await prisma.todayPlan.findFirst({
    where: {
      workspaceId: workspace.id,
      lens,
      date: {
        gte: startOfTodayUtc(),
        lt: endOfTodayUtc()
      }
    },
    include: {
      items: true
    }
  });

  if (!plan) {
    return;
  }

  const item = plan.items.find((entry) => entry.taskId === taskId);
  if (!item) {
    return;
  }

  await prisma.todayPlanItem.update({
    where: {
      id: item.id
    },
    data: {
      dismissed: true
    }
  });
}

export async function updatePreferences(
  key:
    | "defaultLens"
    | "quickWinsPreference"
    | "deepWorkPreference"
    | "revenueWeight"
    | "unblockWeight"
    | "strategicWeight"
    | "adminWeight",
  value: number | ClientTodayLens
) {
  const workspace = await prisma.workspace.findFirstOrThrow();

  const preferences = await prisma.userPreferences.upsert({
    where: {
      workspaceId: workspace.id
    },
    create: {
      workspaceId: workspace.id,
      defaultLens:
        key === "defaultLens" ? (value as TodayLens) : TodayLens.balanced,
      quickWinsPreference: key === "quickWinsPreference" ? (value as number) : 60,
      deepWorkPreference: key === "deepWorkPreference" ? (value as number) : 70,
      revenueWeight: key === "revenueWeight" ? (value as number) : 65,
      unblockWeight: key === "unblockWeight" ? (value as number) : 60,
      strategicWeight: key === "strategicWeight" ? (value as number) : 70,
      adminWeight: key === "adminWeight" ? (value as number) : 45
    },
    update: {
      [key]: value
    }
  });

  return mapPreferences(preferences);
}

export async function importSampleTask() {
  const workspace = await prisma.workspace.findFirstOrThrow({
    include: {
      areas: true,
      lists: true,
      tags: true
    }
  });
  const area = workspace.areas.find((entry) => entry.name === "Lazy Tiger");
  const list = workspace.lists.find((entry) => entry.name === "Hostel Next Ups");
  const tag = workspace.tags.find((entry) => entry.name === "Quick Win");

  await prisma.import.create({
    data: {
      workspaceId: workspace.id,
      sourceType: "csv",
      status: "completed",
      originalFilename: "sample-import.csv",
      summary: "Imported 1 sample task and reviewed it successfully.",
      completedAt: new Date()
    }
  });

  await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      areaId: area?.id,
      listId: list?.id,
      title: "Imported: Review spring check-in template",
      normalizedTitle: "imported-review-spring-check-in-template",
      description: "Brought in from sample CSV import.",
      status: TaskStatus.open,
      sourceType: TaskSourceType.import,
      taskTags: tag
        ? {
            create: {
              tagId: tag.id
            }
          }
        : undefined,
      activities: {
        create: buildActivity("task_imported", "sample review flow")
      }
    }
  });
}

export async function toggleGitHubConnection() {
  const workspace = await prisma.workspace.findFirstOrThrow();
  const current = await prisma.gitHubConnection.findUnique({
    where: {
      workspaceId: workspace.id
    }
  });

  if (current) {
    await prisma.gitHubConnection.delete({
      where: {
        workspaceId: workspace.id
      }
    });
    return false;
  }

  await prisma.gitHubConnection.create({
    data: {
      workspaceId: workspace.id,
      encryptedToken: hasGitHubConfig() ? "env" : null,
      username: "env-configured"
    }
  });

  return true;
}

export async function addGitHubRepository(input: {
  owner: string;
  repo: string;
}) {
  const workspace = await prisma.workspace.findFirstOrThrow();
  const repository = await prisma.gitHubRepository.create({
    data: {
      workspaceId: workspace.id,
      owner: input.owner.trim(),
      repo: input.repo.trim()
    }
  });

  return {
    id: repository.id,
    owner: repository.owner,
    repo: repository.repo,
    label: `${repository.owner}/${repository.repo}`
  };
}

export async function syncGitHubIssues() {
  const workspace = await prisma.workspace.findFirstOrThrow({
    include: {
      repositories: true
    }
  });

  if (!workspace.repositories.length || !hasGitHubConfig()) {
    return;
  }

  for (const repository of workspace.repositories) {
    const issues = await fetchRepositoryIssues(repository.owner, repository.repo);
    for (const issue of issues) {
      const existingLink = await prisma.gitHubIssueLink.findFirst({
        where: {
          repositoryId: repository.id,
          githubIssueNumber: issue.number
        }
      });

      if (existingLink) {
        await prisma.gitHubIssueLink.update({
          where: {
            id: existingLink.id
          },
          data: {
            githubState: issue.state,
            githubTitle: issue.title,
            githubBodySnapshot: issue.body ?? "",
            githubUpdatedAt: new Date(issue.updated_at),
            lastSyncedAt: new Date()
          }
        });
        continue;
      }

      const task = await prisma.task.create({
        data: {
          workspaceId: workspace.id,
          title: issue.title,
          normalizedTitle: issue.title.toLowerCase(),
          description: issue.body ?? "",
          status: TaskStatus.open,
          sourceType: TaskSourceType.github,
          activities: {
            create: buildActivity(
              "github_issue_imported",
              `${repository.owner}/${repository.repo}#${issue.number}`
            )
          }
        }
      });

      await prisma.gitHubIssueLink.create({
        data: {
          taskId: task.id,
          repositoryId: repository.id,
          githubIssueNumber: issue.number,
          githubIssueUrl: issue.html_url,
          githubState: issue.state,
          githubTitle: issue.title,
          githubBodySnapshot: issue.body ?? "",
          githubUpdatedAt: new Date(issue.updated_at),
          lastSyncedAt: new Date()
        }
      });
    }

    await prisma.gitHubRepository.update({
      where: {
        id: repository.id
      },
      data: {
        lastSyncedAt: new Date()
      }
    });
  }
}

export async function createGitHubIssueForTask(input: {
  taskId: string;
  repositoryId: string;
}) {
  const repository = await prisma.gitHubRepository.findUniqueOrThrow({
    where: {
      id: input.repositoryId
    }
  });
  const task = await prisma.task.findUniqueOrThrow({
    where: {
      id: input.taskId
    },
    include: {
      githubIssueLink: true
    }
  });

  if (task.githubIssueLink) {
    throw new Error("This task is already linked to a GitHub issue.");
  }

  const issue = await createRepositoryIssue({
    owner: repository.owner,
    repo: repository.repo,
    title: task.title,
    body: task.description || "Created from Prod & Pri."
  });

  await prisma.task.update({
    where: {
      id: input.taskId
    },
    data: {
      githubIssueLink: {
        create: {
          repositoryId: repository.id,
          githubIssueNumber: issue.number,
          githubIssueUrl: issue.html_url,
          githubState: issue.state,
          githubTitle: issue.title,
          githubBodySnapshot: issue.body ?? "",
          githubUpdatedAt: issue.updated_at ? new Date(issue.updated_at) : new Date(),
          lastSyncedAt: new Date()
        }
      },
      activities: {
        create: buildActivity(
          "github_issue_created",
          `${repository.owner}/${repository.repo}#${issue.number}`
        )
      }
    }
  });

  return getTaskSnapshot(input.taskId);
}
