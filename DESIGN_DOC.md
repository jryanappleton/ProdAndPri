# Design Doc: Uplifting, Today-First Productivity UX

## 1. Purpose

This document defines the visual system, shared components, interaction principles, and screen-level UX for the personal AI productivity app described in the PRD and technical specification.

It is written primarily for `v1.1`, where the product was validated as a fully functional frontend with realistic stubbed data and APIs. It also establishes design principles that continue into the current `v1.2` implementation, where real backend, AI, and integration behavior are now connected behind the same UX shape.

The design goal is a product that feels clean, capable, and uplifting. It should help the user decide what to do next without feeling like an enterprise dashboard or a generic to-do list.

## 2. Product Experience Principles

### 2.1 Product stance

The product is a decision-support workspace, not a filing cabinet.

Implications:

- `Today` is the emotional and navigational center of the app
- `All Tasks` is the trusted system of record
- `Inbox` is a temporary state for captured work, not a permanent destination
- AI should feel assistive and embedded, not like a chat app layered on top

### 2.2 Experience goals

The interface should feel:

- focused, but not severe
- optimistic, but not playful
- smart, but not mysterious
- structured, but not rigid

### 2.3 UX priorities

In priority order:

1. help the user choose meaningful work quickly
2. make task capture feel frictionless and forgiving
3. preserve trust in hierarchy and task detail
4. keep AI suggestions understandable and non-intrusive
5. remain mobile-compatible even when `v1.1` ships desktop-first

## 3. Visual Direction

### 3.1 Chosen direction

Use an editorial-focus visual style with balanced density.

This should feel more intentional than a utility app, but still disciplined enough for daily work. The UI should have rhythm, hierarchy, and clarity, with enough warmth to feel energizing.

### 3.2 Tone

The visual tone should communicate calm energy:

- bright overall canvas
- warm neutrals instead of cool sterile grays
- one crisp accent family for emphasis and action
- strong typography hierarchy
- compact, restrained metadata styling

### 3.3 Things to avoid

- gray-on-gray "SaaS admin" aesthetics
- soft pastel wellness-app styling
- oversized card stacks that reduce throughput too much
- excessive icon decoration
- heavy border grids everywhere

### 3.4 Recommended palette approach

Do not lock exact colors in this document, but constrain the system:

- base surfaces: warm white, paper, soft sand, light fog
- text: dark ink, muted graphite, subdued secondary copy
- accent: one confident cool-leaning family such as deep teal, blue-green, or clean cobalt
- positive state: restrained green
- waiting / caution state: amber or ochre
- destructive state: muted brick or rust, not neon red

### 3.5 Typography guidance

Use typography as the main hierarchy tool.

- page titles: expressive serif or high-character display face
- section headers: strong sans or compact editorial serif
- body and UI text: highly legible sans
- metadata: smaller, quieter, but never faint

Typography should create a sense of structure before cards, dividers, or color do.

## 4. Layout System

## 4.1 Core shell

The app should use a shared shell with:

- primary navigation
- global quick capture
- content header
- responsive main content area

### Desktop `v1.1`

- top navigation is the primary shell pattern
- quick capture is always reachable without leaving the current section
- content should sit in a centered, readable frame rather than stretching edge-to-edge

### Future mobile / PWA

- shift to native-like bottom navigation
- use sticky thumb-reachable actions
- convert side panels into full-height sheets or dedicated views
- preserve content hierarchy, not literal layout parity

## 4.2 Breakpoint philosophy

Breakpoints should reflect behavior, not just width.

### Wide desktop

- can support hierarchy rail plus primary content plus contextual side content

### Narrow desktop / tablet

- reduce to two major regions
- preserve readability over maximum simultaneous visibility

### Mobile

- prioritize one primary task per screen
- stack content vertically
- collapse filters, metadata, and secondary actions progressively

## 4.3 Spacing and density

Balanced density means:

- enough whitespace for calm scanning
- enough visible content to feel operationally useful
- card interiors should be compact but breathable
- list/table surfaces should not feel crowded or spreadsheet-like

## 5. Navigation Model

Navigation should be Today-first.

Top-level destinations:

- `Today`
- `All Tasks`
- `Inbox`
- `Settings`

### Navigation rules

- `Today` is the default landing screen
- `All Tasks` is the browse and control surface
- `Inbox` is a capture-and-triage surface, not a permanent hierarchy location
- `Settings` remains intentionally lightweight

### Future mobile navigation

- use bottom navigation for these same top-level destinations
- keep one global capture action accessible across screens
- use detail pages and sheets instead of nested desktop panel behaviors

## 6. Shared Component System

All shared components should work with real or mocked data and support empty, loading, and error-adjacent states.

Each component below includes usage, minimum content, states, and mobile adaptation.

