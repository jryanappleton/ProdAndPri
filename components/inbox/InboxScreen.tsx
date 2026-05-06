"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/components/shared/AppStateProvider";
import type { TaskSuggestion } from "@/lib/types";

type SuggestionGroupKey = "details" | "place" | "tags";

const groupMeta: Record<SuggestionGroupKey, string> = {
  details: "Task details",
  place: "Place this task",
  tags: "Tags"
};

function groupForField(field: TaskSuggestion["field"]): SuggestionGroupKey {
  if (field === "title" || field === "nextStep") return "details";
  if (field === "areaId" || field === "listId") return "place";
  return "tags";
}

function labelForField(field: TaskSuggestion["field"]): string {
  switch (field) {
    case "title":
      return "Clarify title";
    case "nextStep":
      return "Propose next action";
    case "areaId":
      return "Assign to area";
    case "listId":
      return "Put in list";
    case "tagId":
      return "Suggest tag";
  }
}

function findAcceptedValue(
  suggestions: TaskSuggestion[],
  field: TaskSuggestion["field"]
) {
  return suggestions.find(
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
    getAreaName,
    getListName
  } = useAppState();

  const inboxTasks = useMemo(
    () => state.tasks.filter((task) => task.isInbox),
    [state.tasks]
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    inboxTasks[0]?.id ?? null
  );
  const [placementArea, setPlacementArea] = useState<Record<string, string>>({});
  const [placementList, setPlacementList] = useState<Record<string, string>>({});

  const activeTaskId =
    selectedId && inboxTasks.some((task) => task.id === selectedId)
      ? selectedId
      : inboxTasks[0]?.id ?? null;
  const task = useMemo(
    () => inboxTasks.find((entry) => entry.id === activeTaskId) ?? null,
    [activeTaskId, inboxTasks]
  );

  const suggestionsByGroup = useMemo(() => {
    const map: Record<SuggestionGroupKey, TaskSuggestion[]> = {
      details: [],
      place: [],
      tags: []
    };
    if (task) {
      for (const suggestion of task.suggestions) {
        map[groupForField(suggestion.field)].push(suggestion);
      }
    }
    return map;
  }, [task]);

  const pendingCount = task
    ? task.suggestions.filter((s) => s.state === "suggested").length
    : 0;

  const acceptedTitle = task ? findAcceptedValue(task.suggestions, "title") : undefined;
  const acceptedNextAction = task
    ? findAcceptedValue(task.suggestions, "nextStep")
    : undefined;
  const acceptedAreaName = task ? findAcceptedValue(task.suggestions, "areaId") : undefined;
  const acceptedListName = task ? findAcceptedValue(task.suggestions, "listId") : undefined;
  const acceptedTagValues = task
    ? task.suggestions
        .filter((s) => s.field === "tagId" && s.state === "accepted")
        .map((s) => s.value)
    : [];

  const suggestedAreaId =
    acceptedAreaName
      ? state.areas.find((area) => area.name === acceptedAreaName)?.id ?? null
      : null;
  const manualAreaId = task ? placementArea[task.id] : undefined;
  const selectedAreaId = manualAreaId ?? suggestedAreaId ?? task?.areaId ?? "";
  const availableLists = useMemo(
    () => state.lists.filter((list) => list.areaId === selectedAreaId),
    [state.lists, selectedAreaId]
  );
  const acceptedListFromAcceptance = availableLists.find(
    (list) => list.name === acceptedListName
  );
  const manualListId = task ? placementList[task.id] : undefined;
  const autoListId =
    acceptedListFromAcceptance?.id ??
    (availableLists.length === 1 ? availableLists[0].id : "");
  const selectedListId = manualListId ?? task?.listId ?? autoListId;
  const needsListSelection = Boolean(selectedAreaId) && !selectedListId;

  const selectedAreaName = selectedAreaId
    ? state.areas.find((area) => area.id === selectedAreaId)?.name ?? null
    : null;
  const selectedListName = selectedListId
    ? state.lists.find((list) => list.id === selectedListId)?.name ?? null
    : null;

  const previewTitle = acceptedTitle ?? task?.title ?? "";
  const previewNextAction = acceptedNextAction ?? task?.nextAction ?? "";

  async function handleAcceptAll() {
    if (!task) return;
    const toAccept = task.suggestions.filter((s) => s.state === "suggested");
    for (const suggestion of toAccept) {
      await applySuggestion(task.id, suggestion.id);
    }
  }

  async function handleIgnoreAll() {
    if (!task) return;
    const toIgnore = task.suggestions.filter((s) => s.state === "suggested");
    for (const suggestion of toIgnore) {
      await ignoreSuggestion(task.id, suggestion.id);
    }
  }

  async function handleFile() {
    if (!task || !selectedAreaId) return;
    await fileTaskFromInbox(task.id, selectedAreaId, selectedListId || null);
    setPlacementArea((current) => {
      const next = { ...current };
      delete next[task.id];
      return next;
    });
    setPlacementList((current) => {
      const next = { ...current };
      delete next[task.id];
      return next;
    });
    const remaining = inboxTasks.filter((t) => t.id !== task.id);
    setSelectedId(remaining[0]?.id ?? null);
  }

  function describeFrom(suggestion: TaskSuggestion): string {
    if (!task) return "";
    switch (suggestion.field) {
      case "title":
        return task.title;
      case "nextStep":
        return task.nextAction || "No next action yet";
      case "areaId":
        return task.areaId ? getAreaName(task.areaId) : "Inbox";
      case "listId":
        return task.listId ? getListName(task.listId) : "";
      case "tagId":
      default:
        return "";
    }
  }

  return (
    <div className="page inbox-layout">
      <aside className="tri-list">
        <div className="tri-head">
          <h2>Inbox</h2>
          <span className="count">
            {inboxTasks.length} {inboxTasks.length === 1 ? "waiting" : "waiting"}
          </span>
        </div>
        <div className="tri-items">
          {inboxTasks.length ? (
            inboxTasks.map((item) => {
              const isActive = item.id === activeTaskId;
              const pending = item.suggestions.filter(
                (s) => s.state === "suggested"
              ).length;
              const sourceLabel =
                item.source === "voice"
                  ? "Voice"
                  : item.source === "import"
                    ? "Import"
                    : item.source === "github"
                      ? "GitHub"
                      : "Capture";
              const icon =
                item.source === "voice" ? "🎙" : item.source === "github" ? "↗" : "✎";
              return (
                <div
                  key={item.id}
                  className={`tri-item${isActive ? " active" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="tri-icon" aria-hidden="true">
                    {icon}
                  </div>
                  <div className="tri-body">
                    <div className="t">{item.title}</div>
                    <div className="m">
                      <span>{sourceLabel}</span>
                      {pending ? (
                        <>
                          <span className="dot" />
                          <span className="pending">{pending} to review</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="muted-note">Inbox clear. Capture when new work shows up.</p>
          )}
        </div>
      </aside>

      <main className="detail">
        {task ? (
          <>
            <div className="d-head">
              <p className="eyebrow">
                <span className="dot" aria-hidden="true" />
                Captured · {task.source.replace(/_/g, " ")}
              </p>
              <h1 className="d-title">{task.title}</h1>
              <div className="d-meta">
                <span className="chip-path">
                  <span className="area">Inbox</span>
                  <span className="sep">/</span>Unfiled
                </span>
                {task.nextAction ? (
                  <>
                    <span>·</span>
                    <span>{task.nextAction}</span>
                  </>
                ) : (
                  <>
                    <span>·</span>
                    <span>No next action yet</span>
                  </>
                )}
              </div>
            </div>

            {task.suggestions.length ? (
              <div className="ai-bar">
                <span className="kicker">AI suggestions</span>
                <span>
                  {pendingCount
                    ? `${pendingCount} proposed change${pendingCount === 1 ? "" : "s"} · review inline`
                    : "All suggestions reviewed"}
                </span>
                <div className="bulk">
                  <button
                    type="button"
                    className="btn sm"
                    onClick={handleAcceptAll}
                    disabled={isSaving || pendingCount === 0}
                  >
                    Accept all
                  </button>
                  <button
                    type="button"
                    className="btn sm ghost"
                    onClick={handleIgnoreAll}
                    disabled={isSaving || pendingCount === 0}
                  >
                    Ignore all
                  </button>
                </div>
              </div>
            ) : null}

            {(Object.keys(groupMeta) as SuggestionGroupKey[]).map((groupKey) => {
              const rows = suggestionsByGroup[groupKey];
              if (!rows.length) return null;
              return (
                <div className="sgroup" key={groupKey}>
                  <div className="sgroup-head">
                    <span>{groupMeta[groupKey]}</span>
                    <span className="rule" />
                    <span className="n">{rows.length}</span>
                  </div>
                  {rows.map((suggestion) => {
                    const from = describeFrom(suggestion);
                    const iconChar =
                      suggestion.state === "accepted"
                        ? "✓"
                        : suggestion.state === "ignored"
                          ? "–"
                          : "+";
                    const label =
                      suggestion.label && suggestion.label.trim().length > 0
                        ? suggestion.label
                        : labelForField(suggestion.field);
                    return (
                      <div
                        key={suggestion.id}
                        className={`sug ${suggestion.state}${suggestion.state !== "suggested" ? " touched" : ""}`}
                      >
                        <span className={`sug-icon ${suggestion.state}`}>{iconChar}</span>
                        <div className="sug-body">
                          <div className="sug-label">{label}</div>
                          {from ? (
                            <div className="sug-diff">
                              <span className="from">{from}</span>
                              <span className="arr">→</span>
                              <span className="to">{suggestion.value}</span>
                            </div>
                          ) : (
                            <div className="sug-value">
                              <strong>{suggestion.value}</strong>
                            </div>
                          )}
                        </div>
                        <div className="sug-actions">
                          {suggestion.state === "accepted" ? (
                            <span className="state-pill accepted">Accepted</span>
                          ) : null}
                          {suggestion.state === "ignored" ? (
                            <span className="state-pill ignored">Ignored</span>
                          ) : null}
                          {suggestion.state === "suggested" ? (
                            <>
                              <button
                                type="button"
                                className="btn xs accept-btn"
                                onClick={() => applySuggestion(task.id, suggestion.id)}
                                disabled={isSaving}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="btn xs ignore-btn"
                                onClick={() => ignoreSuggestion(task.id, suggestion.id)}
                                disabled={isSaving}
                              >
                                Ignore
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="file-bar">
              <div className="preview">
                <p className="eyebrow">Filed task preview</p>
                <h3 className="pv-title">{previewTitle}</h3>
                <div className="pv-next">
                  <span className="marker">Next →</span>
                  {previewNextAction ? (
                    <span>{previewNextAction}</span>
                  ) : (
                    <span className="muted-italic">No next action yet</span>
                  )}
                </div>
                <div className="pv-meta">
                  {selectedAreaName ? (
                    <span className="chip path">
                      <span className="area">{selectedAreaName}</span>
                      {selectedListName ? (
                        <>
                          <span className="sep">/</span>
                          {selectedListName}
                        </>
                      ) : null}
                    </span>
                  ) : (
                    <span className="chip unset">No area</span>
                  )}
                  {acceptedTagValues.map((tag) => (
                    <span key={tag} className="chip tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="file-actions">
                <div className="selects">
                  <select
                    value={selectedAreaId}
                    onChange={(event) => {
                      const nextAreaId = event.target.value;
                      const nextLists = state.lists.filter(
                        (list) => list.areaId === nextAreaId
                      );
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
                    <option value="">Choose an area…</option>
                    {state.areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
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
                      {selectedAreaId ? "Choose a list…" : "Select an area first"}
                    </option>
                    {availableLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn accent"
                  onClick={handleFile}
                  disabled={
                    isSaving || !selectedAreaId || !selectedListId || needsListSelection
                  }
                >
                  File task →
                </button>
              </div>
              {needsListSelection ? (
                <p className="file-hint">Choose a list before filing this task.</p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="empty-inbox">
            <p className="eyebrow">
              <span className="dot" aria-hidden="true" />
              Inbox clear
            </p>
            <h1 className="d-title">Nothing to triage.</h1>
            <p className="empty-sub">
              Capture first, organize later. Use quick capture above when new work
              shows up.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
