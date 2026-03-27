"use client";

import {
  createContext,
  ReactNode,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";
import {
  AppState,
  BootstrapPayload,
  IntegrationStatus,
  TaskChat,
  Task,
  TaskSource,
  TodayLens,
  TodayPlan
} from "@/lib/types";

interface AppDataContextValue {
  state: AppState;
  todayPlan: TodayPlan;
  integrations: IntegrationStatus;
  taskChats: Record<string, TaskChat | undefined>;
  getAreaName: (areaId: string | null) => string;
  getListName: (listId: string | null) => string;
  getTagNames: (tagIds: string[]) => string[];
}

interface AppUiContextValue {
  isSaving: boolean;
  aiOperation: {
    taskId: string | null;
    type:
      | "analyze"
      | "apply"
      | "describe"
      | "chat_send"
      | "chat_convert"
      | "chat_apply"
      | "chat_reset"
      | "chat_dismiss_draft"
      | null;
  };
}

interface AppActionsContextValue {
  createTask: (title: string, source?: TaskSource) => Promise<void>;
  createVoiceCapture: () => Promise<void>;
  setTaskStatus: (taskId: string, status: Task["status"]) => Promise<void>;
  createSubtask: (taskId: string, title: string) => Promise<void>;
  setSubtaskAsNextAction: (taskId: string, subtaskId: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  updateSubtask: (taskId: string, subtaskId: string, title: string) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<void>;
  loadTaskChat: (taskId: string) => Promise<void>;
  sendTaskChatMessage: (taskId: string, body: string) => Promise<void>;
  generateTaskChatDraft: (taskId: string) => Promise<void>;
  resetTaskChat: (taskId: string) => Promise<void>;
  dismissTaskChatDraft: (taskId: string) => Promise<void>;
  applyTaskChatDraft: (
    taskId: string,
    action: "next_action" | "description" | "note" | "subtask" | "tag",
    itemId?: string
  ) => Promise<void>;
  generateTaskDescription: (taskId: string) => Promise<void>;
  analyzeTask: (taskId: string) => Promise<void>;
  applyTaskAnalysis: (
    taskId: string,
    action: "task_next_action" | "next_step" | "suggested_note" | "improved_task",
    itemId?: string
  ) => Promise<void>;
  applySuggestion: (taskId: string, suggestionId: string) => Promise<void>;
  ignoreSuggestion: (taskId: string, suggestionId: string) => Promise<void>;
  setLens: (lens: TodayLens) => Promise<void>;
  addTodayFeedback: (body: string) => Promise<void>;
  dismissFromToday: (taskId: string) => Promise<void>;
  importSampleTasks: () => Promise<void>;
  toggleGithubConnected: () => Promise<void>;
  syncGithubIssues: () => Promise<void>;
  addGitHubRepository: (owner: string, repo: string) => Promise<void>;
  createGitHubIssueForTask: (taskId: string, repositoryId: string) => Promise<void>;
  createArea: (name: string) => Promise<void>;
  createList: (areaId: string, name: string) => Promise<void>;
  createTag: (name: string) => Promise<void>;
  deleteArea: (areaId: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  updateTaskPlacement: (
    taskId: string,
    areaId: string | null,
    listId: string | null
  ) => Promise<void>;
  updateTask: (input: {
    taskId: string;
    title: string;
    description: string;
    nextAction: string;
    areaId: string | null;
    listId: string | null;
    tagIds: string[];
  }) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  fileTaskFromInbox: (
    taskId: string,
    areaId: string | null,
    listId: string | null
  ) => Promise<void>;
  updatePreferences: (
    key: keyof AppState["preferences"],
    value: number | TodayLens
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

type AppContextValue = AppDataContextValue & AppUiContextValue & AppActionsContextValue;

const AppDataContext = createContext<AppDataContextValue | null>(null);
const AppUiContext = createContext<AppUiContextValue | null>(null);
const AppActionsContext = createContext<AppActionsContextValue | null>(null);

async function apiRequest<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export function AppStateProvider({
  children,
  initialPayload
}: {
  children: ReactNode;
  initialPayload: BootstrapPayload;
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [taskChats, setTaskChats] = useState<Record<string, TaskChat | undefined>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [aiOperation, setAiOperation] = useState<{
    taskId: string | null;
    type:
      | "analyze"
      | "apply"
      | "describe"
      | "chat_send"
      | "chat_convert"
      | "chat_apply"
      | "chat_reset"
      | "chat_dismiss_draft"
      | null;
  }>({
    taskId: null,
    type: null
  });

  const replacePayload = useCallback(async (next: Promise<BootstrapPayload>) => {
    setIsSaving(true);
    try {
      const result = await next;
      startTransition(() => {
        setPayload(result);
      });
    } finally {
      setIsSaving(false);
    }
  }, []);

  const patchPayload = useCallback((updater: (current: BootstrapPayload) => BootstrapPayload) => {
    startTransition(() => {
      setPayload((current) => updater(current));
    });
  }, []);

  const mergeTaskChat = useCallback((chat: TaskChat) => {
    startTransition(() => {
      setTaskChats((current) => ({
        ...current,
        [chat.taskId]: chat
      }));
    });
  }, []);

  const mergeTask = useCallback((task: Task) => {
    patchPayload((current) => {
      const exists = current.state.tasks.some((entry) => entry.id === task.id);
      const tasks = exists
        ? current.state.tasks.map((entry) => (entry.id === task.id ? task : entry))
        : [task, ...current.state.tasks];

      return {
        ...current,
        state: {
          ...current.state,
          tasks,
          dismissedToday: current.state.dismissedToday.filter((id) => id !== task.id)
        },
        todayPlan: task.isInbox
          ? {
              ...current.todayPlan,
              items: current.todayPlan.items.filter((item) => item.taskId !== task.id)
            }
          : current.todayPlan
      };
    });
  }, [patchPayload]);

  const refreshBootstrap = useCallback(async (
    lens = payload.state.activeLens,
    refreshToday = false
  ) => {
    await replacePayload(
      apiRequest<BootstrapPayload>(
        `/api/bootstrap?lens=${encodeURIComponent(lens)}${
          refreshToday ? "&refreshToday=1" : ""
        }`
      )
    );
  }, [payload.state.activeLens, replacePayload]);

  const refreshTodayPlan = useCallback(async (lens = payload.state.activeLens) => {
    await refreshBootstrap(lens, true);
  }, [payload.state.activeLens, refreshBootstrap]);

  const createTask = useCallback(async (title: string, source: TaskSource = "manual") => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: trimmed,
          source
        })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const createVoiceCapture = useCallback(async () => {
    await replacePayload(
      apiRequest<BootstrapPayload>("/api/inbox/voice", {
        method: "POST",
        body: JSON.stringify({
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const setTaskStatus = useCallback(async (taskId: string, status: Task["status"]) => {
    await replacePayload(
      apiRequest<BootstrapPayload>(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const createSubtask = useCallback(async (taskId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({
          title: trimmed
        })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          lens: payload.state.activeLens
        })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask, payload.state.activeLens]);

  const setSubtaskAsNextAction = useCallback(async (taskId: string, subtaskId: string) => {
    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "set_next_action"
        })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const updateSubtask = useCallback(async (
    taskId: string,
    subtaskId: string,
    title: string
  ) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: trimmed,
          lens: payload.state.activeLens
        })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask, payload.state.activeLens]);

  const addComment = useCallback(async (taskId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;

    await replacePayload(
      apiRequest<BootstrapPayload>(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body: trimmed,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const loadTaskChat = useCallback(async (taskId: string) => {
    const result = await apiRequest<{ chat: TaskChat }>(`/api/tasks/${taskId}/chat`);
    mergeTaskChat(result.chat);
  }, [mergeTaskChat]);

  const sendTaskChatMessage = useCallback(async (taskId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;

    const optimisticMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user" as const,
      body: trimmed,
      createdAt: new Date().toISOString()
    };

    startTransition(() => {
      setTaskChats((current) => {
        const existing = current[taskId] ?? {
          taskId,
          conversationId: null,
          resetCount: 0,
          createdAt: null,
          updatedAt: null,
          messages: [],
          draft: null
        };

        return {
          ...current,
          [taskId]: {
            ...existing,
            messages: [...existing.messages, optimisticMessage]
          }
        };
      });
    });

    setAiOperation({
      taskId,
      type: "chat_send"
    });
    setIsSaving(true);

    try {
      const result = await apiRequest<{ chat: TaskChat }>(`/api/tasks/${taskId}/chat`, {
        method: "POST",
        body: JSON.stringify({
          body: trimmed
        })
      });
      mergeTaskChat(result.chat);
    } catch (error) {
      startTransition(() => {
        setTaskChats((current) => {
          const existing = current[taskId];
          if (!existing) {
            return current;
          }

          return {
            ...current,
            [taskId]: {
              ...existing,
              messages: existing.messages.filter((message) => message.id !== optimisticMessage.id)
            }
          };
        });
      });
      throw error;
    } finally {
      setIsSaving(false);
      setAiOperation({
        taskId: null,
        type: null
      });
    }
  }, [mergeTaskChat]);

  const generateTaskChatDraft = useCallback(async (taskId: string) => {
    setAiOperation({
      taskId,
      type: "chat_convert"
    });
    setIsSaving(true);

    try {
      const result = await apiRequest<{ chat: TaskChat }>(`/api/tasks/${taskId}/chat/convert`, {
        method: "POST",
        body: JSON.stringify({})
      });
      mergeTaskChat(result.chat);
    } finally {
      setIsSaving(false);
      setAiOperation({
        taskId: null,
        type: null
      });
    }
  }, [mergeTaskChat]);

  const resetTaskChat = useCallback(async (taskId: string) => {
    setAiOperation({
      taskId,
      type: "chat_reset"
    });
    setIsSaving(true);

    try {
      const result = await apiRequest<{ chat: TaskChat }>(`/api/tasks/${taskId}/chat/reset`, {
        method: "POST",
        body: JSON.stringify({})
      });
      mergeTaskChat(result.chat);
    } finally {
      setIsSaving(false);
      setAiOperation({
        taskId: null,
        type: null
      });
    }
  }, [mergeTaskChat]);

  const dismissTaskChatDraft = useCallback(async (taskId: string) => {
    setAiOperation({
      taskId,
      type: "chat_dismiss_draft"
    });
    setIsSaving(true);

    try {
      const result = await apiRequest<{ chat: TaskChat }>(`/api/tasks/${taskId}/chat/draft`, {
        method: "DELETE"
      });
      mergeTaskChat(result.chat);
    } finally {
      setIsSaving(false);
      setAiOperation({
        taskId: null,
        type: null
      });
    }
  }, [mergeTaskChat]);

  const applyTaskChatDraft = useCallback(async (
    taskId: string,
    action: "next_action" | "description" | "note" | "subtask" | "tag",
    itemId?: string
  ) => {
    setAiOperation({
      taskId,
      type: "chat_apply"
    });
    setIsSaving(true);

    try {
      const result = await apiRequest<{ chat: TaskChat; task: Task }>(`/api/tasks/${taskId}/chat/apply`, {
        method: "POST",
        body: JSON.stringify({
          action,
          itemId
        })
      });
      mergeTask(result.task);
      mergeTaskChat(result.chat);
    } finally {
      setIsSaving(false);
      setAiOperation({
        taskId: null,
        type: null
      });
    }
  }, [mergeTask, mergeTaskChat]);

  const generateTaskDescription = useCallback(async (taskId: string) => {
    setAiOperation({
      taskId,
      type: "describe"
    });
    setIsSaving(true);

    try {
      const result = await apiRequest<BootstrapPayload>(`/api/tasks/${taskId}/description`, {
        method: "POST",
        body: JSON.stringify({
          lens: payload.state.activeLens
        })
      });
      startTransition(() => {
        setPayload(result);
      });
    } finally {
      setIsSaving(false);
      setAiOperation({
        taskId: null,
        type: null
      });
    }
  }, [payload.state.activeLens]);

  const analyzeTask = useCallback(async (taskId: string) => {
    setAiOperation({
      taskId,
      type: "analyze"
    });
    setIsSaving(true);

    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/analysis`, {
        method: "POST",
        body: JSON.stringify({})
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
      setAiOperation({
        taskId: null,
        type: null
      });
    }
  }, [mergeTask]);

  const applyTaskAnalysis = useCallback(async (
    taskId: string,
    action: "task_next_action" | "next_step" | "suggested_note" | "improved_task",
    itemId?: string
  ) => {
    setAiOperation({
      taskId,
      type: "apply"
    });
    setIsSaving(true);

    try {
      await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/analysis/apply`, {
        method: "POST",
        body: JSON.stringify({
          action,
          itemId
        })
      });
      await refreshBootstrap();
    } finally {
      setIsSaving(false);
      setAiOperation({
        taskId: null,
        type: null
      });
    }
  }, [refreshBootstrap]);

  const applySuggestion = useCallback(async (taskId: string, suggestionId: string) => {
    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(
        `/api/tasks/${taskId}/suggestions/${suggestionId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            action: "accept"
          })
        }
      );
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const ignoreSuggestion = useCallback(async (taskId: string, suggestionId: string) => {
    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(
        `/api/tasks/${taskId}/suggestions/${suggestionId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            action: "ignore"
          })
        }
      );
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const setLens = useCallback(async (lens: TodayLens) => {
    await refreshTodayPlan(lens);
  }, [refreshTodayPlan]);

  const addTodayFeedback = useCallback(async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;

    await replacePayload(
      apiRequest<BootstrapPayload>("/api/today", {
        method: "POST",
        body: JSON.stringify({
          action: "feedback",
          body: trimmed,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const dismissFromToday = useCallback(async (taskId: string) => {
    await replacePayload(
      apiRequest<BootstrapPayload>("/api/today", {
        method: "POST",
        body: JSON.stringify({
          action: "dismiss",
          taskId,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const importSampleTasks = useCallback(async () => {
    await replacePayload(
      apiRequest<BootstrapPayload>("/api/imports/sample", {
        method: "POST",
        body: JSON.stringify({
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const toggleGithubConnected = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await apiRequest<{ connected: boolean }>("/api/github", {
        method: "POST",
        body: JSON.stringify({
          action: "toggle"
        })
      });
      patchPayload((current) => ({
        ...current,
        state: {
          ...current.state,
          githubConnected: result.connected
        },
        integrations: {
          ...current.integrations,
          github: {
            ...current.integrations.github,
            connected: result.connected
          }
        }
      }));
    } finally {
      setIsSaving(false);
    }
  }, [patchPayload]);

  const syncGithubIssues = useCallback(async () => {
    await replacePayload(
      apiRequest<BootstrapPayload>("/api/github", {
        method: "POST",
        body: JSON.stringify({
          action: "sync",
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const addGitHubRepository = useCallback(async (owner: string, repo: string) => {
    if (!owner.trim() || !repo.trim()) return;

    setIsSaving(true);
    try {
      const result = await apiRequest<{ repository: AppState["githubRepositories"][number] }>(
        "/api/github/repositories",
        {
          method: "POST",
          body: JSON.stringify({
            owner: owner.trim(),
            repo: repo.trim()
          })
        }
      );

      patchPayload((current) => ({
        ...current,
        state: {
          ...current.state,
          githubRepositories: [...current.state.githubRepositories, result.repository]
        },
        integrations: {
          ...current.integrations,
          github: {
            ...current.integrations.github,
            repositories: [...current.integrations.github.repositories, result.repository.label]
          }
        }
      }));
    } finally {
      setIsSaving(false);
    }
  }, [patchPayload]);

  const createGitHubIssueForTask = useCallback(async (taskId: string, repositoryId: string) => {
    setIsSaving(true);
    try {
      await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/github`, {
        method: "POST",
        body: JSON.stringify({
          repositoryId
        })
      });
      await refreshBootstrap();
    } finally {
      setIsSaving(false);
    }
  }, [refreshBootstrap]);

  const createArea = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    await replacePayload(
      apiRequest<BootstrapPayload>("/api/areas", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const createList = useCallback(async (areaId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    await replacePayload(
      apiRequest<BootstrapPayload>("/api/lists", {
        method: "POST",
        body: JSON.stringify({
          areaId,
          name: trimmed,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const createTag = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    await replacePayload(
      apiRequest<BootstrapPayload>("/api/tags", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const deleteArea = useCallback(async (areaId: string) => {
    await replacePayload(
      apiRequest<BootstrapPayload>(
        `/api/areas/${areaId}?lens=${encodeURIComponent(payload.state.activeLens)}`,
        {
          method: "DELETE"
        }
      )
    );
  }, [payload.state.activeLens, replacePayload]);

  const deleteList = useCallback(async (listId: string) => {
    await replacePayload(
      apiRequest<BootstrapPayload>(
        `/api/lists/${listId}?lens=${encodeURIComponent(payload.state.activeLens)}`,
        {
          method: "DELETE"
        }
      )
    );
  }, [payload.state.activeLens, replacePayload]);

  const updateTaskPlacement = useCallback(async (
    taskId: string,
    areaId: string | null,
    listId: string | null
  ) => {
    await replacePayload(
      apiRequest<BootstrapPayload>(`/api/tasks/${taskId}/placement`, {
        method: "PATCH",
        body: JSON.stringify({
          areaId,
          listId,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const updateTask = useCallback(async (input: {
    taskId: string;
    title: string;
    description: string;
    nextAction: string;
    areaId: string | null;
    listId: string | null;
    tagIds: string[];
  }) => {
    await replacePayload(
      apiRequest<BootstrapPayload>(`/api/tasks/${input.taskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...input,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const deleteTask = useCallback(async (taskId: string) => {
    setIsSaving(true);
    try {
      await apiRequest<{ taskId: string }>(`/api/tasks/${taskId}`, {
        method: "DELETE"
      });
      patchPayload((current) => ({
        ...current,
        state: {
          ...current.state,
          tasks: current.state.tasks.filter((task) => task.id !== taskId),
          dismissedToday: current.state.dismissedToday.filter((id) => id !== taskId)
        },
        todayPlan: {
          ...current.todayPlan,
          items: current.todayPlan.items.filter((item) => item.taskId !== taskId)
        }
      }));
    } finally {
      setIsSaving(false);
    }
  }, [patchPayload]);

  const fileTaskFromInbox = useCallback(async (
    taskId: string,
    areaId: string | null,
    listId: string | null
  ) => {
    await replacePayload(
      apiRequest<BootstrapPayload>(`/api/tasks/${taskId}/file`, {
        method: "POST",
        body: JSON.stringify({
          areaId,
          listId,
          lens: payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const updatePreferences = useCallback(async (
    key: keyof AppState["preferences"],
    value: number | TodayLens
  ) => {
    await replacePayload(
      apiRequest<BootstrapPayload>("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          key,
          value,
          lens: key === "defaultLens" ? (value as TodayLens) : payload.state.activeLens
        })
      })
    );
  }, [payload.state.activeLens, replacePayload]);

  const getAreaName = useCallback((areaId: string | null) => {
    if (!areaId) return "Inbox";
    return payload.state.areas.find((entry) => entry.id === areaId)?.name ?? "Unassigned";
  }, [payload.state.areas]);

  const getListName = useCallback((listId: string | null) => {
    if (!listId) return "No list";
    return payload.state.lists.find((entry) => entry.id === listId)?.name ?? "No list";
  }, [payload.state.lists]);

  const getTagNames = useCallback((tagIds: string[]) => {
    return tagIds
      .map((tagId) => payload.state.tags.find((entry) => entry.id === tagId)?.name)
      .filter(Boolean) as string[];
  }, [payload.state.tags]);

  const dataValue = useMemo<AppDataContextValue>(() => ({
    state: payload.state,
    todayPlan: payload.todayPlan,
    integrations: payload.integrations,
    taskChats,
    getAreaName,
    getListName,
    getTagNames
  }), [getAreaName, getListName, getTagNames, payload, taskChats]);

  const uiValue = useMemo<AppUiContextValue>(() => ({
    isSaving,
    aiOperation
  }), [aiOperation, isSaving]);

  const actionsValue = useMemo<AppActionsContextValue>(() => ({
    createTask,
    createVoiceCapture,
    setTaskStatus,
    createSubtask,
    setSubtaskAsNextAction,
    toggleSubtask,
    updateSubtask,
    addComment,
    loadTaskChat,
    sendTaskChatMessage,
    generateTaskChatDraft,
    resetTaskChat,
    dismissTaskChatDraft,
    applyTaskChatDraft,
    generateTaskDescription,
    analyzeTask,
    applyTaskAnalysis,
    applySuggestion,
    ignoreSuggestion,
    setLens,
    addTodayFeedback,
    dismissFromToday,
    importSampleTasks,
    toggleGithubConnected,
    syncGithubIssues,
    addGitHubRepository,
    createGitHubIssueForTask,
    createArea,
    createList,
    createTag,
    deleteArea,
    deleteList,
    updateTaskPlacement,
    updateTask,
    deleteTask,
    fileTaskFromInbox,
    updatePreferences,
    refresh: refreshTodayPlan
  }), [
    addComment,
    addGitHubRepository,
    addTodayFeedback,
    applyTaskChatDraft,
    generateTaskDescription,
    analyzeTask,
    applySuggestion,
    applyTaskAnalysis,
    createArea,
    createGitHubIssueForTask,
    createList,
    createTag,
    deleteArea,
    deleteList,
    createTask,
    createVoiceCapture,
    createSubtask,
    dismissTaskChatDraft,
    generateTaskChatDraft,
    loadTaskChat,
    setSubtaskAsNextAction,
    deleteTask,
    dismissFromToday,
    fileTaskFromInbox,
    ignoreSuggestion,
    importSampleTasks,
    refreshTodayPlan,
    setLens,
    setTaskStatus,
    sendTaskChatMessage,
    syncGithubIssues,
    toggleGithubConnected,
    toggleSubtask,
    updateSubtask,
    updatePreferences,
    updateTask,
    updateTaskPlacement,
    resetTaskChat
  ]);

  return (
    <AppActionsContext.Provider value={actionsValue}>
      <AppUiContext.Provider value={uiValue}>
        <AppDataContext.Provider value={dataValue}>{children}</AppDataContext.Provider>
      </AppUiContext.Provider>
    </AppActionsContext.Provider>
  );
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used within AppStateProvider");
  return value;
}

export function useAppUiState() {
  const value = useContext(AppUiContext);
  if (!value) throw new Error("useAppUiState must be used within AppStateProvider");
  return value;
}

export function useAppActions() {
  const value = useContext(AppActionsContext);
  if (!value) throw new Error("useAppActions must be used within AppStateProvider");
  return value;
}

export function useAppState() {
  const data = useAppData();
  const ui = useAppUiState();
  const actions = useAppActions();

  return useMemo<AppContextValue>(() => ({
    ...data,
    ...ui,
    ...actions
  }), [actions, data, ui]);
}
