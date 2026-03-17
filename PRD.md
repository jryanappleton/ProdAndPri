# PRD: Personal AI Productivity and Execution App

## 1. Product Overview

This product is a personal productivity and execution app designed for a single user. Its purpose is not just to store tasks, but to help the user decide what to work on next, keep important projects moving, and reduce the chances that meaningful work slips through the cracks.

The app combines structured task management with AI assistance. It organizes work across multiple areas of responsibility, captures both large and small tasks, and generates a daily in-app view of recommended work based on context, priorities, and project momentum. It also supports lightweight integration with GitHub so that software work and non-technical work can live in the same system.

The product is inspired loosely by Getting Things Done, particularly around capture, next actions, project visibility, and waiting-on items, but it is intentionally modernized and simplified. It is not meant to be a rigid productivity methodology tool.

---

## 2. Problem Statement

The user does not primarily need a better way to list tasks. The deeper problem is deciding what to do next across many competing priorities, while maintaining momentum on important projects and not losing track of key follow-ups.

The app should solve for:

- difficulty deciding what to work on next  
- high-value work getting buried under easier or noisier tasks  
- large projects stalling because next actions are unclear  
- work being spread across different systems, especially GitHub and personal task lists  
- important follow-ups and unresolved tasks slipping through the cracks  

---

## 3. Product Goals

The product should help the user:

- identify the most useful work to do today  
- maintain visibility across major business, software, and personal initiatives  
- keep projects moving through better next-action clarity  
- capture tasks quickly with minimal friction  
- use AI to organize, clarify, and reprioritize work  
- track waiting-on items without losing them  
- unify technical and non-technical work in one system  

---

## 4. Non-Goals for V1

The product will not aim to be:

- a multi-user collaboration platform  
- a full project management tool for teams  
- a Notion-style general knowledge base  
- a habit tracker  
- a journaling app  
- a full GTD implementation  
- a complete GitHub replacement  
- a life analytics platform  

The app is explicitly optimized for one user and should stay focused on execution support.

---

## 5. Target User

### Primary User

A single user managing multiple domains of work across business operations, growth, software projects, and personal tasks.

### User Profile

The user is entrepreneurial, manages many concurrent initiatives, often works across different levels of abstraction, and benefits from help converting broad goals into concrete next steps. The user values both strategic work and practical quick wins, and wants a system that can support both.

---

## 6. Core Product Concept

The product acts as a personal execution system with three main jobs:

### 6.1 Capture work easily

The user should be able to quickly add new items by text or voice, without worrying too much about perfect categorization at the moment of entry.

### 6.2 Organize work intelligently

AI should help assign tasks to the appropriate area or list, suggest tags, clarify vague tasks, identify next actions, and detect blockers or stale items.

### 6.3 Guide daily execution

The app should generate a daily in-app view of recommended work based on current priorities, task state, due dates, recurrence patterns, blockers, and user feedback.

---

## 7. Information Architecture

The app will use a hierarchical structure that separates broad domains from more specific workstreams.

### 7.1 Hierarchy

- Workspace  
  - Area  
    - List  
      - Task  
        - Subtask  

### 7.2 Definitions

#### Area

A top-level domain of responsibility or initiative. Examples:

- Lazy Tiger  
- Patchwork  
- HeadsUp  
- Personal Admin  
- Ideas / Someday  

#### List

A sub-container within an area representing a workstream, focus area, or project grouping. Examples:

- Content/Social  
- Staff To-Dos  
- Cut Expenses  
- Hostel Next Ups  
- Longer Term Planning  

#### Task

A unit of work that can be completed or advanced.

#### Subtask

A smaller actionable unit inside a task.

#### Notes / Comments

Tasks may also contain non-actionable notes or comments that provide context, updates, or helpful information.

### 7.3 Additional Rules

- Inbox tasks may exist without an area or list.  
- Once filed into the hierarchy, a task should belong to both an area and a list.  
- A general catch-all or inbox is allowed.  
- Tags can be applied across tasks.  
- Tags can be manually added and AI-suggested.  
- AI can suggest appropriate areas, lists, and tags after capture.

---

## 8. Core User Flows

### 8.1 Capture a New Task

The user can create a task through:

- typed text  
- voice input  

The user should be able to quickly enter rough, imperfect thoughts. The system should then use AI to:

- suggest task title cleanup  
- identify whether the item is actionable  
- suggest a likely area or list  
- suggest tags  
- propose subtasks if helpful  

