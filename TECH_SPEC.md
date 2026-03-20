# V1 Architecture and Technical Specification

## 1. Purpose

This document translates the PRD into an implementation-ready technical design for a single-user AI productivity and execution app. It is intentionally concrete enough that an engineering agent can begin building the system without needing to invent major architectural decisions.

Where the PRD leaves room for interpretation, this spec makes a default choice and calls it out explicitly.

V1 is intentionally split into two delivery steps:

- `v1.1`: fully functional frontend with realistic stubbed backend and API responses
- `v1.2`: real backend, database, integrations, and AI functionality wired into the approved frontend

Current status:

- `v1.1` is complete
- the app now runs on a real local `v1.2` stack with Prisma, SQLite, API routes, persisted task state, OpenAI integration boundaries, and GitHub token-based integration
- some originally planned `v1.2` items remain intentionally lightweight in the current implementation, especially import depth, background jobs, and voice capture

## 2. Product Scope Translation

### In scope for V1

- single-user task management application
- hierarchy: workspace -> area -> list -> task -> subtask
- task comments / notes
- tags
- Today view with AI-generated briefing and recommendations
- All Tasks view with search, filtering, editing, and hierarchy browsing
- text capture
- voice capture with transcription
- AI-assisted categorization, clarification, subtask suggestions, next-step suggestions
- statuses: Open, Waiting On, Done
- optional due dates
- recurring tasks
- one-time import from an external task source
- lightweight GitHub integration
- settings that influence prioritization

### Delivery split

#### `v1.1` frontend-first validation release

- all primary screens implemented
- realistic seeded data and hierarchy browsing
- frontend interactions fully working from the user's perspective
- stubbed server actions / API responses with stable contracts
- no real persistence, AI, transcription, import processing, or GitHub sync required

#### `v1.2` full implementation release

- replace stubbed data flows with real backend persistence
- add database, jobs, and domain services
- wire real AI, voice transcription, import, and GitHub integration
- preserve `v1.1` UX shape unless intentionally revised

#### Current implemented `v1.2` baseline

- Prisma-backed persistence is live
- local development uses SQLite via `DATABASE_URL="file:./dev.db"`
- API routes and shared server services back all major UI flows
- OpenAI-backed classification / Today generation boundaries exist with deterministic fallbacks
- GitHub PAT integration is live for repository discovery, repository selection, issue creation from task detail, and issue sync into tasks
- the workspace now starts empty rather than seeded with demo tasks

### Explicitly out of scope for V1

- multi-user support
- authentication and permissions
- attachments
- team workflows
- full conversational assistant
- advanced analytics
- weekly review workflow

## 3. Recommended System Shape

### Architecture choice

Build the product as a single-tenant web app with a staged implementation path:

- frontend: Next.js with App Router and TypeScript
- `v1.1` backend shape: mock server actions / route handlers returning seeded contract-shaped data
- current backend shape: Next.js route handlers backed by real services
- current database: SQLite via Prisma
- target future database upgrade: PostgreSQL if and when the app outgrows SQLite
- AI provider: OpenAI API with deterministic fallbacks
- speech-to-text boundary: OpenAI transcription API
- GitHub integration: GitHub REST API

### Why this shape

- It allows the product feel, navigation, and hierarchy to be validated before committing to backend complexity.
- It keeps product and platform complexity low.
- It supports AI, import, and sync workflows without introducing a separate backend service too early.
- SQLite keeps local development reliable and simple while preserving a clean upgrade path to PostgreSQL later.
- The current service boundaries already separate UI contracts from persistence and integrations, which keeps the implementation practical without overbuilding infrastructure first.

## 4. High-Level Architecture

```text
v1.1
Next.js UI
  -> mock Server Actions / Route Handlers
    -> seeded fixtures and contract-shaped adapters

current local v1.2
Next.js UI
  -> Route Handlers / client fetch helpers
    -> Domain Services
      -> SQLite via Prisma (system of record)
      -> OpenAI APIs or deterministic fallback services
      -> GitHub API
```

