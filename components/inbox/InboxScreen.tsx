"use client";

import { useState } from "react";
import { TagPill } from "@/components/shared/TagPill";
import { useAppState } from "@/components/shared/AppStateProvider";

function findAcceptedValue(
  task: {
    suggestions: Array<{
      field: "title" | "areaId" | "listId" | "tagId" | "nextStep";
      state: "suggested" | "accepted" | "ignored";
      value: string;
    }>;
  },
  field: "title" | "areaId" | "listId"
) {
  return task.suggestions.find(
    (suggestion) => suggestion.field === field && suggestion.state === "accepted"
  )?.value;
}

export function InboxScreen() {
  const {
    state,
    isSaving,
    applySuggestion,
    ignoreSuggestion,
    fileTaskFromInbox,
    getAreaName
  } = useAppState();
  const inboxTasks = state.tasks.filter((task) => task.isInbox);
  const [placementArea, setPlacementArea] = useState<Record<string, string>>({});
  const [placementList, setPlacementList] = useState<Record<string, string>>({});

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Inbox</p>
          <h2>Capture first. Organize once the thought is safe.</h2>
          <p>
            Inbox is a temporary holding state for rough work. Suggestions should help
            without taking control.
          </p>
        </div>
        <div className="hero-side">
          <button type="button" disabled>
            Voice capture coming later
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Captured items</p>
            <h3>{inboxTasks.length} items waiting for triage</h3>
          </div>
        </div>
        <div className="task-card-stack">
          {inboxTasks.length ? (
            inboxTasks.map((task) => {
              const acceptedTitle = findAcceptedValue(task, "title");
              const acceptedAreaName = findAcceptedValue(task, "areaId");
              const acceptedListName = findAcceptedValue(task, "listId");
              const acceptedNextAction = task.suggestions.find(
                (suggestion) =>
                  suggestion.field === "nextStep" && suggestion.state === "accepted"
              )?.value;
              const acceptedTags = task.suggestions.filter(
                (suggestion) =>
                  suggestion.field === "tagId" && suggestion.state === "accepted"
              );
              const suggestedAreaFromAcceptance = state.areas.find(
                (area) => area.name === acceptedAreaName
              );
              const manualAreaId = placementArea[task.id];
              const selectedAreaId =
                manualAreaId ??
                suggestedAreaFromAcceptance?.id ??
                task.areaId ??
                "";
              const availableLists = state.lists.filter((list) => list.areaId === selectedAreaId);
              const acceptedListFromAcceptance = availableLists.find(
                (list) => list.name === acceptedListName
              );
              const manualListId = placementList[task.id];
              const autoListId =
                acceptedListFromAcceptance?.id ??
                (availableLists.length === 1 ? availableLists[0].id : "");
              const selectedListId = manualListId ?? task.listId ?? autoListId;
              const needsListSelection = Boolean(selectedAreaId) && !selectedListId;
              const stagedLines = [
                acceptedTitle ? `Title: ${acceptedTitle}` : null,
                acceptedNextAction ? `Next action: ${acceptedNextAction}` : null,
                selectedAreaId
                  ? `Area: ${state.areas.find((area) => area.id === selectedAreaId)?.name ?? "Unknown"}`
                  : null,
                selectedListId
                  ? `List: ${state.lists.find((list) => list.id === selectedListId)?.name ?? "Unknown"}`
                  : null
              ].filter(Boolean) as string[];

              return (
                <article key={task.id} className="task-card">
                  <p className="eyebrow">Current state</p>
                  <h3>{task.title}</h3>
                  <p className="task-next-action">
                    <strong>Next Action:</strong>{" "}
                    {acceptedNextAction || task.nextAction || "No next action yet."}
                  </p>
                  <p className="task-meta">Current area: {getAreaName(task.areaId)}</p>

                  {task.suggestions.length ? (
                    <div className="suggestion-stack">
                      {task.suggestions.map((suggestion) => (
                        <div key={suggestion.id} className={`suggestion-card ${suggestion.state}`}>
                          <div>
                            <p className="eyebrow">{suggestion.label}</p>
                            <strong>{suggestion.value}</strong>
                          </div>
                          <div className="action-row">
                            <button
                              type="button"
                              onClick={() => applySuggestion(task.id, suggestion.id)}
                              disabled={suggestion.state === "accepted" || isSaving}
                            >
                              {suggestion.state === "accepted" ? "Accepted" : "Accept"}
                            </button>
                            <button
                              type="button"
                              onClick={() => ignoreSuggestion(task.id, suggestion.id)}
                              disabled={suggestion.state === "ignored" || isSaving}
                            >
                              {suggestion.state === "ignored" ? "Ignored" : "Ignore"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="staged-block">
                    <p className="eyebrow">Staged changes</p>
                    {stagedLines.length || acceptedTags.length ? (
                      <div className="staged-stack">
                        {stagedLines.map((line) => (
                          <p key={line} className="task-meta">
                            {line}
                          </p>
                        ))}
                        {acceptedTags.length ? (
                          <div className="tag-row">
                            {acceptedTags.map((tag) => (
                              <TagPill key={tag.id} label={tag.value} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="muted-copy">
                        Accept any combination of title, area, list, and tag suggestions before filing.
                      </p>
                    )}
                  </div>

                  <div className="placement-grid">
                    <label className="field-block">
                      <span>Area</span>
                      <select
                        value={selectedAreaId}
                        onChange={(event) => {
                          const nextAreaId = event.target.value;
                          const nextLists = state.lists.filter((list) => list.areaId === nextAreaId);
                          setPlacementArea((current) => ({
                            ...current,
                            [task.id]: nextAreaId
                          }));
                          setPlacementList((current) => ({
                            ...current,
                            [task.id]: nextLists.length === 1 ? nextLists[0].id : ""
                          }));
                        }}
                        disabled={isSaving}
                      >
                        <option value="">Choose an area...</option>
                        {state.areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-block">
                      <span>List</span>
                      <select
                        value={selectedListId}
                        onChange={(event) =>
                          setPlacementList((current) => ({
                            ...current,
                            [task.id]: event.target.value
                          }))
                        }
                        disabled={isSaving || !selectedAreaId}
                      >
                        <option value="">
                          {selectedAreaId ? "Choose a list..." : "Select an area first"}
                        </option>
                        {availableLists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="action-row">
                    <button
                      type="button"
                      disabled={isSaving || !selectedAreaId || !selectedListId || needsListSelection}
                      onClick={() =>
                        fileTaskFromInbox(task.id, selectedAreaId || null, selectedListId || null)
                      }
                    >
                      File task
                    </button>
                  </div>
                  {needsListSelection ? (
                    <p className="muted-copy">Choose a list before filing this task.</p>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="empty-card">
              <h4>Inbox is clear</h4>
              <p>Use quick capture or voice capture when new work shows up.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
