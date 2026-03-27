"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useAppState } from "@/components/shared/AppStateProvider";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TagPill } from "@/components/shared/TagPill";
import { TodayLens } from "@/lib/types";

const lenses: { value: TodayLens; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "revenue", label: "Revenue" },
  { value: "unblock", label: "Unblock" },
  { value: "strategic", label: "Strategic" },
  { value: "admin", label: "Admin" }
];

const groupLabels = {
  highest_leverage: "Highest Leverage",
  quick_wins: "Quick Wins",
  waiting_follow_up: "Waiting On Follow-Up"
};

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
    addComment,
    updateTask,
    getAreaName,
    getListName,
    getTagNames
  } = useAppState();
  const [feedback, setFeedback] = useState("");
  const [commentForTask, setCommentForTask] = useState<Record<string, string>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [nextActionDrafts, setNextActionDrafts] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    return todayPlan.items.reduce<Record<string, typeof todayPlan.items>>((acc, item) => {
      const key = item.groupKey;
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});
  }, [todayPlan]);

  async function handleFeedback(event: FormEvent<HTMLFormElement>) {
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

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Today</p>
          <h2>Your plan should feel calm, pointed, and realistic.</h2>
          <p>{todayPlan.briefing}</p>
        </div>
        <div className="hero-side">
          <div className="metric-card">
            <span>Open tasks</span>
            <strong>{state.tasks.filter((task) => task.status === "open").length}</strong>
          </div>
          <div className="metric-card">
            <span>Waiting on</span>
            <strong>{state.tasks.filter((task) => task.status === "waiting_on").length}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Plan Controls</p>
            <h3>Refresh or add optional emphasis</h3>
            <p className="muted-copy">
              Refresh rebuilds Today using your latest task changes. Lenses are optional
              emphasis, not required input.
            </p>
          </div>
          <div className="lens-select-wrap">
            <label className="sr-only" htmlFor="lens-select">
              Choose Today lens
            </label>
            <select
              id="lens-select"
              className="lens-select"
              value={todayPlan.lens}
              onChange={async (event) => setLens(event.target.value as TodayLens)}
              disabled={isSaving}
            >
              {lenses.map((lens) => (
                <option key={lens.value} value={lens.value}>
                  {lens.label}
                </option>
              ))}
            </select>
          </div>
          <div className="lens-row">
            {lenses.map((lens) => (
              <button
                key={lens.value}
                className={todayPlan.lens === lens.value ? "lens-chip active" : "lens-chip"}
                onClick={() => setLens(lens.value)}
                disabled={isSaving}
                type="button"
              >
                {lens.label}
              </button>
            ))}
          </div>
        </div>
        <form className="feedback-form" onSubmit={handleFeedback}>
          <input
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder='Optional steering note: "Bias toward easier wins this morning"'
            disabled={isSaving}
          />
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Refreshing with AI..." : "Refresh plan"}
          </button>
        </form>
        {isSaving ? (
          <p className="muted-copy">
            Updating Today from your latest task changes. This is the part that waits on AI.
          </p>
        ) : null}
      </section>

      <div className="today-grid">
        {todayPlan.items.length ? Object.entries(grouped).map(([groupKey, items]) => (
          <section className="panel" key={groupKey}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Recommendation group</p>
                <h3>{groupLabels[groupKey as keyof typeof groupLabels]}</h3>
              </div>
              <span className="count-chip">{items.length} tasks</span>
            </div>
            <div className="task-card-stack">
              {items.map((item) => {
                const task = state.tasks.find((entry) => entry.id === item.taskId);
                if (!task) return null;

                return (
                  <article key={task.id} className="task-card">
                    <div className="task-card-heading">
                      <StatusBadge status={task.status} />
                    </div>
                    <Link href={`/tasks/${task.id}`} className="task-title-link">
                      {task.title}
                    </Link>
                    <p className="task-path">
                      {getAreaName(task.areaId)}
                      {task.listId ? ` > ${getListName(task.listId)}` : ""}
                    </p>
                    <p className="task-path">
                      Score {item.score.toFixed(1)}
                      {item.analysisSource ? ` · ${item.analysisSource} analysis` : ""}
                    </p>
                    <p className="task-reason">{item.reason}</p>
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
                      {task.githubLink ? <TagPill label="GitHub linked" /> : null}
                      {task.recurrenceLabel ? <TagPill label={task.recurrenceLabel} /> : null}
                    </div>
                    <div className="action-row">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setNextActionDrafts((current) => ({
                            ...current,
                            [task.id]: current[task.id] ?? task.nextAction
                          }));
                        }}
                        disabled={isSaving}
                      >
                        {task.nextAction ? "Edit next action" : "Add next action"}
                      </button>
                      {task.status !== "done" ? (
                        <button type="button" onClick={() => setTaskStatus(task.id, "done")} disabled={isSaving}>
                          Mark done
                        </button>
                      ) : null}
                      {task.status !== "waiting_on" ? (
                        <button type="button" onClick={() => setTaskStatus(task.id, "waiting_on")} disabled={isSaving}>
                          Waiting on
                        </button>
                      ) : null}
                      <button type="button" onClick={() => dismissFromToday(task.id)} disabled={isSaving}>
                        Dismiss
                      </button>
                    </div>
                    <div className="inline-comment">
                      <input
                        value={commentForTask[task.id] ?? ""}
                        onChange={(event) =>
                          setCommentForTask((current) => ({
                            ...current,
                            [task.id]: event.target.value
                          }))
                        }
                        placeholder="Add context..."
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={async () => {
                          await addComment(task.id, commentForTask[task.id] ?? "");
                          setCommentForTask((current) => ({ ...current, [task.id]: "" }));
                        }}
                      >
                        Comment
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )) : (
          <section className="panel">
            <div className="empty-card">
              <h4>No Today plan yet</h4>
              <p>
                Capture some work, create your areas and lists, then place a few tasks out of
                Inbox to generate a real plan.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