### Frontend contract rule

`v1.1` should define the request/response shapes that `v1.2` will honor.

This means:

- mock data should look like production data
- all major user interactions should flow through interface boundaries, not hardcoded component-local state
- UI code should not need major rewrites when real persistence is added

### Main bounded areas

- task domain
- hierarchy management domain
- AI orchestration domain
- Today recommendation domain
- import domain
- GitHub integration domain
- settings and prioritization domain
- audit/activity domain

## 5. Core Domain Model

## 5.1 Workspace model

V1 supports one workspace only. Keep the `workspaces` table anyway so the schema does not need to be reinvented later.

Default behavior:

- one workspace named `Personal`
- all records belong to one workspace
- first run starts as an empty workspace with preferences only

## 5.2 Hierarchy rules

- an Area belongs to a Workspace
- a List belongs to an Area
- an Inbox Task may belong to neither an Area nor a List
- a filed Task should belong to both an Area and a List
- a Subtask belongs to a Task
- a Comment belongs to a Task
- tags are many-to-many with tasks

### Important modeling decision

Tasks should store both `areaId` and `listId`.

Reason:

- Inbox tasks start unplaced
- filtering by area should not require joining through list
- drag-and-drop moves and explicit placement updates stay simple

Constraint:

- if `listId` is non-null, that list must belong to `areaId`
- if `areaId` is non-null in normal filed state, `listId` should also be non-null

## 6. Data Schema

This schema is the target `v1.2` data model and closely matches the current implementation.

For `v1.1`, mirror this model in typed frontend fixtures and mock service contracts so hierarchy, task detail, Today, and editing flows behave like the eventual real system.

## 6.1 Primary tables

### `workspaces`

- `id`
- `name`
- `createdAt`
- `updatedAt`

### `areas`

- `id`
- `workspaceId`
- `name`
- `slug`
- `description`
- `position`
- `isArchived`
- `createdAt`
- `updatedAt`

### `lists`

- `id`
- `workspaceId`
- `areaId`
- `name`
- `slug`
- `description`
- `position`
- `isArchived`
- `createdAt`
- `updatedAt`

### `tasks`

- `id`
- `workspaceId`
- `areaId` nullable
- `listId` nullable
- `sourceType` enum: `manual | import | github`
- `sourceRef` nullable string
- `title`
- `normalizedTitle`
- `description` nullable text
- `nextAction` nullable text
- `nextActionSubtaskId` nullable string
- `status` enum: `open | waiting_on | done`
- `priorityOverride` nullable smallint
- `dueDate` nullable timestamp
- `deferUntil` nullable timestamp
- `isInbox` boolean
- `lastWorkedAt` nullable timestamp
- `completedAt` nullable timestamp
- `waitingReason` nullable text
- `waitingSince` nullable timestamp
- `recurrenceRule` nullable jsonb
- `nextRecurrenceAt` nullable timestamp
- `githubIssueId` nullable
- `createdAt`
- `updatedAt`

### `subtasks`

- `id`
- `taskId`
- `title`
- `isDone`
- `position`
- `createdAt`
- `updatedAt`

Behavior notes:

- a task may point at one active linked subtask through `nextActionSubtaskId`
- while that link exists, the task's `nextAction` and the linked subtask title should stay in sync
- completing the linked subtask clears both `nextAction` and `nextActionSubtaskId`
- reopening a previously completed linked subtask does not restore the task's active next action

### `task_comments`

- `id`
- `taskId`
- `body`
- `commentType` enum: `note | update | ai_feedback | system_event`
- `createdAt`

### `tags`

- `id`
- `workspaceId`
- `name`
- `slug`
- `color` nullable
- `createdAt`

### `task_tags`

- `taskId`
- `tagId`

### `task_activity`

- `id`
- `taskId`
- `eventType`
- `payload` jsonb
- `createdAt`

