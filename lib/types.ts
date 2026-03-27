export type TodayLens =
  | "balanced"
  | "revenue"
  | "unblock"
  | "strategic"
  | "admin";

export type TaskStatus = "open" | "waiting_on" | "done";

export type TaskSource = "manual" | "import" | "github" | "voice";

export type SuggestionState = "suggested" | "accepted" | "ignored";
export type AnalysisFreshness =
  | "never_analyzed"
  | "fresh"
  | "ready_for_refresh"
  | "waiting_for_activity";

export interface Area {
  id: string;
  name: string;
  description: string;
}

export interface TaskList {
  id: string;
  areaId: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
  tone?: "accent" | "warm" | "neutral" | "success";
}

export interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
}

export interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  type: "note" | "update" | "feedback";
}

export interface TaskActivity {
  id: string;
  body: string;
  createdAt: string;
}

export interface TaskChatDraftNote {
  id: string;
  body: string;
  applied: boolean;
}

export interface TaskChatDraftSubtask {
  id: string;
  title: string;
  applied: boolean;
}

export interface TaskChatDraftTag {
  id: string;
  tagId: string;
  name: string;
  applied: boolean;
}

export interface TaskChatDraftField {
  value: string;
  applied: boolean;
}

export interface TaskChatDraft {
  summary: string;
  nextAction: TaskChatDraftField | null;
  description: TaskChatDraftField | null;
  notes: TaskChatDraftNote[];
  subtasks: TaskChatDraftSubtask[];
  tags: TaskChatDraftTag[];
  generatedAt: string | null;
}

export interface TaskChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  body: string;
  createdAt: string;
}

export interface TaskChat {
  taskId: string;
  conversationId: string | null;
  resetCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  messages: TaskChatMessage[];
  draft: TaskChatDraft | null;
}

export interface TaskAnalysisNextStep {
  id: string;
  title: string;
  why: string;
  confidence: "low" | "medium" | "high";
  applied: boolean;
}

export interface TaskAnalysisNote {
  id: string;
  body: string;
  applied: boolean;
}

export interface TaskAnalysisQuestion {
  id: string;
  question: string;
  why: string;
}

export interface TaskAnalysisResult {
  summary: string;
  recommendedNextAction: {
    value: string;
    applied: boolean;
  } | null;
  improvedTask: {
    title: string;
    description: string;
    applied: boolean;
  } | null;
  gaps: string[];
  blockers: string[];
  nextSteps: TaskAnalysisNextStep[];
  suggestedNotes: TaskAnalysisNote[];
  clarifyingQuestions: TaskAnalysisQuestion[];
  shouldReanalyzeAfterUserAction: boolean;
}

export interface TaskAnalysisState {
  freshness: AnalysisFreshness;
  isEligible: boolean;
  lastAnalyzedAt: string | null;
  lastUserActivityAt: string | null;
  latest: TaskAnalysisResult | null;
  lastRunSource: "ai" | "fallback" | null;
  lastRunMessage: string | null;
}

export interface TodayTaskAnalysisDimensions {
  revenue: number;
  unblock: number;
  strategic: number;
  admin: number;
  quick_win: number;
  deep_work: number;
  urgency: number;
  complexity: number;
  confidence: number;
}

export interface TodayTaskAnalysisRationale {
  revenue: string;
  unblock: string;
  strategic: string;
  admin: string;
  quick_win: string;
  deep_work: string;
  urgency: string;
  complexity: string;
}

export interface TodayTaskAnalysis {
  summary: string;
  dimensions: TodayTaskAnalysisDimensions;
  rationale: TodayTaskAnalysisRationale;
  analyzedAt: string;
  source: "ai" | "fallback";
  version: number;
}

export interface GitHubLink {
  repositoryId?: string;
  repository: string;
  issueNumber: number;
  title: string;
  state: "open" | "closed";
  url: string;
  updatedAt: string;
}

export interface GitHubRepositoryOption {
  id: string;
  owner: string;
  repo: string;
  label: string;
}

export interface TaskSuggestion {
  id: string;
  label: string;
  value: string;
  field: "title" | "areaId" | "listId" | "tagId" | "nextStep";
  state: SuggestionState;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  nextAction: string;
  nextActionSubtaskId: string | null;
  status: TaskStatus;
  source: TaskSource;
  areaId: string | null;
  listId: string | null;
  tagIds: string[];
  isInbox: boolean;
  dueDate: string | null;
  deferUntil: string | null;
  recurrenceLabel: string | null;
  waitingReason: string | null;
  waitingSince: string | null;
  githubLink: GitHubLink | null;
  subtasks: Subtask[];
  comments: TaskComment[];
  activity: TaskActivity[];
  suggestions: TaskSuggestion[];
  analysis: TaskAnalysisState;
  todayAnalysis: TodayTaskAnalysis | null;
  completedAt: string | null;
  lastWorkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Preferences {
  defaultLens: TodayLens;
  quickWinsPreference: number;
  deepWorkPreference: number;
  revenueWeight: number;
  unblockWeight: number;
  strategicWeight: number;
  adminWeight: number;
}

export interface TodayFeedbackMessage {
  id: string;
  body: string;
  lens: TodayLens;
  createdAt: string;
}

export interface TodayPlanItem {
  taskId: string;
  groupKey: "highest_leverage" | "quick_wins" | "waiting_follow_up";
  reason: string;
  score: number;
  scoreBreakdown: {
    weightedSignals: Record<string, number>;
    deterministicModifiers: Record<string, number>;
    confidenceMultiplier: number;
  };
  analysisGeneratedAt: string | null;
  analysisSource: "ai" | "fallback" | null;
}

export interface TodayPlan {
  lens: TodayLens;
  briefing: string;
  items: TodayPlanItem[];
}

export interface IntegrationStatus {
  database: {
    provider: "sqlite";
    ready: boolean;
  };
  openAi: {
    configured: boolean;
    classifyModel: string;
    todayModel: string;
    transcriptionModel: string;
  };
  github: {
    configured: boolean;
    connected: boolean;
    repositories: string[];
  };
}

export interface AppState {
  areas: Area[];
  lists: TaskList[];
  tags: Tag[];
  tasks: Task[];
  preferences: Preferences;
  activeLens: TodayLens;
  todayFeedback: TodayFeedbackMessage[];
  dismissedToday: string[];
  githubConnected: boolean;
  githubRepositories: GitHubRepositoryOption[];
  importHistory: string[];
}

export interface BootstrapPayload {
  state: AppState;
  todayPlan: TodayPlan;
  integrations: IntegrationStatus;
}