## 6.1 App shell

### Use

Wraps every primary screen.

### Minimum content

- app identity
- primary navigation
- quick capture affordance
- page content container

### States

- default
- loading shell
- compact shell for narrower widths

### Mobile adaptation

- top bar plus bottom nav
- capture becomes sticky FAB or persistent composer entry point

### Type

Interactive and informational

## 6.2 Primary navigation

### Use

Move between top-level destinations.

### Minimum content

- Today
- All Tasks
- Inbox
- Settings

### States

- active
- inactive
- hover/focus
- compact

### Mobile adaptation

- becomes bottom navigation with labels, not icon-only

### Type

Interactive

## 6.3 Page header

### Use

Introduces each screen and houses local actions.

### Minimum content

- page title
- supporting context or description when needed
- primary or secondary actions

### States

- simple
- action-heavy
- sticky on long screens where useful

### Mobile adaptation

- trim supporting copy
- keep only highest-priority actions visible

### Type

Informational and interactive

## 6.4 Quick capture bar

### Use

Global fast task entry.

### Minimum content

- input field
- submit action
- optional voice trigger placeholder

### States

- idle
- typing
- submitting
- suggestion-ready
- error

### Mobile adaptation

- becomes a prominent sticky entry point or collapsible composer

### Type

Interactive

## 6.5 Lens switcher

### Use

Switch prioritization mode on Today.

### Minimum content

- current lens
- alternate lenses

### States

- selected
- switching
- disabled during generation

### Mobile adaptation

- native select or compact dropdown

### Type

Interactive

## 6.6 AI briefing card

### Use

Sets the tone and priorities for the Today screen.

### Minimum content

- concise heading or summary
- 2 to 4 sentences of briefing copy
- optional context note such as current lens

### States

- ready
- regenerating
- empty
- failed

### Mobile adaptation

- full-width block at top of Today

### Type

Informational

## 6.7 Recommendation group section

### Use

Organizes Today tasks into editorial groupings.

### Minimum content

- group title
- short supporting label or count
- task list

### States

- populated
- collapsed
- empty

### Mobile adaptation

- stacked sections with clear separators

### Type

Informational and interactive

## 6.8 Task card

### Use

Primary Today recommendation surface.

### Minimum content

- task title
- hierarchy path
- reason it matters
- labeled `Next Action:` text
- key metadata
- immediate actions

### States

- default
- hover/focus
- completed
- waiting on
- dismissed
- loading action

### Mobile adaptation

- larger touch targets
- actions remain visible without requiring hover
- supporting reason text should wrap naturally rather than relying on pill treatment

### Type

Informational and interactive

## 6.9 Task list row

### Use

Primary row pattern for All Tasks.

### Minimum content

- title
- status
- area/list context
- labeled `Next Action:` text
- due or recurrence indicator if present

### States

- selected
- unselected
- completed
- waiting on
- compact

### Mobile adaptation

- convert from row to stacked compact card/list item

### Type

Informational and interactive

## 6.10 Hierarchy tree item

### Use

Display area/list structure in navigation or side rail.

### Minimum content

- label
- nesting affordance
- optional count

### States

- expanded
- collapsed
- active
- hovered/focused

### Mobile adaptation

- becomes accordion list or drill-in view

### Type

Interactive

## 6.11 Filter bar and chips

### Use

Refine All Tasks and related views.

### Minimum content

- search
- active filters
- clear action

### States

- empty
- filtered
- overflow

### Mobile adaptation

- collapsible filter sheet

### Type

Interactive

## 6.12 Tag pill

### Use

Show cross-cutting task labels.

### Minimum content

- tag name

### States

- neutral
- selected
- removable

### Mobile adaptation

- wrap naturally and truncate only as needed

### Type

Informational or interactive depending on context

## 6.13 Status badge

### Use

Show task state.

### Minimum content

- Open
- Waiting On
- Done

### States

- default per status
- compact

### Mobile adaptation

- preserve legibility at smaller sizes

### Type

Informational

## 6.14 Recommendation reason text

### Use

Explain why a task is surfaced on Today.

### Minimum content

- short supporting sentence or phrase

### States

- default supporting text
- compact supporting text
- loading / regenerating placeholder

### Mobile adaptation

- place beneath hierarchy metadata and above the main title if space is tight

### Type

Informational

## 6.15 Subtask checklist block

### Use

Display and update subtasks inside detail views.

### Minimum content

- list of subtasks
- completion state
- add action
- inline rename support for existing subtasks

### States

- empty
- populated
- editing

### Mobile adaptation

- full-width list with generous tap targets

### Type

Interactive

## 6.16 Comment thread block

### Use

Display notes, updates, and contextual comments.

### Minimum content

- comment body
- timestamp
- add comment action

