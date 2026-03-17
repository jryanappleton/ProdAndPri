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

  const filteredTasks = useMemo(() => {
    return state.tasks.filter((task) => {
      if (task.isInbox) return false;
      if (activeArea !== "all" && task.areaId !== activeArea) return false;
      if (activeList !== "all" && task.listId !== activeList) return false;
      if (activeStatus !== "all" && task.status !== activeStatus) return false;
      if (
        query &&
        !`${task.title} ${task.description}`.toLowerCase().includes(query.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [activeArea, activeList, activeStatus, query, state.tasks]);

  const activeListName =
    activeList === "all"
      ? null
      : state.lists.find((list) => list.id === activeList)?.name ?? null;

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

  return (
    <div className="tasks-layout">
      <aside className="panel hierarchy-panel">
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
            <h3>System of record</h3>
            {activeListName ? (
              <p className="muted-copy">Filtered to list: {activeListName}</p>
            ) : null}
          </div>
          <span className="count-chip">{filteredTasks.length} visible</span>
        </div>
        <div className="filter-row">
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
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
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
                    <span className="drag-handle" aria-hidden="true">
                      ::
                    </span>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="task-path">
                    {getAreaName(task.areaId)}
                    {task.listId ? ` > ${getListName(task.listId)}` : ""}
                  </p>
                  <h4>{task.title}</h4>
                  <p>{task.description || "No notes yet."}</p>
                  <div className="tag-row">
                    {getTagNames(task.tagIds).map((tag) => (
                      <TagPill key={tag} label={tag} />
                    ))}
                  </div>
                </div>
                <div className="task-row-meta">
                  {task.dueDate ? <span>Due soon</span> : null}
                  {task.githubLink ? <span>GitHub #{task.githubLink.issueNumber}</span> : null}
                </div>
              </Link>
            ))
          ) : (
            <div className="empty-card">
              <h4>No tasks yet</h4>
              <p>
                Capture a few tasks, then organize them into the areas and lists you create
                here.
              </p>
            </div>
          )}
        </div>
        {draggingTaskId ? (
          <p className="muted-copy">
            Dragging task. Drop it onto a list in the hierarchy rail to move it.
          </p>
        ) : null}
      </section>
    </div>
  );
}