Purpose:

- lightweight audit trail
- powers task history UI
- useful for AI context and staleness detection

### `task_ai_state`

- `taskId`
- `classification` jsonb
- `clarificationSuggestion` jsonb
- `subtaskSuggestion` jsonb
- `taskNextActionSuggestion` jsonb
- `nextStepSuggestion` jsonb
- `stalenessSignals` jsonb
- `lastAnalyzedAt`

### `today_plans`

- `id`
- `workspaceId`
- `date`
- `lens` enum: `balanced | revenue | unblock | strategic | admin`
- `briefing`
- `inputContext` jsonb
- `generationVersion`
- `status` enum: `ready | stale | generating | failed`
- `generatedAt`

### `today_plan_items`

- `id`
- `todayPlanId`
- `taskId`
- `groupKey` enum: `highest_leverage | quick_wins | waiting_follow_up`
- `rank`
- `reasonSummary`
- `reasonCodes` jsonb
- `dismissed` boolean

### `today_feedback_messages`

- `id`
- `workspaceId`
- `date`
- `lens`
- `body`
- `createdAt`

Purpose:

- stores user context entered from the Today screen
- becomes structured input to plan regeneration
- supports the PRD feedback loop without introducing a full chat model

### `user_preferences`

- `workspaceId`
- `defaultLens`
- `quickWinsPreference` integer
- `deepWorkPreference` integer
- `revenueWeight` integer
- `unblockWeight` integer
- `strategicWeight` integer
- `adminWeight` integer
- `workingHours` jsonb
- `updatedAt`

### `github_connections`

- `workspaceId`
- `installationType` enum: `personal_token`
- `encryptedToken`
- `username`
- `createdAt`
- `updatedAt`

### `github_repositories`

- `id`
- `workspaceId`
- `owner`
- `repo`
- `isActive`
- `lastSyncedAt`

### `github_issue_links`

- `id`
- `taskId`
- `repositoryId`
- `githubIssueNumber`
- `githubIssueNodeId`
- `githubIssueUrl`
- `githubState`
- `githubTitle`
- `githubBodySnapshot`
- `githubUpdatedAt`
- `lastSyncedAt`

### `imports`

- `id`
- `workspaceId`
- `sourceType` enum: `csv | json`
- `status` enum: `uploaded | parsing | reviewing | importing | completed | failed`
- `originalFilename`
- `mappingConfig` jsonb
- `summary` jsonb
- `createdAt`
- `completedAt`

### `import_rows`

- `id`
- `importId`
- `rawPayload` jsonb
- `normalizedPayload` jsonb
- `decision` enum: `new_task | merge_existing | skip`
- `matchedTaskId` nullable
- `createdTaskId` nullable

### `jobs`

- `id`
- `type`
- `status` enum: `queued | running | succeeded | failed`
- `payload` jsonb
- `attempts`
- `runAt`
- `lastError` nullable text
- `createdAt`
- `updatedAt`

## 6.2 Enums

Keep enums in application code and database migrations aligned for:

- task status
- comment type
- source type
- Today lens
- Today group
- job type

## 7. Recurrence Model

V1 should not support full calendar-rule complexity.

### Supported recurrence patterns

- daily every N days
- weekly on selected weekdays
- monthly on day-of-month

### Stored representation

Store recurrence in JSON:

```json
{
  "type": "weekly",
  "interval": 1,
  "daysOfWeek": [1, 3, 5],
  "anchorDate": "2026-03-15"
}
```

### Behavior rules

- completing a recurring task advances `nextRecurrenceAt`
- recurring tasks remain a single logical task in V1
- do not generate a separate task series instance table yet
- if a recurring task is overdue, it is still one task, not a backlog of missed occurrences
- Today uses `nextRecurrenceAt <= now` as one recommendation signal

This is intentionally lightweight and matches the PRD.

## 8. Today Recommendation System

The current implementation supports real persisted Today behavior with two generation modes:

