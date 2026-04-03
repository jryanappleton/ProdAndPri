"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useAppState } from "@/components/shared/AppStateProvider";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TagPill } from "@/components/shared/TagPill";

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
  const [activeStatus, setActiveStatus] = useState<"all" | "open" | "waiting_on" | "done">("open");
  const [query, setQuery] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [listDrafts, setListDrafts] = useState<Record<string, string>>({});
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

  const filteredTasks = useMemo(() => {
    return state.tasks.filter((task) => {
      if (task.isInbox) return false;
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
  }, [activeArea, activeList, activeStatus, effectiveExcludedTagIds, query, state.tasks]);

  const activeListName =
    activeList === "all"
      ? null
      : state.lists.find((list) => list.id === activeList)?.name ?? null;
  const visibleLists = useMemo(() => {
    if (activeArea === "all") {
      return state.lists;
    }

    return state.lists.filter((list) => list.areaId === activeArea);
  }, [activeArea, state.lists]);

  async function handleCreateArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createArea(newAreaName);
    setNewAreaName("");
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

  function startEditingNextAction(taskId: string, currentValue: string) {
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

  return (
    <div className="tasks-layout">
      <aside className="panel hierarchy-panel desktop-only">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Hierarchy</p>
            <h3>Areas & lists</h3>
          </div>
        </div>
        <form className="inline-create-form" onSubmit={handleCreateArea}>
          <input
            value={newAreaName}
            onChange={(event) => setNewAreaName(event.target.value)}
            placeholder="Create an area..."
            disabled={isSaving}
          />
          <button type="submit" disabled={isSaving}>
            Add area
          </button>
        </form>
        {!state.areas.length ? (
          <p className="muted-copy">
            Start by creating your first area. Lists can be added underneath each area.
          </p>
        ) : null}
        <button
          type="button"
          className={activeArea === "all" ? "hierarchy-item active" : "hierarchy-item"}
          onClick={() => {
            setActiveArea("all");
            setActiveList("all");
          }}
        >
          All areas
        </button>
        {state.areas.map((area) => (
          <div key={area.id} className="hierarchy-group">
            <div className="hierarchy-row">
              <button
                type="button"
                className={activeArea === area.id ? "hierarchy-item active" : "hierarchy-item"}
                onClick={() => {
                  setActiveArea(area.id);
                  setActiveList("all");
                }}
              >
                {area.name}
              </button>
              <button
                type="button"
                className="icon-button danger-icon-button"
                aria-label={`Delete area ${area.name}`}
                title={`Delete area ${area.name}`}
                disabled={isSaving}
                onClick={() => handleDeleteArea(area.id, area.name)}
              >
                🗑
              </button>
            </div>
            <div className="hierarchy-children">
              {state.lists
                .filter((list) => list.areaId === area.id)
                .map((list) => (
                  <div key={list.id} className="hierarchy-child-row">
                    <button
                      type="button"
                      className={
                        activeList === list.id
                          ? `hierarchy-child hierarchy-child-active${dropListId === list.id ? " hierarchy-child-drop" : ""}`
                          : dropListId === list.id
                            ? "hierarchy-child hierarchy-child-drop"
                            : "hierarchy-child"
                      }
                      onClick={() => {
                        setActiveArea(area.id);
                        setActiveList(list.id);
                      }}
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
                      {list.name}
                    </button>
                    <button
                      type="button"
                      className="icon-button danger-icon-button icon-button-small"
                      aria-label={`Delete list ${list.name}`}
                      title={`Delete list ${list.name}`}
                      disabled={isSaving}
                      onClick={() => handleDeleteList(list.id, list.name)}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              <form
                className="inline-create-form inline-create-form-compact"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await createList(area.id, listDrafts[area.id] ?? "");
                  setListDrafts((current) => ({ ...current, [area.id]: "" }));
                }}
              >
                <input
                  value={listDrafts[area.id] ?? ""}
                  onChange={(event) =>
                    setListDrafts((current) => ({
                      ...current,
                      [area.id]: event.target.value
                    }))
                  }
                  placeholder="Add a list..."
                  disabled={isSaving}
                />
                <button type="submit" disabled={isSaving}>
                  Add
                </button>
              </form>
            </div>
          </div>
        ))}
      </aside>

      <section className="panel tasks-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">All Tasks</p>
            <h3>System of record ({filteredTasks.length})</h3>
            {activeListName ? (
              <p className="muted-copy">Filtered to list: {activeListName}</p>
            ) : null}
          </div>
          <div className="tasks-filter-panel desktop-only">
            <p className="eyebrow">Exclude tags</p>
            <div className="tag-row">
              {state.tags.length ? (
                state.tags.map((tag) => {
                  const excluded = effectiveExcludedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={excluded ? "lens-chip active" : "lens-chip"}
                      onClick={() => {
                        setHasTouchedTagFilters(true);
                        setExcludedTagIds((current) =>
                          current.includes(tag.id)
                            ? current.filter((id) => id !== tag.id)
                            : [...current, tag.id]
                        );
                      }}
                      disabled={isSaving}
                    >
                      {tag.name}
                    </button>
                  );
                })
              ) : (
                <span className="count-chip">No tags</span>
              )}
            </div>
          </div>
        </div>
        <div className="mobile-tasks-toolbar mobile-only">
          <div className="mobile-filter-grid">
            <label className="field-block">
              <span className="eyebrow">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles and notes..."
              />
            </label>
            <label className="field-block">
              <span className="eyebrow">Status</span>
              <select
                value={activeStatus}
                onChange={(event) =>
                  setActiveStatus(event.target.value as "all" | "open" | "waiting_on" | "done")
                }
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="waiting_on">Waiting On</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label className="field-block">
              <span className="eyebrow">Area</span>
              <select
                value={activeArea}
                onChange={(event) => {
                  const nextArea = event.target.value as string | "all";
                  setActiveArea(nextArea);
                  setActiveList("all");
                }}
              >
                <option value="all">All areas</option>
                {state.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-block">
              <span className="eyebrow">List</span>
              <select
                value={activeList}
                onChange={(event) => setActiveList(event.target.value as string | "all")}
              >
                <option value="all">All lists</option>
                {visibleLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="tasks-filter-panel">
            <p className="eyebrow">Exclude tags</p>
            <div className="tag-row">
              {state.tags.length ? (
                state.tags.map((tag) => {
                  const excluded = effectiveExcludedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={excluded ? "lens-chip active" : "lens-chip"}
                      onClick={() => {
                        setHasTouchedTagFilters(true);
                        setExcludedTagIds((current) =>
                          current.includes(tag.id)
                            ? current.filter((id) => id !== tag.id)
                            : [...current, tag.id]
                        );
                      }}
                      disabled={isSaving}
                    >
                      {tag.name}
                    </button>
                  );
                })
              ) : (
                <span className="count-chip">No tags</span>
              )}
            </div>
          </div>
          <details className="task-accordion">
            <summary>Organize areas and lists</summary>
            <div className="mobile-organize-stack">
              <form className="inline-create-form" onSubmit={handleCreateArea}>
                <input
                  value={newAreaName}
                  onChange={(event) => setNewAreaName(event.target.value)}
                  placeholder="Create an area..."
                  disabled={isSaving}
                />
                <button type="submit" disabled={isSaving}>
                  Add area
                </button>
              </form>
              {state.areas.map((area) => (
                <div key={area.id} className="mobile-area-card">
                  <div className="mobile-area-header">
                    <button
                      type="button"
                      className={activeArea === area.id ? "hierarchy-item active" : "hierarchy-item"}
                      onClick={() => {
                        setActiveArea(area.id);
                        setActiveList("all");
                      }}
                    >
                      {area.name}
                    </button>
                    <button
                      type="button"
                      className="ghost-button danger-text-button"
                      disabled={isSaving}
                      onClick={() => handleDeleteArea(area.id, area.name)}
                    >
                      Delete area
                    </button>
                  </div>
                  <div className="mobile-list-stack">
                    {state.lists
                      .filter((list) => list.areaId === area.id)
                      .map((list) => (
                        <div key={list.id} className="mobile-list-row">
                          <button
                            type="button"
                            className={
                              activeList === list.id
                                ? "hierarchy-child hierarchy-child-active"
                                : "hierarchy-child"
                            }
                            onClick={() => {
                              setActiveArea(area.id);
                              setActiveList(list.id);
                            }}
                          >
                            {list.name}
                          </button>
                          <button
                            type="button"
                            className="ghost-button danger-text-button"
                            disabled={isSaving}
                            onClick={() => handleDeleteList(list.id, list.name)}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    <form
                      className="inline-create-form"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        await createList(area.id, listDrafts[area.id] ?? "");
                        setListDrafts((current) => ({ ...current, [area.id]: "" }));
                      }}
                    >
                      <input
                        value={listDrafts[area.id] ?? ""}
                        onChange={(event) =>
                          setListDrafts((current) => ({
                            ...current,
                            [area.id]: event.target.value
                          }))
                        }
                        placeholder="Add a list..."
                        disabled={isSaving}
                      />
                      <button type="submit" disabled={isSaving}>
                        Add
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
        <div className="filter-row desktop-only">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles and notes..."
          />
          <select
            value={activeStatus}
            onChange={(event) =>
              setActiveStatus(event.target.value as "all" | "open" | "waiting_on" | "done")
            }
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="waiting_on">Waiting On</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="task-row-stack">
          {filteredTasks.length ? (
            filteredTasks.map((task) => (
              <article
                key={task.id}
                className="task-row"
                draggable
                onDragStart={() => setDraggingTaskId(task.id)}
                onDragEnd={() => {
                  setDraggingTaskId(null);
                  setDropListId(null);
                }}
              >
                  <div className="task-row-main">
                    <div className="task-row-top">
                      <span className="drag-handle desktop-only" aria-hidden="true">
                        ::
                      </span>
                      <StatusBadge status={task.status} />
                      <span className="count-chip task-location-chip">
                        {getAreaName(task.areaId)}
                        {task.listId ? ` / ${getListName(task.listId)}` : ""}
                      </span>
                    </div>
                  <Link href={`/tasks/${task.id}`}>
                    <h4>{task.title}</h4>
                  </Link>
                  <p className="task-next-action">
                    <strong>Next Action:</strong>{" "}
                    {task.nextAction || "No next action yet."}
                  </p>
                  {editingTaskId === task.id ? (
                    <div className="inline-edit-row">
                      <input
                        value={nextActionDrafts[task.id] ?? ""}
                        onChange={(event) =>
                          setNextActionDrafts((current) => ({
                            ...current,
                            [task.id]: event.target.value
                          }))
                        }
                        placeholder="Define the next concrete step..."
                        disabled={isSaving}
                      />
                      <div className="action-row">
                        <button
                          type="button"
                          onClick={() => saveNextAction(task.id)}
                          disabled={isSaving}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTaskId(null);
                            setNextActionDrafts((current) => ({
                              ...current,
                              [task.id]: task.nextAction
                            }));
                          }}
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="tag-row">
                    {getTagNames(task.tagIds).map((tag) => (
                      <TagPill key={tag} label={tag} />
                    ))}
                  </div>
                  <details className="task-accordion mobile-only">
                    <summary>Manage task</summary>
                    <div className="task-manage-stack">
                      <div className="action-row">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => startEditingNextAction(task.id, task.nextAction)}
                          disabled={isSaving}
                        >
                          {task.nextAction ? "Edit next action" : "Add next action"}
                        </button>
                        {task.status !== "done" ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setTaskStatus(task.id, "done")}
                            disabled={isSaving}
                          >
                            Mark done
                          </button>
                        ) : null}
                        {task.status !== "waiting_on" ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setTaskStatus(task.id, "waiting_on")}
                            disabled={isSaving}
                          >
                            Waiting on
                          </button>
                        ) : null}
                        {task.status !== "open" ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setTaskStatus(task.id, "open")}
                            disabled={isSaving}
                          >
                            Mark open
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="ghost-button danger-text-button"
                          onClick={() => deleteTask(task.id)}
                          disabled={isSaving}
                        >
                          Delete task
                        </button>
                      </div>
                      <p className="task-path">
                        To move this task to another area or list, open the full task page.
                      </p>
                    </div>
                  </details>
                </div>
                <div className="task-row-meta desktop-only">
                  <button
                    type="button"
                    onClick={() => startEditingNextAction(task.id, task.nextAction)}
                    disabled={isSaving}
                  >
                    {task.nextAction ? "Edit next action" : "Add next action"}
                  </button>
                  {task.status !== "done" ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setTaskStatus(task.id, "done")}
                      disabled={isSaving}
                    >
                      Mark done
                    </button>
                  ) : null}
                  {task.dueDate ? <span>Due soon</span> : null}
                  {task.githubLink ? <span>GitHub #{task.githubLink.issueNumber}</span> : null}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-card">
              <h4>{state.tasks.length ? "No tasks match these filters" : "No tasks yet"}</h4>
              <p>
                {state.tasks.length
                  ? "Try changing the search, status, area, list, or excluded tags."
                  : "Capture a few tasks, then organize them into the areas and lists you create here."}
              </p>
            </div>
          )}
        </div>
        {draggingTaskId ? (
          <p className="muted-copy desktop-only">
            Dragging task. Drop it onto a list in the hierarchy rail to move it.
          </p>
        ) : null}
      </section>
    </div>
  );
}
