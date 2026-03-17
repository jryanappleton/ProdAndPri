# Core Use Cases and User Stories

## 1. Purpose

This document translates the PRD, technical specification, and design doc into user-centered use cases and user stories. Its purpose is to keep implementation grounded in what the end user is trying to accomplish now that `v1.1` has been validated and the app is running as a real `v1.2` local product.

This is not a backlog of tiny tickets. It is a product-shaping document focused on the core jobs the app must do well in order to feel like a personal chief-of-staff for execution.

## 2. Primary User

The primary user is one person managing multiple domains of work across business, software, operations, and personal admin.

The user:

- has too many active responsibilities to keep everything mentally loaded
- needs help deciding what matters today
- captures work in rough form and wants the system to help organize it later
- values both strategic work and small wins
- does not want a rigid methodology tool or a team project manager

## 3. Product Jobs To Be Done

At a high level, the product must help the user:

1. capture work before it is lost
2. turn vague work into clearer next actions
3. decide what to do today
4. keep projects moving across multiple areas
5. track waiting-on and follow-up work
6. manage all tasks in a trustworthy system of record
7. unify software and non-software work in one place

## 4. Core Use Cases

## 4.1 Use Case: Capture work quickly

### User goal

Get a task into the system fast without having to fully organize it in the moment.

### Why it matters

If capture is slow or demanding, the system will lose trust immediately and meaningful work will stay in the user's head or scattered across other tools.

### Primary stories

- As a user, I want to type a rough task quickly so I can capture it before I forget it.
- As a user, I want to use voice capture when typing is inconvenient so I can get ideas and tasks into the system with low friction.
- As a user, I want captured items to land safely in Inbox even if they are incomplete so I do not need to classify everything immediately.
- As a user, I want capture to succeed even if AI is unavailable so the app never blocks me from saving work.

### Success indicators

- capture feels faster than writing a polished task
- the user does not hesitate because of categorization overhead
- the captured item is visibly saved and easy to revisit

### `v1.1` validation focus

- quick capture feels fast and forgiving
- Inbox clearly signals "captured, not yet organized"
- mock suggestion states feel understandable

## 4.2 Use Case: Triage and organize captured work

### User goal

Review captured tasks and place them into the right area, list, and level of clarity.

### Why it matters

The product is not just a bucket for raw tasks. It needs to convert rough thoughts into useful, structured work.

### Primary stories

- As a user, I want AI to suggest area, list, tags, and title cleanup so I can organize tasks faster.
- As a user, I want suggestions to remain suggestions so I stay in control of my system.
- As a user, I want to accept or ignore suggestions individually so the system helps without feeling invasive.
- As a user, I want to accept multiple compatible suggestions before filing a task so triage feels cumulative rather than jumpy.
- As a user, I want the task to stay in Inbox until I explicitly file it so suggestion acceptance does not feel like a hidden move.
- As a user, I want vague tasks to be clarified into a next action when needed so projects do not stall in ambiguity.
- As a user, I want subtasks suggested for larger work so I can break complex items into something workable.

### Success indicators

- captured tasks become easier to place and act on
- AI reduces cleanup effort without creating mistrust
- the user can move from messy input to usable structure quickly

### `v1.1` validation focus

- suggestion UI clearly distinguishes current state, suggested change, and accepted change
- Inbox-to-organized flow feels lightweight

### Current implementation notes

- filing now requires a valid area and list
- if an area has exactly one list, that list can be preselected to reduce friction

## 4.3 Use Case: Start the day with a useful plan

### User goal

Open the app and quickly understand what work is most worth doing today.

### Why it matters

This is the core promise of the product. The app is meant to help the user choose meaningful work, not merely list tasks.

### Primary stories

- As a user, I want Today to open with a concise, human-feeling briefing so I can orient quickly.
- As a user, I want a medium-length set of grouped recommendations so I can form a realistic daily plan without feeling overwhelmed.
- As a user, I want to understand why each task is recommended so I can trust the plan.
- As a user, I want Today to balance leverage, urgency, momentum, and follow-up needs so important work does not get buried.
- As a user, I want Today to feel curated rather than like a filtered database query.

### Success indicators

- the user feels less decision friction at the start of work
- Today feels trustworthy and actionable
- the user can identify where to begin within seconds

### `v1.1` validation focus

- Today feels valuable even with mocked recommendations
- the grouping and card structure support quick scanning
- the briefing, lens controls, and recommendation reasons feel coherent together

## 4.4 Use Case: Reframe the day when context changes

### User goal

Adjust the day's plan when priorities or energy shift.

### Why it matters

The user's work changes dynamically. The product needs to stay useful as context changes rather than forcing a static plan.

### Primary stories