- OpenAI-backed generation when the environment is configured
- deterministic fallback generation when AI is unavailable

## 8.1 Product behavior

Today is not a raw query result. It is a generated plan with:

- a short briefing
- grouped task recommendations
- reasons per task
- a lens
- optional user context for regeneration

## 8.2 Generation pipeline

Use a hybrid ranking pipeline:

### Step 1: deterministic candidate selection

Build a candidate pool from:

- open tasks
- waiting-on tasks needing follow-up
- tasks due soon or overdue
- tasks with `nextRecurrenceAt <= now`
- stale tasks with no recent activity
- tasks recently commented on
- GitHub-linked tasks with updated issue metadata

Hard exclusions:

- done tasks
- tasks deferred into the future
- tasks dismissed on the active Today plan

### Step 2: deterministic feature scoring

Compute features per task:

- due-date urgency
- recurrence due
- waiting-on follow-up age
- staleness
- recent momentum in same area/list
- quick-win likelihood
- deep-work likelihood
- strategic tag or area signal
- revenue / occupancy tag or area signal
- explicit user override signals

### Step 3: LLM plan generation or fallback generation

Send only the top candidate set, not the full database, to the LLM.

Recommended context size:

- 20 to 40 tasks maximum
- compact task summaries
- current lens
- user preference weights
- optional same-day feedback messages from `today_feedback_messages`
- recent completions for context

LLM or fallback planner returns:

- briefing text
- selected tasks
- group assignment
- rank within group
- short reason per task

### Step 4: validation and persistence

Validate:

- every recommended task exists and is eligible
- group values are valid
- no duplicate tasks
- number of tasks stays within cap

Persist result to `today_plans` and `today_plan_items`.

## 8.3 Lens behavior

Lens changes prompt instructions and deterministic weighting.

### Balanced

Mix leverage, progress maintenance, and a few easy wins.

### Revenue

Boost tasks tagged or classified as revenue, occupancy, pipeline, sales, or customer-impacting.

### Unblock

Boost blocker removal, waiting-on follow-up, next-step creation, and stalled projects.

### Strategic

Boost long-term, high-leverage, non-urgent work.

### Admin

Boost cleanup, follow-up, maintenance, and operational housekeeping.

## 8.4 Caching rules

- only one `ready` Today plan per workspace/date/lens
- regenerate when:
  - user explicitly requests it
  - important task state changed since last generation
  - user adds Today-context feedback
- stale detection can be simple in V1:
  - compare `generatedAt` to most recent relevant task update

## 9. AI Responsibilities and Service Design

The current app exposes real service boundaries for these behaviors so the UI can render suggestion states, loading states, and empty/error states without embedding model logic directly in components.

Implement AI through explicit service functions, not ad hoc prompt calls in UI code.

### Core AI services

- `classifyTask(input)`
- `clarifyTask(task)`
- `suggestSubtasks(task)`
- `suggestNextStep(task)`
- `generateTodayPlan(context)`
- `analyzeStaleness(task or list)`
- `parseCapture(input)`

### Output contract

Every AI service must return structured JSON validated by Zod.

Reasons:

- predictable persistence
- less brittle UI rendering
- easier retries and model swapping

### Prompting rules

- pass compact structured context, not full raw notes unless needed
- include workspace taxonomy: areas, lists, high-signal tags
- prefer suggestion outputs rather than silent mutation
- preserve user wording when not necessary to rewrite
- when suggesting a primary next step, return a dedicated task-level next-action suggestion separately from broader subtask suggestions

### Model split recommendation

- low-latency model for classification and small suggestions
- stronger reasoning model for Today planning
- transcription model for voice capture

## 10. Task Capture Flows

## 10.1 Text capture

### User flow

User enters free-form text in Inbox or quick-add.

### System behavior

1. create raw task immediately with `isInbox = true`
2. return structured suggestions from OpenAI when configured, otherwise use deterministic fallback suggestions
3. persist the task immediately regardless of AI availability
4. optionally parse for:
   - title suggestion
   - due date mention
   - likely tags
   - actionable vs non-actionable