### States

- empty
- populated
- composing

### Mobile adaptation

- keep composer sticky when practical

### Type

Informational and interactive

## 6.17 Empty state

### Use

Handle blank results or first-use moments.

### Minimum content

- clear explanation
- next-step action

### States

- first use
- filtered empty
- success empty

### Mobile adaptation

- same structure, shorter copy

### Type

Informational and interactive

## 6.18 Loading and skeleton states

### Use

Preserve structure during async or mocked-latency behavior.

### Minimum content

- recognizable layout placeholder

### States

- page load
- partial refresh
- inline action loading

### Mobile adaptation

- mirror final layout shape closely

### Type

Informational

## 6.19 Confirmation toast / inline feedback

### Use

Reinforce successful actions.

### Minimum content

- short confirmation copy

### States

- success
- warning
- undo-ready when appropriate

### Mobile adaptation

- bottom anchored or inline near changed content

### Type

Informational

## 6.20 Drawer / sheet / modal primitives

### Use

Support secondary interactions without overwhelming the main screen.

### Minimum content

- title
- content area
- dismiss affordance

### States

- open
- closing
- blocking
- non-blocking

### Mobile adaptation

- default to full-height sheets

### Type

Interactive

## 7. Screen UX Guidance

## 7.1 Today

### Role

Today is the primary execution screen and should feel like a concise morning briefing plus a practical work list.

### Layout

Desktop `v1.1` should use either:

- a strong single-column editorial layout, or
- a two-region layout with briefing/context above or beside grouped recommendations

Preferred default:

- centered page width
- briefing and controls at top
- grouped recommendations in a single readable stack

### Content priorities

1. AI briefing
2. lens and regeneration controls
3. feedback input
4. grouped recommendations

### Recommendation behavior

- use a medium-length plan
- each group should feel intentionally curated
- avoid more tasks than the user can mentally hold as "today's plan"

### Task card emphasis

Every Today card should prominently show:

- title
- reason summary
- a labeled `Next Action:` line
- minimal supporting metadata
- quick actions

Supporting metadata can include:

- area or list
- due/recurrence cue
- waiting-on cue
- GitHub indicator where relevant

### Interaction rules

- marking done should feel immediate
- marking waiting-on should allow a short follow-up note
- dismissing should remove clutter without feeling destructive
- regeneration should show visible but lightweight progress

### Feedback input

The input should feel like steering:

- "Need easier wins this morning"
- "Not focusing on Patchwork today"
- "Need deep work only"

It should not resemble a chat transcript.

## 7.2 All Tasks

### Role

All Tasks is the control surface and trusted system of record.

### Layout

Desktop `v1.1` should use:

- hierarchy rail on the left
- primary task list in the center
- optional contextual detail support where useful

Task detail should still primarily resolve to a dedicated page model.

### UX goals

- hierarchy should be instantly legible
- filters should be easy to understand
- search should feel close to the content it affects
- the user should never feel lost in the structure
- the default view should bias toward actionable work, so `Open` is the default status filter

### Visual treatment

- more restrained than Today
- higher information density than Today, but still balanced
- statuses should be visually distinct without flooding rows with strong color
- area/list placement should read as quiet hierarchy text, not a row of pills
- the row's supporting text should favor the labeled next action over the longer description

### Interaction additions

- list items in the hierarchy rail should be directly clickable filters
- tasks should be draggable onto a list in the hierarchy rail to change placement
- area and list creation should happen inline in the hierarchy rail

## 7.3 Inbox / Capture

### Role

Inbox is for rough entry and early triage.

### UX goals

- fast entry
- no pressure to categorize immediately
- visible distinction between "captured" and "organized"

### Treatment

- use unfinished-feeling affordances intentionally
- show AI suggestions as proposals, not edits already applied
- let users accept compatible suggestions across multiple fields before filing the task
- keep accepted suggestions visible in a staged-changes block until the user explicitly files the task
- when a next-action suggestion is accepted for filing, show it as the task's pending labeled next action rather than generic description text

### Suggest-only behavior

The UI must visually separate:

- saved current state
- AI suggested change
- accepted change
- filed final state

Examples:

- current area shown as plain metadata
- suggested area shown in a highlighted suggestion card
- accepted suggestion reflected in a staged-changes block
- task leaves Inbox only when `File task` is clicked

## 7.4 Task Detail

### Role

Task detail is the authoritative place to understand and edit one task.

### Primary model

Use dedicated task pages as the default model.

Desktop may still use linked detail panels in specific flows if that does not weaken the dedicated-page mental model.

### Required sections

- summary
- status and hierarchy metadata
- subtasks
- notes/comments
- history
- linked GitHub information when present

### Editing behavior