The user should be able to accept multiple compatible suggestions before explicitly filing the task out of Inbox.

### 8.2 View and Work from Today

The Today view is a primary screen. It should present AI-recommended work for the day rather than a generic chronological task list.

The Today view should include:

- a brief AI summary of the day’s priorities  
- a grouped set of recommended tasks  
- explanations for why each task is recommended  
- quick actions to complete, defer, or comment on a task  
- a way to tell the AI additional context and regenerate recommendations  

The system should support different prioritization lenses or modes, including:

- default balanced mode  
- revenue / occupancy mode  
- unblock mode  
- strategic mode  
- admin cleanup mode  

The user should be able to adjust preferences in settings and also regenerate Today with a different view.

### 8.3 Update Tasks During the Day

As the user works, they should be able to:

- mark tasks done  
- leave comments  
- mark a task as waiting on someone or something  
- return tasks to open  
- complete subtasks  
- ask AI to refresh priorities based on new information  

### 8.4 Manage All Tasks

The All Tasks view is the second primary screen. It should provide a broader, structured view across areas, lists, and tasks.

The user should be able to:

- browse by area and list  
- filter tasks  
- search tasks  
- create areas and lists directly in the app  
- move tasks between lists  
- create and edit tasks  
- review open, waiting-on, and done items  
- inspect notes, subtasks, and task history  

### 8.5 Import Existing Tasks

The app should support a one-time import from an existing task source. The exact input format can be defined in the tech spec, but the goal is to seed the system quickly without requiring manual rebuild from scratch.

AI may assist in:

- categorizing imported tasks  
- deduplicating similar items  
- proposing likely area/list assignments  
- flagging vague or stale items  

### 8.6 GitHub Integration

The app should support lightweight GitHub workflows for software projects.

V1 GitHub support includes:

- discovering accessible repositories from the connected token and selecting which ones to use  
- importing issues from selected repositories  
- creating a new GitHub issue from a task  
- syncing basic GitHub metadata back into the task  

The app is not responsible for replacing full GitHub workflows.

---

## 9. Task Model

### 9.1 Required Field

- title  

### 9.2 Optional Fields

- area  
- list  
- description / notes  
- tags  
- due date  
- recurrence settings  
- subtasks  
- GitHub link  
- comments  

### 9.3 Statuses

V1 task statuses:

- Open  
- Waiting On  
- Done  

These statuses should remain simple and stable.

### 9.4 Due Dates

Tasks may optionally have due dates. Due dates should inform prioritization but should not dominate it. A task being overdue does not automatically make it more important than higher-leverage work.

### 9.5 Recurring Tasks

The system should support recurring tasks in V1.

Recurring behavior:

- user can define recurrence patterns  
- recurrence is one factor in deciding what to surface today  
- the recurrence model should behave similarly to due dates in that it informs recommendation timing  
- recurrence should be lightweight rather than overly complex  

Detailed recurrence rules can be specified in the tech spec.

---

## 10. AI Responsibilities

AI is a core product feature, not a decorative add-on.

### 10.1 AI Jobs in V1

#### 10.1 Prioritization

AI should generate recommended work for Today based on task state, task context, user preferences, due dates, recurrence, waiting-on status, and project momentum.

#### 10.2 Task Classification

AI should suggest:

- likely area  
- likely list  
- likely tags  

#### 10.3 Task Clarification

AI should help rewrite vague items into clearer next actions when useful.

#### 10.4 Subtask Suggestions

AI should propose subtasks for larger or ambiguous tasks.

#### 10.5 Next-Step Suggestions

AI should help identify the next concrete step needed to move a task or project forward.

#### 10.6 Blocker Detection

AI should identify when work appears blocked or stalled.

#### 10.7 Delegation Suggestions

AI may suggest when a task appears better suited to delegation or handoff.

#### 10.8 Automation Suggestions

AI may suggest where a task or workflow could potentially be automated.

#### 10.9 Staleness Detection

AI should surface important but neglected tasks or lists that have lost momentum.

---

## 11. AI Interaction Model

The AI should not live only in the background. There should be a lightweight feedback loop between the user and the system.

### 11.1 Feedback Loop

- AI recommends work for Today  
- user adds context or reactions  
- AI updates recommendations  

Examples of user feedback:

- not focusing on this area today  
- waiting on someone else for this  
- want easier wins this morning  
- need deep work only  
- this is more important than it looks  

### 11.2 Interaction Surfaces

Primary AI interaction surfaces in V1:

- input box on Today for contextual feedback and regeneration  
- comments on tasks for localized context  

The product should not be chat-first in V1, though conversational elements may be added later.

---

## 12. Today View Requirements

The Today view should feel like a decision-support screen, not just another task list.

### 12.1 Content

The Today view should include:

- short AI-generated briefing  
- grouped recommendations  
- reason labels or explanations for each recommendation  
- quick actions for each task  
- regenerate or reframe controls  

### 12.2 Suggested Groupings

Initial grouping model:

- Highest Leverage  
- Quick Wins  
- Waiting On Follow-Up  

These groupings may evolve later, but the point is to present a balanced and useful daily plan without clutter.

### 12.3 Task Actions from Today

The user should be able to:

- mark done  
- mark waiting on  
- add comment  
- open task details  
- defer or dismiss from Today  
- regenerate recommendations  

---

## 13. All Tasks View Requirements

The All Tasks view should act as the system of record.

The user should be able to:

- view tasks across all areas/lists  
- search and filter by tag, status, area, or list  
- inspect task details  
- edit tasks  
- add subtasks  
- view done history  
- identify waiting-on items  
- browse by hierarchy  

This screen should favor clarity and control over AI guidance.

---

## 14. Settings and Preferences

The user should be able to configure background prioritization preferences through settings.

### 14.1 Examples of Preferences

- emphasize revenue / occupancy impact  
- emphasize unblocking work  
- emphasize strategic longer-term work  
- emphasize cleanup or admin work  
- prefer more quick wins vs more deep work  

These settings should influence AI prioritization, but the user should also be able to override or regenerate Today using a different lens on demand.

---

## 15. GTD-Inspired Principles Included in V1

### 15.1 Included

- fast capture  
- project/list visibility  
- next-action orientation  
- waiting-on tracking  

### 15.2 Excluded for V1

- formal weekly review workflow  
- extensive context taxonomy  
- full GTD processing ritual  
- someday/maybe system beyond simple future tagging or later expansion  

---

## 16. Success Metrics

Since this is a personal tool, success is more behavioral and qualitative than broad-market.

### 16.1 Primary Success Indicators

- more high-leverage work gets completed  
- fewer important tasks slip through the cracks  
- the Today view is trusted and used regularly  
- projects move forward more consistently  
- task capture becomes faster and lower-friction  
- the user can manage both GitHub and non-GitHub work in one place  

### 16.2 Possible Measurable Indicators (for later instrumentation)

- number of tasks captured per week  
- number of AI recommendations accepted or completed  
- time from task capture to completion  
- percentage of tasks with no activity for long periods  
- distribution of completed work across areas  

---

## 17. V1 Scope Summary

### 17.1 Included in V1

- single-user app  
- areas, lists, tasks, subtasks  
- task notes/comments  
- tags  
- text capture  
- voice capture with a path to transcription into task(s)  
- AI-assisted categorization and task clarification  
- AI-generated Today view  
- simple statuses: Open, Waiting On, Done  
- optional due dates  
- recurring tasks  
- All Tasks view  
- initial import path for existing tasks  
- lightweight GitHub integration  
- prioritization preferences in settings  
- regenerate Today with alternate prioritization lens  

### 17.2 Excluded from V1

- multi-user support  
- auth  
- weekly review workflow  
- screen time tracking  
- advanced analytics  
- full chat-first assistant  
- full GitHub feature parity  
- drafting emails from tasks  
- AI-generated impact scoring as a formal user-facing system  

---

## 18. Open Questions for Tech Spec Phase

These are not blockers to the PRD, but should be defined in the technical design phase:

- exact data schema for areas, lists, tasks, subtasks, comments, and tags  
- recurrence rule implementation details  
- GitHub sync model and conflict handling  
- import file formats and mapping rules  
- voice transcription provider and workflow  
- AI prompting and context selection  
- how Today recommendations are generated and cached  
- whether AI actions are synchronous or background-generated  
- search and filtering implementation  
- attachment support, if any  
- audit trail / task history model  

---

## 19. Product Principle

This product should feel like a personal chief-of-staff for execution, not a filing cabinet for tasks.

Its job is to help the user move meaningful work forward with less friction, more clarity, and better prioritization.