5. show suggestions in UI without forcing acceptance

If the user later accepts a staged next-action suggestion during Inbox filing, persist it onto the task and create the linked next-action subtask in the same write.

### Important rule

Capture must succeed even if AI is unavailable.

## 10.2 Voice capture

### Flow

1. current implementation simulates a completed voice capture result
2. future full `v1.2` flow can record audio blob
3. upload audio to server
4. call transcription API
5. call `parseCapture`
6. create one or more inbox tasks from transcript
7. store original transcript in import/audit metadata

### V1 simplification

Voice creates tasks only. It does not maintain a separate voice note object.

## 11. Task Editing and Lifecycle

## 11.1 Allowed state transitions

- `open -> waiting_on`
- `open -> done`
- `waiting_on -> open`
- `waiting_on -> done`
- `done -> open`

Every transition writes a `task_activity` event.

## 11.2 Waiting On behavior

When marking Waiting On:

- optional `waitingReason`
- optional free-form comment
- set `waitingSince`

Waiting-on tasks stay visible in All Tasks and may appear in Today under follow-up grouping when stale enough.

## 11.3 Done behavior

When a task is completed:

- set `completedAt`
- update `lastWorkedAt`
- if recurring, compute next recurrence and reopen task
- otherwise remain `done`

For recurring tasks, V1 should reopen the same task record and append an activity event documenting completion and recurrence advance.

## 12. Search and Filtering

### V1 search requirements

- title search
- description search
- tag filter
- status filter
- area filter
- list filter

### Technical choice

The current implementation uses straightforward text matching on task title and description combined with relational status, area, and list filters in the app state layer.

Search should also include `nextAction` so active execution text is discoverable from All Tasks.

This is sufficient for the single-user local app and keeps the UX fast while avoiding premature search infrastructure.

## 13. Import Design

The current implementation keeps import intentionally lightweight. It persists import history and supports a sample import path for validating the end-to-end review and persistence flow.

## 13.1 Supported file formats

V1 import should support:

- CSV
- JSON

Markdown import can be deferred unless existing source material strongly needs it.

### Default CSV columns

- `title`
- `description`
- `status`
- `area`
- `list`
- `tags`
- `due_date`
- `notes`

## 13.2 Import stages

1. upload file
2. parse into `import_rows`
3. normalize fields
4. detect candidate duplicates using normalized title plus fuzzy matching
5. optionally run AI categorization for rows missing taxonomy
6. show review summary
7. commit import

## 13.3 Duplicate handling

V1 duplicate heuristic:

- exact normalized title match within same workspace
- fuzzy similarity above threshold
- optional GitHub issue URL match

If confidence is high, default to `merge_existing`; otherwise leave as `new_task` for user review.

## 14. GitHub Integration

GitHub is now a real integration path in the local app.

## 14.1 Auth model

Use a personal access token stored encrypted in the database.

Reason:

- single-user app
- simpler than GitHub App setup for V1
- sufficient for selected repo issue import and sync

## 14.2 V1 capabilities

- connect GitHub account via PAT
- discover accessible repositories from the token
- add selected repositories to the workspace
- import issues as tasks
- create issue from task
- sync metadata back to task

## 14.3 Sync direction

Use task as the local system of record for productivity state, and GitHub as the system of record for issue metadata.

### Local-owned task fields

- area/list assignment
- Today dismissal state
- tags not mirrored to GitHub
- comments that are internal only
- recurrence
- due date

### GitHub-owned mirrored fields

- issue title
- issue body snapshot
- open/closed state
- issue URL
- updated timestamp

## 14.4 Conflict rules

V1 conflict policy:

- local edits to GitHub-owned fields push immediately when initiated from app
- background sync treats latest GitHub remote state as authoritative unless there is a pending local write
- keep `githubUpdatedAt` and `lastSyncedAt` for visibility
- do not attempt field-level merge beyond title/body/state in V1