- As a user, I want to switch prioritization lenses so I can see the day through a different mode such as strategic, unblock, or admin.
- As a user, I want to give lightweight feedback like "need easier wins" so Today can adapt without becoming a full chat workflow.
- As a user, I want regeneration to feel quick and reversible so I can explore alternate plans without losing trust.
- As a user, I want my settings to shape the default plan so the app reflects my working style over time.

### Success indicators

- the user feels the system listens to context
- Today can adapt without becoming noisy or complex
- changing lenses feels like steering, not resetting everything

### `v1.1` validation focus

- lens switching is easy to understand
- feedback input feels like guidance rather than chat
- regeneration states feel lightweight and believable

## 4.5 Use Case: Act on tasks throughout the day

### User goal

Update tasks quickly while working without losing context or momentum.

### Why it matters

If everyday task updates are slow, the app becomes stale and Today loses accuracy.

### Primary stories

- As a user, I want to mark tasks done quickly so completion is easy to record.
- As a user, I want to mark a task as waiting on someone or something so I do not lose track of blocked work.
- As a user, I want to add comments or notes in context so task history captures what changed.
- As a user, I want to complete subtasks as I go so larger tasks still feel manageable.
- As a user, I want quick actions from Today so I do not need to navigate away to keep the system current.
- As a user, I do not want the UI to offer redundant actions for the status I am already in.

### Success indicators

- task updates feel immediate and low-effort
- task state stays current enough to support prioritization
- progress tracking does not interrupt work

### `v1.1` validation focus

- quick actions feel responsive and confidence-building
- waiting-on behavior is easy to understand
- inline feedback makes state changes feel reliable

## 4.6 Use Case: Review and manage all work across the hierarchy

### User goal

Browse, search, filter, and edit tasks across all areas and lists in a system the user trusts.

### Why it matters

The user needs a broader control surface beyond Today. Without a trustworthy system of record, the product becomes a recommendation layer on top of chaos.

### Primary stories

- As a user, I want to browse tasks by area and list so I can understand work in its proper context.
- As a user, I want to create areas and lists directly in the app so I can shape the system around my real work.
- As a user, I want to search and filter across status, tags, area, and list so I can find what I need quickly.
- As a user, I want to inspect task details, comments, subtasks, and history so I can understand the full state of work.
- As a user, I want to drag a task onto another list so reorganizing work feels direct and fast.
- As a user, I want All Tasks to feel clear and orderly so I trust it as my source of truth.

### Success indicators

- the hierarchy is understandable and navigable
- the user can locate and edit work without friction
- All Tasks feels calmer and more controlled than Today

### `v1.1` validation focus

- hierarchy rail and task list structure make sense
- search/filter placement feels natural
- task detail pages feel authoritative and easy to work in

### Current implementation notes

- `All Tasks` defaults to `Open` items
- hierarchy placement is shown as quiet path text rather than a series of pills

## 4.7 Use Case: Keep projects from going stale

### User goal

Notice when important work has stopped moving and get back to a concrete next step.

### Why it matters

One of the product's biggest jobs is preventing meaningful projects from quietly stalling.

### Primary stories

- As a user, I want stale or neglected work surfaced so it does not disappear behind easier tasks.
- As a user, I want the system to suggest next steps when a project has lost momentum so I can restart movement.
- As a user, I want blocker and follow-up signals to influence Today without dominating it.
- As a user, I want waiting-on items to reappear when follow-up is probably needed so important loops do not die silently.

### Success indicators

- important projects regain visibility before they are forgotten
- stale work re-enters the user's attention with enough context to act
- follow-up feels intentional rather than nagging

### `v1.1` validation focus

- waiting-on and stale-item patterns read clearly in the UI
- recommendation reasons make follow-up logic understandable

## 4.8 Use Case: Track recurring and maintenance work

### User goal

Handle repeating responsibilities without turning the app into a cluttered maintenance log.

### Why it matters

Recurring work is part of real execution, but it should inform Today without overwhelming higher-leverage work.

### Primary stories

- As a user, I want recurring tasks to surface at the right time so routine responsibilities are not forgotten.
- As a user, I want recurrence to behave simply so I do not have to manage a complicated scheduling system.
- As a user, I want recurring admin work to coexist with strategic work without dominating my day.

### Success indicators

- recurring work is visible at the right moments
- the user does not feel buried under routine items
- recurrence rules feel lightweight and understandable

### `v1.1` validation focus

- recurring tasks read clearly in Today and detail views
- recurring work feels integrated rather than bolted on

## 4.9 Use Case: Seed the system from existing tasks

### User goal

Import an existing task source so the app becomes useful without manual rebuild.

### Why it matters

If setup is too burdensome, the user may never reach a trustworthy state in the new system.

### Primary stories

- As a user, I want to import tasks from an existing source so I can populate the system quickly.
- As a user, I want the import flow to help with categorization and duplicate detection so cleanup is manageable.
- As a user, I want review before final import so I do not lose control over what enters the system.

