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
  Task,
  TaskSource,
  TodayLens,
  TodayPlan
} from "@/lib/types";

interface AppDataContextValue {
  state: AppState;
  todayPlan: TodayPlan;
  integrations: IntegrationStatus;
  getAreaName: (areaId: string | null) => string;
  getListName: (listId: string | null) => string;
  getTagNames: (tagIds: string[]) => string[];
}

interface AppUiContextValue {
  isSaving: boolean;
  aiOperation: {
    taskId: string | null;
    type: "analyze" | "apply" | null;
  };
}

interface AppActionsContextValue {
  createTask: (title: string, source?: TaskSource) => Promise<void>;
  createVoiceCapture: () => Promise<void>;
  setTaskStatus: (taskId: string, status: Task["status"]) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<void>;
  analyzeTask: (taskId: string) => Promise<void>;
  applyTaskAnalysis: (
    taskId: string,
    action: "next_step" | "suggested_note" | "improved_task",
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
  updateTaskPlacement: (
    taskId: string,
    areaId: string | null,
    listId: string | null
  ) => Promise<void>;
  updateTask: (input: {
    taskId: string;
    title: string;
    description: string;
    areaId: string | null;
    listId: string | null;
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
  const [isSaving, setIsSaving] = useState(false);
  const [aiOperation, setAiOperation] = useState<{
    taskId: string | null;
    type: "analyze" | "apply" | null;
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

  const refreshForLens = useCallback(async (lens = payload.state.activeLens) => {
    await replacePayload(
      apiRequest<BootstrapPayload>(`/api/bootstrap?lens=${encodeURIComponent(lens)}`)
    );
  }, [payload.state.activeLens, replacePayload]);

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
    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(
        `/api/tasks/${taskId}/subtasks/${subtaskId}`,
        {
          method: "PATCH",
          body: JSON.stringify({})
        }
      );
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const addComment = useCallback(async (taskId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body: trimmed
        })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

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
    action: "next_step" | "suggested_note" | "improved_task",
    itemId?: string
  ) => {
    setAiOperation({
      taskId,
      type: "apply"
    });
    setIsSaving(true);

    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/analysis/apply`, {
        method: "POST",
        body: JSON.stringify({
          action,
          itemId
        })
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
    await refreshForLens(lens);
  }, [refreshForLens]);

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
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/github`, {
        method: "POST",
        body: JSON.stringify({
          repositoryId
        })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const createArea = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const result = await apiRequest<{ area: AppState["areas"][number] }>("/api/areas", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed
        })
      });
      patchPayload((current) => ({
        ...current,
        state: {
          ...current.state,
          areas: [...current.state.areas, result.area]
        }
      }));
    } finally {
      setIsSaving(false);
    }
  }, [patchPayload]);

  const createList = useCallback(async (areaId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const result = await apiRequest<{ list: AppState["lists"][number] }>("/api/lists", {
        method: "POST",
        body: JSON.stringify({
          areaId,
          name: trimmed
        })
      });
      patchPayload((current) => ({
        ...current,
        state: {
          ...current.state,
          lists: [...current.state.lists, result.list]
        }
      }));
    } finally {
      setIsSaving(false);
    }
  }, [patchPayload]);

  const updateTaskPlacement = useCallback(async (
    taskId: string,
    areaId: string | null,
    listId: string | null
  ) => {
    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/placement`, {
        method: "PATCH",
        body: JSON.stringify({
          areaId,
          listId
        })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const updateTask = useCallback(async (input: {
    taskId: string;
    title: string;
    description: string;
    areaId: string | null;
    listId: string | null;
  }) => {
    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${input.taskId}`, {
        method: "PATCH",
        body: JSON.stringify(input)
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

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
    setIsSaving(true);
    try {
      const result = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}/file`, {
        method: "POST",
        body: JSON.stringify({
          areaId,
          listId
        })
      });
      mergeTask(result.task);
    } finally {
      setIsSaving(false);
    }
  }, [mergeTask]);

  const updatePreferences = useCallback(async (
    key: keyof AppState["preferences"],
    value: number | TodayLens
  ) => {
    setIsSaving(true);
    try {
      const result = await apiRequest<{ preferences: AppState["preferences"] }>("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          key,
          value
        })
      });

      patchPayload((current) => ({
        ...current,
        state: {
          ...current.state,
          preferences: result.preferences
        }
      }));

      if (key === "defaultLens") {
        await refreshForLens(value as TodayLens);
      }
    } finally {
      setIsSaving(false);
    }
  }, [patchPayload, refreshForLens]);

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
    getAreaName,
    getListName,
    getTagNames
  }), [getAreaName, getListName, getTagNames, payload]);

  const uiValue = useMemo<AppUiContextValue>(() => ({
    isSaving,
    aiOperation
  }), [aiOperation, isSaving]);

  const actionsValue = useMemo<AppActionsContextValue>(() => ({
    createTask,
    createVoiceCapture,
    setTaskStatus,
    toggleSubtask,
    addComment,
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
    updateTaskPlacement,
    updateTask,
    deleteTask,
    fileTaskFromInbox,
    updatePreferences,
    refresh: refreshForLens
  }), [
    addComment,
    addGitHubRepository,
    addTodayFeedback,
    analyzeTask,
    applySuggestion,
    applyTaskAnalysis,
    createArea,
    createGitHubIssueForTask,
    createList,
    createTask,
    createVoiceCapture,
    deleteTask,
    dismissFromToday,
    fileTaskFromInbox,
    ignoreSuggestion,
    importSampleTasks,
    refreshForLens,
    setLens,
    setTaskStatus,
    syncGithubIssues,
    toggleGithubConnected,
    toggleSubtask,
    updatePreferences,
    updateTask,
    updateTaskPlacement
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
