"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useAppState } from "@/components/shared/AppStateProvider";
import { TodayLens } from "@/lib/types";

const lenses: { value: TodayLens; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "revenue", label: "Revenue" },
  { value: "unblock", label: "Unblock" },
  { value: "strategic", label: "Strategic" },
  { value: "admin", label: "Admin" }
];

const groupMeta: Record<
  "highest_leverage" | "quick_wins" | "waiting_follow_up",
  { title: string; desc: string }
> = {
  highest_leverage: {
    title: "Highest leverage",
    desc: "where focused time pays off most."
  },
  quick_wins: {
    title: "Quick wins",
    desc: "small, satisfying clearings."
  },
  waiting_follow_up: {
    title: "Waiting · follow-up",
    desc: "nudges owed to other people."
  }
};

const groupOrder: Array<"waiting_follow_up" | "quick_wins" | "highest_leverage"> = [
  "waiting_follow_up",
  "quick_wins",
  "highest_leverage"
];

export function TodayScreen() {
  const {
    state,
    todayPlan,
    isSaving,
    setLens,
    refresh,
    addTodayFeedback,
    dismissFromToday,
    setTaskStatus,
    updateTask,
    getAreaName,
    getListName,
    getTagNames
  } = useAppState();
  const [feedback, setFeedback] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [nextActionDrafts, setNextActionDrafts] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    const map: Record<string, typeof todayPlan.items> = {};
    for (const item of todayPlan.items) {
      (map[item.groupKey] ??= []).push(item);
    }
    return map;
  }, [todayPlan]);

  const openCount = state.tasks.filter((task) => task.status === "open" && !task.isInbox).length;
  const waitingCount = state.tasks.filter((task) => task.status === "waiting_on" && !task.isInbox).length;
  const todayCount = todayPlan.items.length;

  async function handleSteer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedback.trim()) {
      await addTodayFeedback(feedback);
    } else {
      await refresh();
    }
    setFeedback("");
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

  function beginEditing(taskId: string, currentValue: string) {
    setEditingTaskId(taskId);
    setNextActionDrafts((current) => ({
      ...current,
      [taskId]: current[taskId] ?? currentValue
    }));
  }

  let globalRank = 0;

  return (
    <main className="page">
      <header className="today-head">
        <div>
          <p className="eyebrow">
            <span className="dot" aria-hidden="true" />
            Today · {todayPlan.lens.charAt(0).toUpperCase() + todayPlan.lens.slice(1)} lens
          </p>
          <h1 className="today-title">Your plan should feel calm, pointed, and realistic.</h1>
          <p className="today-sub">{todayPlan.briefing}</p>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="n">{todayCount}</span>
            <span className="l">On today</span>
          </div>
          <div className="stat">
            <span className="n">{openCount}</span>
            <span className="l">Open</span>
          </div>
          <div className="stat waiting">
            <span className="n">{waitingCount}</span>
            <span className="l">Waiting</span>
          </div>
        </div>
      </header>

      <section className="controls" aria-label="Plan controls">
        <span className="label">Lens</span>
        <div className="lens-seg" role="tablist">
          {lenses.map((lens) => (
            <button
              key={lens.value}
              type="button"
              className={todayPlan.lens === lens.value ? "active" : undefined}
              onClick={() => setLens(lens.value)}
              disabled={isSaving}
            >
              {lens.label}
            </button>
          ))}
        </div>
        <form className="steer" onSubmit={handleSteer}>
          <span className="label">Steer</span>
          <input
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder='Optional note: "bias toward easier wins this morning"'
            disabled={isSaving}
          />
          <button type="submit" className="btn sm" disabled={isSaving}>
            {isSaving ? "Refreshing…" : "Refresh"}
          </button>
        </form>
      </section>

      <div className="meta-line-row">
        <span className="updated">
          <span className="pulse" aria-hidden="true" />
          {isSaving ? "Updating plan" : "Plan up to date"}
        </span>
        <span>{todayCount} tasks picked · {state.tasks.filter((task) => !task.isInbox).length} total in system</span>
      </div>

      {todayPlan.briefing ? (
        <div className="briefing">
          <span className="kicker">Briefing</span>
          <p>{todayPlan.briefing}</p>
        </div>
      ) : null}

      {todayCount === 0 ? (
        <div className="empty-state">
          No Today plan yet. Capture work, file it out of Inbox, then refresh.
        </div>
      ) : (
        groupOrder.map((groupKey) => {
          const items = grouped[groupKey];
          if (!items || !items.length) return null;
          const meta = groupMeta[groupKey];

          return (
            <section className="group" key={groupKey}>
              <div className="group-head">
                <span className="gtitle">{meta.title}</span>
                <span className="desc">— {meta.desc}</span>
                <span className="n">{items.length}</span>
              </div>

              {items.map((item) => {
                const task = state.tasks.find((entry) => entry.id === item.taskId);
                if (!task) return null;
                globalRank += 1;
                const rank = String(globalRank).padStart(2, "0");
                const isWaiting = task.status === "waiting_on";
                const isDone = task.status === "done";
                const scorePct = Math.max(0, Math.min(100, Math.round(item.score * 20)));

                return (
                  <article
                    key={task.id}
                    className={`item${isWaiting ? " waiting" : ""}${isDone ? " done" : ""}`}
                  >
                    <span className="rank">{rank}</span>
                    <input
                      type="checkbox"
                      className={isWaiting ? "check waiting" : "check"}
                      checked={isDone}
                      disabled={isSaving}
                      aria-label={`Mark ${task.title} done`}
                      onChange={(event) =>
                        setTaskStatus(task.id, event.target.checked ? "done" : "open")
                      }
                    />
                    <div className="body">
                      <Link href={`/tasks/${task.id}`} className="title-line">
                        {task.title}
                      </Link>
                      {item.reason ? <p className="reason">{item.reason}</p> : null}
                      {task.nextAction ? (
                        <div className="next-action">
                          <span className="marker">Next →</span>
                          <span>{task.nextAction}</span>
                        </div>
                      ) : (
                        <div className="next-action empty">
                          <span className="marker">Next →</span>
                          <span>No next action yet — click edit to set one</span>
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
                        {task.githubLink ? (
                          <span className="chip">GH #{task.githubLink.issueNumber}</span>
                        ) : null}
                        {getTagNames(task.tagIds).map((tag) => (
                          <span key={tag} className="chip tag">
                            {tag}
                          </span>
                        ))}
                        <span className="score">
                          <span className="score-bar">
                            <i style={{ width: `${scorePct}%` }} />
                          </span>
                          {item.score.toFixed(1)}
                          {item.analysisSource ? (
                            <span className="src">· {item.analysisSource}</span>
                          ) : null}
                        </span>
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
                    <div className="item-actions">
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => beginEditing(task.id, task.nextAction)}
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
                        onClick={() => dismissFromToday(task.id)}
                        disabled={isSaving}
                        title="Dismiss from Today"
                      >
                        Dismiss
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })
      )}
    </main>
  );
}