### Success indicators

- import feels like acceleration, not another project
- the user trusts the imported result enough to continue using the app

### `v1.1` validation focus

- mocked import review flow feels comprehensible
- duplicate and categorization suggestions feel helpful

## 4.10 Use Case: Unify GitHub work with the rest of life and business

### User goal

See software issues in the same execution system as everything else without replacing GitHub.

### Why it matters

The user's work spans technical and non-technical domains. The system must unify them enough to support daily prioritization.

### Primary stories

- As a user, I want to import issues from selected repositories so software work appears alongside other work.
- As a user, I want to discover my repositories from the connected token so setup feels lighter than typing owner and repo every time.
- As a user, I want to create GitHub issues from tasks so software-related work can move outward when needed.
- As a user, I want issue metadata to sync back into the task so I can see relevant status without living in GitHub.
- As a user, I do not want the app to pretend it is a full GitHub replacement.

### Success indicators

- GitHub work and non-GitHub work can coexist in Today and All Tasks
- the integration feels useful but lightweight
- the user retains a clear mental model of what belongs in the app versus GitHub

### `v1.1` validation focus

- issue-linked task UI is clear
- GitHub-derived metadata feels integrated into the task model

### Current implementation notes

- repository discovery and repository selection happen in Settings
- GitHub issue creation happens from Task Detail after a repository has been configured

## 4.11 Use Case: Understand one task in full context

### User goal

Open a task and understand everything needed to decide, edit, or act on it.

### Why it matters

The user must be able to move from a brief recommendation or row into a reliable detail view without losing context.

### Primary stories

- As a user, I want a dedicated task detail page so one task can be understood in full context.
- As a user, I want to see summary, hierarchy placement, status, subtasks, comments, and history together so I do not have to piece together state from multiple screens.
- As a user, I want task details to stay structured and readable so the page supports action rather than turning into a cluttered note dump.
- As a user, I want to edit placement, title, and notes from the detail page so I can correct tasks after capture.
- As a user, I want to delete a task from the detail page when it should not remain in the system.

### Success indicators

- task detail feels authoritative
- editing and review can happen in the same place
- the user can re-enter work quickly after opening detail

### `v1.1` validation focus

- detail page hierarchy and section ordering feel natural
- the page supports both scanability and deeper editing

## 4.12 Use Case: Trust the product enough to use it daily

### User goal

Feel that the app is reliable, understandable, and worth returning to every day.

### Why it matters

The product succeeds only if it becomes part of the user's working rhythm.

### Primary stories

- As a user, I want the app to feel calm and uplifting so daily use feels supportive rather than draining.
- As a user, I want the interface to feel intentional on both desktop and future mobile/PWA surfaces so I can build a habit around it.
- As a user, I want AI behavior to be legible so I trust what the app is recommending.
- As a user, I want empty, loading, and error states to still feel coherent so the product never feels broken or half-designed.

### Success indicators

- the user opens Today regularly
- the app becomes part of morning planning and mid-day adjustment
- the user sees the system as a partner in execution rather than another maintenance burden

## 5. Story Set By Release

## 5.1 `v1.1` proved

`v1.1` established the UX shape before the backend and integrations were wired for real.

Core stories proven in `v1.1`:

- I can capture work quickly and see it land safely.
- I can understand and act from Today.
- I can browse and trust the hierarchy in All Tasks.
- I can update task state quickly during the day.
- I can understand what AI suggestions would feel like without surrendering control.
- I can inspect a task in a detail view that feels complete and authoritative.
- I can imagine using this daily on desktop and later on mobile/PWA.

## 5.2 `v1.2` is fulfilling

`v1.2` turns the validated experience into a real operating product.

Core stories currently being fulfilled in `v1.2`:

- my tasks persist and update reliably
- Today adapts based on real state and feedback
- AI suggestions are actually generated
- voice capture has a real UX entry point, with full transcription depth still to be completed
- import uses a lightweight real persistence path, with broader file parsing still to be completed
- GitHub integration performs real syncing and issue actions

## 6. Out of Scope Stories for V1

The following user needs are explicitly not first-order goals for this version:

- collaborating with other users
- managing team permissions or roles
- using the app as a full knowledge base
- performing a formal weekly review workflow
- replacing GitHub as an engineering system
- advanced personal analytics or life tracking

## 7. Evaluation Checklist

Use this checklist when reviewing product decisions, wireframes, or implementation work.

A proposed feature or screen supports the product if it helps the user:

- capture faster
- decide faster
- understand why something matters
- keep projects moving
- maintain trust in the hierarchy
- manage both GitHub and non-GitHub work together
- stay in control while receiving AI help

If it adds complexity without improving one of those outcomes, it is probably not core to V1.
