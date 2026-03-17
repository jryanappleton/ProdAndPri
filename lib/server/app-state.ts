import { randomUUID } from "node:crypto";
import {
  CommentType,
  Prisma,
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
  Task as ClientTask,
  TaskSuggestion,
  TaskList,
  TodayLens as ClientTodayLens
} from "@/lib/types";
import { analyzeTaskForExecution, suggestTaskUpdates } from "@/lib/server/ai";
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

function mapTask(task: TaskRecord): ClientTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
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
      body: activity.payload
        ? `${activity.eventType.replaceAll("_", " ")}: ${activity.payload}`
        : activity.eventType.replaceAll("_", " "),
      createdAt: activity.createdAt.toISOString()
    })),
    suggestions: parseSuggestions(task.aiState?.classification),
    analysis: computeTaskAnalysisState(task),
    completedAt: task.completedAt?.toISOString() ?? null,
    lastWorkedAt: task.lastWorkedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
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

export async function getTaskSnapshot(taskId: string) {
  return mapTask(await getTaskRecord(taskId));
}

export async function getBootstrapPayload(
  lens?: ClientTodayLens
): Promise<BootstrapPayload> {
  const workspace = await getWorkspaceRecord();
  const todayDate = startOfTodayUtc();
  const activeLens =
    lens ??
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
  const todayPlan = await generateTodayPlan(state, activeLens);

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
            create: todayPlan.items.map((item, index) => ({
              taskId: item.taskId,
              groupKey: item.groupKey as TodayGroupKey,
              rank: index + 1,
              reasonSummary: item.reason,
              dismissed: state.dismissedToday.includes(item.taskId)
            }))
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
            create: todayPlan.items.map((item, index) => ({
              taskId: item.taskId,
              groupKey: item.groupKey as TodayGroupKey,
              rank: index + 1,
              reasonSummary: item.reason,
              dismissed: false
            }))
          }
        },
        update: {
          briefing: todayPlan.briefing,
          status: TodayPlanStatus.ready,
          generatedAt: new Date(),
          items: {
            deleteMany: {},
            create: todayPlan.items.map((item, index) => ({
              taskId: item.taskId,
              groupKey: item.groupKey as TodayGroupKey,
              rank: index + 1,
              reasonSummary: item.reason,
              dismissed: state.dismissedToday.includes(item.taskId)
            }))
          }
        },
        include: {
          items: true
        }
      });

  state.dismissedToday = persistedPlan.items
    .filter((item) => item.dismissed)
    .map((item) => item.taskId);

  return {
    state,
    todayPlan,
    integrations: {
      database: {
        provider: "sqlite",
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
  areaId: string | null;
  listId: string | null;
}) {
  await prisma.task.update({
    where: {
      id: input.taskId
    },
    data: {
      title: input.title.trim(),
      normalizedTitle: input.title.trim().toLowerCase(),
      description: input.description.trim(),
      areaId: input.areaId,
      listId: input.listId,
      isInbox: input.areaId ? false : true,
      updatedAt: new Date(),
      activities: {
        create: buildActivity(
          "task_updated",
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
  const subtask = await prisma.subtask.findUniqueOrThrow({
    where: {
      id: subtaskId
    }
  });

  await prisma.subtask.update({
    where: {
      id: subtaskId
    },
    data: {
      isDone: !subtask.isDone
    }
  });

  await prisma.task.update({
    where: {
      id: taskId
    },
    data: {
      activities: {
        create: buildActivity("subtask_toggled", subtask.title)
      }
    }
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
  action: "next_step" | "suggested_note" | "improved_task";
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
      taskTags: true
    }
  });

  const suggestions = parseSuggestions(task.aiState?.classification);
  const accepted = suggestions.filter((entry) => entry.state === "accepted");
  const acceptedTitle = accepted.find((entry) => entry.field === "title");
  const acceptedArea = accepted.find((entry) => entry.field === "areaId");
  const acceptedList = accepted.find((entry) => entry.field === "listId");
  const acceptedTags = accepted.filter((entry) => entry.field === "tagId");

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

  await prisma.task.update({
    where: {
      id: input.taskId
    },
    data: {
      title: acceptedTitle?.value ?? task.title,
      normalizedTitle: (acceptedTitle?.value ?? task.title).toLowerCase(),
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
            listId: resolvedListId
          })
        )
      }
    }
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
