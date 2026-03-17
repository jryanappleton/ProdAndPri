import { AppState, Preferences, Task, TodayLens } from "@/lib/types";

const now = new Date("2026-03-15T09:00:00.000Z");

function isoPlusDays(days: number) {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function createTask(task: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    description: "",
    status: "open",
    source: "manual",
    areaId: null,
    listId: null,
    tagIds: [],
    isInbox: false,
    dueDate: null,
    deferUntil: null,
    recurrenceLabel: null,
    waitingReason: null,
    waitingSince: null,
    githubLink: null,
    subtasks: [],
    comments: [],
    activity: [],
    suggestions: [],
    analysis: {
      freshness: "never_analyzed",
      isEligible: true,
      lastAnalyzedAt: null,
      lastUserActivityAt: null,
      latest: null,
      lastRunSource: null,
      lastRunMessage: null
    },
    completedAt: null,
    lastWorkedAt: isoPlusDays(-1),
    createdAt: isoPlusDays(-10),
    updatedAt: isoPlusDays(-1),
    ...task
  };
}

export const defaultPreferences: Preferences = {
  defaultLens: "balanced",
  quickWinsPreference: 60,
  deepWorkPreference: 70,
  revenueWeight: 65,
  unblockWeight: 60,
  strategicWeight: 70,
  adminWeight: 45
};