## 14.5 Current sync behavior

The current implementation performs explicit sync operations from the UI rather than relying on a separate worker process.

## 15. API and Server Surface

Prefer shared server services behind route handlers so UI mutations and integrations use the same domain logic.

### Staging rule

- `v1.1`: implement these as mock service boundaries with typed contract responses
- `v1.2`: keep the same interfaces and replace internals with real persistence and integrations

### Core mutation actions

- create task
- update task
- move task
- change status
- add comment
- add subtask
- update subtask title
- reorder subtasks
- dismiss from Today
- regenerate Today
- save preferences
- start import
- finalize import
- connect GitHub
- add GitHub repository
- discover GitHub repositories
- import GitHub issues
- create GitHub issue from task
- delete task
- file task from Inbox after staging suggestions

### Core query routes or loaders

- fetch Today plan
- fetch task detail
- fetch task list with filters
- fetch hierarchy tree
- fetch tags
- fetch settings
- fetch import summary

## 16. UI Architecture

## 16.1 Primary screens

### Today

Components:

- briefing header
- lens selector
- feedback input
- grouped recommendation sections
- task cards with supporting reason text, a labeled `Next Action:` line, and quick actions
- regenerate action

### All Tasks

Components:

- hierarchy sidebar for areas/lists
- search bar
- filter bar
- task table or list with inline next-action editing
- links into dedicated task detail pages
- inline area/list creation
- drag-and-drop list reassignment via the hierarchy rail

Behavior:

- All Tasks may show lightweight contextual previews on desktop
- the primary mental model for task editing and full inspection is a dedicated task detail page
- future mobile should use dedicated task pages rather than panel-first interactions
- default filter should be `Open`

### Inbox / Quick Capture

- quick add input
- capture history or recent items
- staged AI suggestions
- explicit `File task` action that commits accepted suggestions and placement

Behavior:

- if a staged next-action suggestion is accepted at filing time, filing should create or repair the task's linked next-action subtask

### Task Detail

Components:

- summary header
- status and hierarchy metadata
- subtasks
- notes/comments
- task history
- GitHub context when linked
- edit controls for title, description, next action, and placement
- delete action
- repository selector and create-issue action when GitHub is configured

Behavior:

- the active next-action subtask should be visually identifiable in the checklist
- renaming the linked next-action subtask updates the task's `nextAction`

### Settings

- prioritization preferences
- GitHub connection
- import entry point

## 16.2 State strategy

- server-render primary data
- client components only where interactivity requires it
- optimistic updates for quick task actions
- invalidate Today plan after meaningful task updates

## 17. Background Job System

This section is still the intended future shape for heavier async work, but it is not fully implemented in the current local app.

Today regeneration, AI suggestions, import review, voice capture, and GitHub sync currently run through direct request/response flows and persisted state updates.

### Required job types

- `classify_task`
- `clarify_task`
- `suggest_subtasks`
- `generate_today_plan`
- `transcribe_voice_capture`
- `process_import`
- `github_import_repo_issues`
- `github_sync_issue`

### Execution rules

- jobs are idempotent where possible
- retries with capped backoff
- store structured error payload
- worker claims jobs with row locking

## 18. Audit Trail and History

The PRD calls out task history as visible in All Tasks. V1 should support a lightweight activity stream.

In `v1.1`, task history should be seeded and update in-memory through the mock data layer so the detail UI can be validated.

### Event examples

- task created
- title edited
- description edited
- next action edited
- status changed
- due date changed
- moved between area/list
- comment added
- linked next-action subtask completed and cleared
- GitHub link added
- GitHub sync updated metadata
- recurring task advanced

This should power:

- task detail history
- staleness signals
- future analytics

## 19. Security and Secrets

These requirements primarily apply to `v1.2`.

For `v1.1`, avoid introducing fake secret-handling code that obscures the prototype; keep secrets out of scope except where the interface needs placeholders.