- edits should feel structured, not form-heavy
- fields should be grouped by importance
- optional fields should not dominate the page
- deletion should exist, but remain secondary and clearly destructive
- status actions should only show meaningful next transitions, not the current state repeated
- the active next action should be editable directly on the task and reflected in one visually identified linked checklist item
- editing that linked checklist item should keep the task's active next action in sync

## 7.5 Settings

### Role

Settings should tune the assistant, not overwhelm the user.

### Structure

Priority order:

1. prioritization preferences
2. AI behavior explanations where needed
3. GitHub connection
4. import entry points

### Design rules

- sparse, practical layout
- clear sectioning
- avoid control-panel aesthetics

## 8. Responsive and Mobile Principles

## 8.1 Mobile direction

Even though `v1.1` ships desktop-first, the design system should optimize for a future native-like mobile/PWA experience.

### Mobile rules

- use bottom navigation for primary destinations
- keep primary actions thumb-reachable
- move complex desktop panels into sheets or separate views
- stack content vertically before compressing it
- keep one dominant action per screen
- avoid hover-only affordances entirely
- avoid relying on pill-heavy controls where a native input is clearer on mobile

## 8.2 Responsive transformation rules

### Today

- desktop grouped stack becomes full-width mobile sections
- briefing remains first and visible
- lens control becomes a compact dropdown

### All Tasks

- hierarchy rail becomes accordion or drill-in navigation
- filters collapse into a sheet
- task detail becomes a dedicated screen

### Inbox

- capture remains front-loaded and sticky
- suggestions stack beneath the captured item

## 9. Interaction Rules

## 9.1 Core actions

Quick actions should feel immediate and confidence-building.

Use inline or near-inline feedback for:

- mark done
- mark waiting on
- comment saved
- dismiss from Today
- regenerate Today completed

## 9.2 Async behavior

Even in `v1.1`, mocked async flows should be designed clearly.

Required states:

- initial loading
- inline mutation loading
- success
- recoverable error

## 9.3 Motion

Use motion sparingly and purposefully:

- panel and page transitions
- Today regeneration feedback
- confirmation feedback after status changes

Motion should explain state change, not decorate the interface.

## 10. Public UI Interfaces and Contracts

The design doc should define the visual and behavioral contracts that frontend components and mock data must follow.

## 10.1 Shared screen anatomy

Define anatomy for:

- Today
- All Tasks
- Inbox
- Task Detail
- Settings

Each anatomy should specify:

- primary purpose
- mandatory regions
- optional regions
- primary action
- mobile transformation

## 10.2 Component contracts

Define contracts for at least:

- task card
- task list row
- hierarchy tree item
- AI briefing card
- filter bar
- quick capture input

Each contract should specify:

- required content
- optional metadata
- action affordances
- empty/loading/error behavior
- mobile behavior

## 10.3 Visual state models

The design system must define visual states for:

- task status: Open, Waiting On, Done
- AI suggestion state: suggested, accepted, ignored
- Inbox filing state: captured, staged, filed
- screen state: empty, loading, partial, error

## 11. `v1.1` Design Constraints

`v1.1` is not a throwaway prototype. It is the first complete UX validation release.

### Rules

- screens must feel production-like even when backed by stubs
- mock data must represent realistic complexity
- empty, loading, and error states must be intentionally designed
- component contracts should anticipate `v1.2` without forcing redesign

### Required fixture scenarios

- busy Today with cross-area work
- quiet Today with a short plan
- waiting-on follow-up tasks
- GitHub-linked software work
- recurring admin tasks
- messy Inbox capture with AI suggestions
- sparse new-workspace experience
- mobile layouts with wrapped hierarchy text instead of hierarchy pills

## 12. Validation Plan

## 12.1 UX validation goals

The design is successful if it demonstrates:

- Today feels immediately useful
- the app feels like guidance, not clutter
- capture feels forgiving
- hierarchy feels trustworthy
- AI suggestions are clear and non-intrusive
- desktop layouts clearly translate to future mobile/PWA patterns

## 12.2 Review scenarios

Review the design against:

- full data
- sparse data
- empty state
- loading state
- error state
- long titles and comments
- many tags and no tags
- many subtasks and no subtasks

## 12.3 Mobile-readiness pass

Before considering the design doc complete, each primary screen and shared component should receive a mobile-readiness pass covering:

- thumb reach
- content stacking
- action visibility
- filter behavior
- detail-view transformation

## 13. Defaults Locked By This Document

- product stance is Today-first
- visual direction is editorial focus
- density is balanced
- mobile direction is native-like
- task detail defaults to dedicated pages
- Inbox remains a task flag, not a hierarchy node
- AI remains suggest-only
- Today uses a medium-length recommendation set
- emotional clarity and execution confidence matter more than maximum data density