export const initialState: AppState = {
  areas: [
    { id: "area-lt", name: "Lazy Tiger", description: "Hospitality and occupancy." },
    { id: "area-pw", name: "Patchwork", description: "Software product and engineering." },
    { id: "area-hu", name: "HeadsUp", description: "Growth, content, and outreach." },
    { id: "area-pa", name: "Personal Admin", description: "Life logistics and admin." }
  ],
  lists: [
    { id: "list-lt-ops", areaId: "area-lt", name: "Hostel Next Ups" },
    { id: "list-lt-rev", areaId: "area-lt", name: "Occupancy Growth" },
    { id: "list-pw-prod", areaId: "area-pw", name: "Core Product" },
    { id: "list-pw-eng", areaId: "area-pw", name: "Engineering" },
    { id: "list-hu-content", areaId: "area-hu", name: "Content / Social" },
    { id: "list-pa-admin", areaId: "area-pa", name: "Admin Cleanup" }
  ],
  tags: [
    { id: "tag-revenue", name: "Revenue", tone: "accent" },
    { id: "tag-strategic", name: "Strategic", tone: "neutral" },
    { id: "tag-followup", name: "Follow-Up", tone: "warm" },
    { id: "tag-deep", name: "Deep Work", tone: "neutral" },
    { id: "tag-quick", name: "Quick Win", tone: "success" },
    { id: "tag-github", name: "GitHub", tone: "accent" }
  ],
  tasks: [
    createTask({
      id: "task-1",
      title: "Finalize occupancy pricing test for next weekend",
      description: "Review current booking velocity and update the pricing plan.",
      areaId: "area-lt",
      listId: "list-lt-rev",
      tagIds: ["tag-revenue", "tag-strategic"],
      dueDate: isoPlusDays(1),
      comments: [
        {
          id: "c1",
          body: "Need the new rates approved before Thursday.",
          createdAt: isoPlusDays(-2),
          type: "note"
        }
      ],
      activity: [
        {
          id: "a1",
          body: "Updated booking assumptions after last weekend's occupancy review.",
          createdAt: isoPlusDays(-1)
        }
      ]
    }),
    createTask({
      id: "task-2",
      title: "Ship Today view hierarchy polish",
      description: "Refine grouping, reason labels, and recommendation card spacing.",
      areaId: "area-pw",
      listId: "list-pw-prod",
      tagIds: ["tag-strategic", "tag-deep", "tag-github"],
      githubLink: {
        repository: "jryan/prodandpri",
        issueNumber: 17,
        title: "Polish Today view information hierarchy",
        state: "open",
        url: "https://github.com/jryan/prodandpri/issues/17",
        updatedAt: isoPlusDays(-1)
      },
      subtasks: [
        { id: "s21", title: "Tighten card metadata spacing", isDone: true },
        { id: "s22", title: "Improve reason badge styling", isDone: false },
        { id: "s23", title: "Tune group section typography", isDone: false }
      ]
    }),
    createTask({
      id: "task-3",
      title: "Follow up with contractor on laundry room quote",
      description: "Need a revised estimate and timeline before approving.",
      status: "waiting_on",
      areaId: "area-lt",
      listId: "list-lt-ops",
      tagIds: ["tag-followup"],
      waitingReason: "Awaiting revised quote from contractor",
      waitingSince: isoPlusDays(-4)
    }),
    createTask({
      id: "task-4",
      title: "Outline onboarding checklist for imported GitHub issues",
      description: "Decide how imported issues should be categorized during setup.",
      areaId: "area-pw",
      listId: "list-pw-eng",
      tagIds: ["tag-strategic"],
      lastWorkedAt: isoPlusDays(-8)
    }),
    createTask({
      id: "task-5",
      title: "Post March occupancy reel",
      description: "Cut a quick social clip using the latest booking screenshots.",
      areaId: "area-hu",
      listId: "list-hu-content",
      tagIds: ["tag-quick", "tag-revenue"],
      dueDate: isoPlusDays(0)
    }),
    createTask({
      id: "task-6",
      title: "Reconcile business card charges",
      description: "Quick admin cleanup before the next bookkeeping pass.",
      areaId: "area-pa",
      listId: "list-pa-admin",
      tagIds: ["tag-quick"],
      recurrenceLabel: "Monthly on the 15th"
    }),
    createTask({
      id: "task-7",
      title: "Plan Q2 product narrative",
      description: "Clarify the positioning story across Today, hierarchy, and AI guidance.",
      areaId: "area-pw",
      listId: "list-pw-prod",
      tagIds: ["tag-strategic", "tag-deep"],
      lastWorkedAt: isoPlusDays(-5)
    }),
    createTask({
      id: "task-8",
      title: "Email accountant about missing 1099 copy",
      description: "Need a clean copy before filing.",
      areaId: "area-pa",
      listId: "list-pa-admin",
      tagIds: ["tag-followup", "tag-quick"],
      status: "done",
      completedAt: isoPlusDays(-2)
    }),
    createTask({
      id: "task-9",
      title: "Figure out voice capture workflow for random ideas",
      description: "Messy capture item from a walk. Needs classification and a next step.",
      isInbox: true,
      source: "voice",
      suggestions: [
        {
          id: "sg91",
          label: "Suggested area",
          value: "Patchwork",
          field: "areaId",
          state: "suggested"
        },
        {
          id: "sg92",
          label: "Suggested title",
          value: "Draft voice capture workflow for random ideas",
          field: "title",
          state: "suggested"
        },
        {
          id: "sg93",
          label: "Suggested tag",
          value: "Strategic",
          field: "tagId",
          state: "suggested"
        }
      ]
    }),
    createTask({
      id: "task-10",
      title: "Review imported tasks for duplicates",
      description: "Sanity-check imported tasks before moving them into the main system.",
      isInbox: true,
      source: "import",
      suggestions: [
        {
          id: "sg101",
          label: "Suggested area",
          value: "Personal Admin",
          field: "areaId",
          state: "suggested"
        }
      ]
    })
  ],
  preferences: defaultPreferences,
  activeLens: "balanced",
  todayFeedback: [
    {
      id: "f1",
      body: "Need a mix of leverage and a couple of quick wins this morning.",
      lens: "balanced" satisfies TodayLens,
      createdAt: now.toISOString()
    }
  ],
  dismissedToday: [],
  githubConnected: true,
  githubRepositories: [
    {
      id: "repo-1",
      owner: "jryan",
      repo: "prodandpri",
      label: "jryan/prodandpri"
    }
  ],
  importHistory: ["Imported 14 tasks from CSV and merged 3 likely duplicates."]
};
