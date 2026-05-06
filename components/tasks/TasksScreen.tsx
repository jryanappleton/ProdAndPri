"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useAppState } from "@/components/shared/AppStateProvider";

type StatusFilter = "all" | "open" | "waiting_on" | "done";

export function TasksScreen() {
  const {
    state,
    isSaving,
    createArea,
    createList,
    deleteArea,
    deleteList,
    updateTaskPlacement,
    updateTask,
    setTaskStatus,
    deleteTask,
    getAreaName,
    getListName,
    getTagNames
  } = useAppState();

  const [activeArea, setActiveArea] = useState<string | "all">("all");
  const [activeList, setActiveList] = useState<string | "all">("all");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("open");
  const [query, setQuery] = useState("");
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({});
  const [addingListFor, setAddingListFor] = useState<string | null>(null);
  const [listDrafts, setListDrafts] = useState<Record<string, string>>({});
  const [showingAddArea, setShowingAddArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropListId, setDropListId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [nextActionDrafts, setNextActionDrafts] = useState<Record<string, string>>({});

  const defaultExcludedTagId = useMemo(
    () =>
      state.tags.find((tag) => tag.name.trim().toLowerCase() === "lowpri - exclude from today")
        ?.id ?? null,
    [state.tags]
  );
  const [excludedTagIds, setExcludedTagIds] = useState<string[]>(() =>
    defaultExcludedTagId ? [defaultExcludedTagId] : []
  );
  const [hasTouchedTagFilters, setHasTouchedTagFilters] = useState(false);
  const effectiveExcludedTagIds = useMemo(() => {
    if (hasTouchedTagFilters || !defaultExcludedTagId) {
      return excludedTagIds;
    }
    return excludedTagIds.includes(defaultExcludedTagId)
      ? excludedTagIds
      : [...excludedTagIds, defaultExcludedTagId];
  }, [defaultExcludedTagId, excludedTagIds, hasTouchedTagFilters]);

  const nonInboxTasks = useMemo(
    () => state.tasks.filter((task) => !task.isInbox),
    [state.tasks]
  );

  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of nonInboxTasks) {
      if (!task.areaId) continue;
      if (task.status === "done") continue;
      if (effectiveExcludedTagIds.some((id) => task.tagIds.includes(id))) continue;
      counts[task.areaId] = (counts[task.areaId] ?? 0) + 1;
    }
    return counts;
  }, [nonInboxTasks, effectiveExcludedTagIds]);

  const listCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of nonInboxTasks) {
      if (!task.listId) continue;
      if (task.status === "done") continue;
      if (effectiveExcludedTagIds.some((id) => task.tagIds.includes(id))) continue;
      counts[task.listId] = (counts[task.listId] ?? 0) + 1;
    }
    return counts;
  }, [nonInboxTasks, effectiveExcludedTagIds]);

  const allCount = useMemo(() => {
    return nonInboxTasks.filter(
      (task) =>
        task.status !== "done" &&
        !effectiveExcludedTagIds.some((id) => task.tagIds.includes(id))
    ).length;
  }, [nonInboxTasks, effectiveExcludedTagIds]);

  const filteredTasks = useMemo(() => {
    return nonInboxTasks.filter((task) => {
      if (activeArea !== "all" && task.areaId !== activeArea) return false;
      if (activeList !== "all" && task.listId !== activeList) return false;
      if (activeStatus !== "all" && task.status !== activeStatus) return false;
      if (effectiveExcludedTagIds.some((tagId) => task.tagIds.includes(tagId))) return false;
      if (
        query &&
        !`${task.title} ${task.nextAction} ${task.description}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [activeArea, activeList, activeStatus, effectiveExcludedTagIds, query, nonInboxTasks]);

  const activeAreaName =
    activeArea === "all" ? null : state.areas.find((a) => a.id === activeArea)?.name ?? null;
  const activeListName =
    activeList === "all"
      ? null
      : state.lists.find((list) => list.id === activeList)?.name ?? null;

  const excludedTagNames = useMemo(() => {
    return effectiveExcludedTagIds
      .map((id) => state.tags.find((tag) => tag.id === id)?.name)
      .filter((name): name is string => Boolean(name));
  }, [effectiveExcludedTagIds, state.tags]);

  async function handleCreateArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newAreaName.trim()) return;
    await createArea(newAreaName);
    setNewAreaName("");
    setShowingAddArea(false);
  }

  async function handleDeleteArea(areaId: string, areaName: string) {
    const confirmed = window.confirm(
      `Delete the "${areaName}" area? Tasks in it will be moved back to Inbox.`
    );
    if (!confirmed) return;
    await deleteArea(areaId);
    if (activeArea === areaId) {
      setActiveArea("all");
      setActiveList("all");
    }
  }

  async function handleDeleteList(listId: string, listName: string) {
    const confirmed = window.confirm(
      `Delete the "${listName}" list? Tasks in it will be moved back to Inbox.`
    );
    if (!confirmed) return;
    await deleteList(listId);
    if (activeList === listId) {
      setActiveList("all");
    }
  }

  async function handleAddList(event: FormEvent<HTMLFormElement>, areaId: string) {
    event.preventDefault();
    const draft = listDrafts[areaId]?.trim();
    if (!draft) return;
    await createList(areaId, draft);
    setListDrafts((current) => ({ ...current, [areaId]: "" }));
    setAddingListFor(null);
  }

  function toggleArea(areaId: string) {
    setCollapsedAreas((current) => ({ ...current, [areaId]: !current[areaId] }));
  }

  function selectArea(areaId: string) {
    setActiveArea(areaId);
    setActiveList("all");
  }

  function selectList(areaId: string, listId: string) {
    setActiveArea(areaId);
    setActiveList(listId);
  }

  function beginEditingNextAction(taskId: string, currentValue: string) {
    setEditingTaskId(taskId);
    setNextActionDrafts((current) => ({
      ...current,
      [taskId]: current[taskId] ?? currentValue
    }));
  }

  async function saveNextAction(taskId: string) {
    const task = state.tasks.find((entry) => entry.id === taskId);
    if (!task) return;
    await updateTask({
      taskId,
      title: task.title,
      description: task.description,
      nextAction: nextActionDrafts[taskId] ?? "",
      areaId: task.areaId,
      listId: task.listId,
      tagIds: task.tagIds
    });
    setEditingTaskId(null);
  }

  function toggleExcludedTag(tagId: string) {
    setHasTouchedTagFilters(true);
    setExcludedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  }

  const statusSegs: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "waiting_on", label: "Waiting" },
    { value: "done", label: "Done" }
  ];

  const pageTitle = activeListName ?? activeAreaName ?? "All tasks";
  const countLabel =
    activeStatus === "open"
      ? `${filteredTasks.length} open`
      : activeStatus === "waiting_on"
        ? `${filteredTasks.length} waiting`
        : activeStatus === "done"
          ? `${filteredTasks.length} done`
          : `${filteredTasks.length}`;
  const subtitle = activeListName
    ? `Tasks in ${activeListName}.`
    : activeAreaName
      ? `Tasks across ${activeAreaName}.`
      : "Your system of record across every area and list.";

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="side-head">
          <h2>Areas</h2>
          <button
            type="button"
            className="btn sm"
            onClick={() => setShowingAddArea((v) => !v)}
            disabled={isSaving}
          >
            ＋ New area
          </button>
        </div>

        {showingAddArea ? (
          <form className="add-area-form" onSubmit={handleCreateArea}>
            <input
              autoFocus
              value={newAreaName}
              onChange={(event) => setNewAreaName(event.target.value)}
              placeholder="Area name"
              disabled={isSaving}
            />
            <button type="submit" className="btn sm" disabled={isSaving}>
              Add
            </button>
          </form>
        ) : null}

        <div className="tree">
          <div
            className={`all-row${activeArea === "all" ? " selected" : ""}`}
            onClick={() => {
              setActiveArea("all");
              setActiveList("all");
            }}
            role="button"
            tabIndex={0}
          >
            <span className="caret" aria-hidden="true" />
            <span className="label">All tasks</span>
            <span className="count">{allCount}</span>
          </div>

          {state.areas.map((area) => {
            const areaLists = state.lists.filter((list) => list.areaId === area.id);
            const collapsed = collapsedAreas[area.id];
            const areaSelected = activeArea === area.id && activeList === "all";
            return (
              <div key={area.id} className="area">
                <div
                  className={`area-row${areaSelected ? " selected" : ""}`}
                  onClick={() => selectArea(area.id)}
                  role="button"
                  tabIndex={0}
                >
                  <button
                    type="button"
                    className={`caret${collapsed ? " collapsed" : ""}`}
                    aria-label={collapsed ? "Expand area" : "Collapse area"}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleArea(area.id);
                    }}
                  >
                    <svg viewBox="0 0 10 10" aria-hidden="true">
                      <path
                        d="M2 4l3 3 3-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <span className="label">{area.name}</span>
                  <span className="count">{areaCounts[area.id] ?? 0}</span>
                  <button
                    type="button"
                    className="row-action danger"
                    aria-label={`Delete ${area.name}`}
                    title={`Delete ${area.name}`}
                    disabled={isSaving}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteArea(area.id, area.name);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M3 4h10M6 4V3h4v1M5 4l.5 9a1 1 0 001 1h3a1 1 0 001-1L11 4" />
                    </svg>
                  </button>
                </div>

                <div className={`children${collapsed ? " collapsed" : ""}`}>
                  {areaLists.map((list) => {
                    const listSelected = activeList === list.id;
                    const isDropTarget = dropListId === list.id;
                    return (
                      <div
                        key={list.id}
                        className={`list-row${listSelected ? " selected" : ""}${isDropTarget ? " drop-target" : ""}`}
                        onClick={() => selectList(area.id, list.id)}
                        role="button"
                        tabIndex={0}
                        onDragOver={(event) => {
                          if (!draggingTaskId) return;
                          event.preventDefault();
                          setDropListId(list.id);
                        }}
                        onDragLeave={() => {
                          if (dropListId === list.id) {
                            setDropListId(null);
                          }
                        }}
                        onDrop={async (event) => {
                          if (!draggingTaskId) return;
                          event.preventDefault();
                          setDropListId(null);
                          setDraggingTaskId(null);
                          await updateTaskPlacement(draggingTaskId, area.id, list.id);
                        }}
                      >
                        <span className="label">{list.name}</span>
                        <span className="count">{listCounts[list.id] ?? 0}</span>
                        <button
                          type="button"
                          className="row-action danger"
                          aria-label={`Delete ${list.name}`}
                          title={`Delete ${list.name}`}
                          disabled={isSaving}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteList(list.id, list.name);
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M3 4h10M6 4V3h4v1M5 4l.5 9a1 1 0 001 1h3a1 1 0 001-1L11 4" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}

                  {addingListFor === area.id ? (
                    <form
                      className="add-list-form"
                      onSubmit={(event) => handleAddList(event, area.id)}
                    >
                      <input
                        autoFocus
                        value={listDrafts[area.id] ?? ""}
                        onChange={(event) =>
                          setListDrafts((current) => ({
                            ...current,
                            [area.id]: event.target.value
                          }))
                        }
                        placeholder="List name"
                        onBlur={() => {
                          if (!listDrafts[area.id]?.trim()) {
                            setAddingListFor(null);
                          }
                        }}
                        disabled={isSaving}
                      />
                      <button type="submit" className="btn sm" disabled={isSaving}>
                        Add
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="add-list"
                      onClick={() => setAddingListFor(area.id)}
                      disabled={isSaving}
                    >
                      <span className="plus">+</span>
                      Add a list
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="tree-footer">
          <div className="side-head">
            <h2>Exclude tags</h2>
          </div>
          <div className="tag-cloud">
            {state.tags.length ? (
              state.tags.map((tag) => {
                const excluded = effectiveExcludedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={excluded ? "excluded" : undefined}
                    onClick={() => toggleExcludedTag(tag.id)}
                    disabled={isSaving}
                  >
                    {tag.name}
                  </button>
                );
              })
            ) : (
              <span className="muted-note">No tags yet</span>
            )}
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="main-head">
          <div>
            <div className="crumbs">
              <span>All Tasks</span>
              {activeAreaName ? (
                <>
                  <span className="sep">/</span>
                  <span>{activeAreaName}</span>
                </>
              ) : null}
              {activeListName ? (
                <>
                  <span className="sep">/</span>
                  <span>{activeListName}</span>
                </>
              ) : null}
            </div>
            <h1 className="title">
              {pageTitle} <span className="count">{countLabel}</span>
            </h1>
            <p className="title-sub">{subtitle}</p>
          </div>
        </div>

        <div className="filter-strip">
          <div className="search">
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              style={{ color: "var(--muted)" }}
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m17 17-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles and notes…"
            />
          </div>
          <div className="seg" role="tablist">
            {statusSegs.map((seg) => (
              <button
                key={seg.value}
                type="button"
                className={activeStatus === seg.value ? "active" : undefined}
                onClick={() => setActiveStatus(seg.value)}
              >
                {seg.label}
              </button>
            ))}
          </div>
          {excludedTagNames.length ? (
            <span className="excluded-note">
              Excluding <strong>{excludedTagNames.join(", ")}</strong>
            </span>
          ) : null}
        </div>

        <div className="task-list">
          {filteredTasks.length ? (
            filteredTasks.map((task) => {
              const isWaiting = task.status === "waiting_on";
              const isDone = task.status === "done";
              const tagNames = getTagNames(task.tagIds);
              return (
                <article
                  key={task.id}
                  className={`task${isWaiting ? " waiting" : ""}${isDone ? " done" : ""}`}
                  draggable
                  onDragStart={() => setDraggingTaskId(task.id)}
                  onDragEnd={() => {
                    setDraggingTaskId(null);
                    setDropListId(null);
                  }}
                >
                  <span className="handle" aria-hidden="true">⋮⋮</span>
                  <input
                    type="checkbox"
                    className="check"
                    checked={isDone}
                    disabled={isSaving}
                    aria-label={`Mark ${task.title} done`}
                    onChange={(event) =>
                      setTaskStatus(task.id, event.target.checked ? "done" : "open")
                    }
                  />
                  <div className="task-body">
                    <Link href={`/tasks/${task.id}`} className="title-line">
                      {task.title}
                    </Link>
                    {task.nextAction ? (
                      <div className="next-action">
                        <span className="marker">Next →</span>
                        <span>{task.nextAction}</span>
                      </div>
                    ) : (
                      <div className="next-action empty">
                        <span className="marker">Next →</span>
                        <span>No next action yet</span>
                      </div>
                    )}
                    <div className="meta-line">
                      <span className="chip path">
                        <span className="area">{getAreaName(task.areaId)}</span>
                        {task.listId ? (
                          <>
                            <span className="sep">/</span>
                            {getListName(task.listId)}
                          </>
                        ) : null}
                      </span>
                      {isWaiting ? (
                        <span className="chip status-waiting_on">
                          Waiting{task.waitingSince ? ` · ${task.waitingSince}` : ""}
                        </span>
                      ) : null}
                      {isDone ? <span className="chip status-done">Done</span> : null}
                      {task.dueDate ? <span className="chip due">Due {task.dueDate}</span> : null}
                      {task.githubLink ? (
                        <span className="chip">GH #{task.githubLink.issueNumber}</span>
                      ) : null}
                      {tagNames.map((tag) => (
                        <span key={tag} className="chip tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {editingTaskId === task.id ? (
                      <div className="inline-edit">
                        <input
                          autoFocus
                          value={nextActionDrafts[task.id] ?? ""}
                          onChange={(event) =>
                            setNextActionDrafts((current) => ({
                              ...current,
                              [task.id]: event.target.value
                            }))
                          }
                          placeholder="Define the next concrete step…"
                          disabled={isSaving}
                        />
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => saveNextAction(task.id)}
                          disabled={isSaving}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn sm ghost"
                          onClick={() => setEditingTaskId(null)}
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="task-actions">
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => beginEditingNextAction(task.id, task.nextAction)}
                      disabled={isSaving}
                    >
                      {task.nextAction ? "Edit next" : "Add next"}
                    </button>
                    {!isDone ? (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setTaskStatus(task.id, "done")}
                        disabled={isSaving}
                      >
                        Done
                      </button>
                    ) : null}
                    {!isWaiting && !isDone ? (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setTaskStatus(task.id, "waiting_on")}
                        disabled={isSaving}
                      >
                        Waiting
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => {
                        if (window.confirm(`Delete "${task.title}"?`)) {
                          deleteTask(task.id);
                        }
                      }}
                      disabled={isSaving}
                      title="Delete task"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-state">
              {nonInboxTasks.length
                ? "No tasks match these filters."
                : "No tasks yet. Capture some, then organize them into areas and lists."}
            </div>
          )}
        </div>

        {draggingTaskId ? (
          <p className="drag-hint">
            Dragging task — drop onto a list in the rail to move it.
          </p>
        ) : null}
      </main>
    </div>
  );
}