Even though V1 is single-user, do not treat it like a throwaway local script.

### Requirements

- encrypt GitHub token at rest
- keep OpenAI and encryption keys in environment variables
- redact tokens from logs
- validate uploaded file size and type
- apply server-side schema validation on all writes

## 20. Observability

V1 observability can stay simple.

For `v1.1`, basic console or dev logging is sufficient.

For `v1.2`, add structured logging around backend and integration workflows.

### Log events

- Today plan generation start/success/failure
- AI service failures
- import failures
- GitHub sync failures
- transcription failures

### Metrics to record later

- task capture count
- Today regeneration count
- recommendation acceptance/completion rate
- stale task count

## 21. Testing Strategy

Testing should be split by delivery step.

## 21.1 `v1.1` frontend validation tests

- screen rendering with seeded hierarchy data
- Today lens switching and regeneration using mock responses
- task detail editing flows against mock contracts
- Inbox capture and suggestion rendering
- waiting-on, done, and comment flows updating the UI correctly
- import, voice, and GitHub screens rendering realistic stubbed states

## 21.2 `v1.2` implementation tests

### Unit tests

- recurrence calculations
- Today deterministic feature scoring
- task state transition logic
- duplicate import detection
- GitHub conflict policy

### Integration tests

- create/edit/complete task flow
- Today generation persistence flow
- import pipeline
- GitHub issue link/create/sync flow

### End-to-end tests

- capture task and see AI suggestions
- regenerate Today with alternate lens
- mark task waiting on from Today
- import CSV and review results

## 22. Delivery Plan

## `v1.1`: frontend validation release

- scaffold Next.js app and core design system
- define shared TypeScript domain types that mirror the target backend model
- build Today, All Tasks, Inbox, task detail, and Settings screens
- implement hierarchy browsing, task editing, subtasks, comments, and status changes through mock contracts
- create seeded fixture data covering multiple areas, lists, waiting-on tasks, recurring tasks, GitHub-linked tasks, and done history
- implement mocked Today generation, AI suggestions, import review, voice capture, and GitHub issue flows
- validate navigation, information architecture, hierarchy feel, and interaction patterns before backend investment

## `v1.2`: real backend and AI release

- add Prisma schema and real persistence
- replace mock services with real route handlers and shared server services
- implement domain services, activity logging, and task history persistence
- add Today plan persistence, deterministic scoring, and OpenAI-backed generation with fallback behavior
- wire AI task classification, clarification, subtask suggestions, and next-step suggestions
- add voice transcription pipeline
- add CSV/JSON import pipeline
- add GitHub PAT connection, repository discovery, issue import, create, and sync workflows
- add stronger observability and integration tests

## 23. Build-Blocking Decisions Resolved by This Spec

These decisions are now concrete defaults unless we revise them:

- use Next.js + TypeScript + Prisma
- local runtime uses SQLite
- single-tenant web app with one workspace
- split delivery into `v1.1` mocked frontend and `v1.2` real backend/integrations
- keep `v1.1` contracts aligned with `v1.2` production interfaces
- OpenAI for both LLM and transcription
- PAT-based GitHub integration
- lightweight JSON recurrence model
- cached Today plan persisted by date and lens
- activity stream as task history source

## 24. Remaining Product Decisions Worth Iterating On

These are not blockers to implementation, but they are the highest-value product refinements for the next pass:

- whether recurring tasks should visually show completion history inline
- whether imported GitHub issues should default into a dedicated area/list
- whether tags should be free-form only or partially curated
- how aggressive staleness and blocker surfacing should feel
- whether and when to upgrade from SQLite to PostgreSQL

## 25. Suggested Next Spec Documents

If we continue iterating, the best follow-on docs are:

1. screen-by-screen UX spec
2. API contract spec
3. Prisma schema draft
4. Today recommendation prompt and ranking contract
5. GitHub sync sequence diagrams
