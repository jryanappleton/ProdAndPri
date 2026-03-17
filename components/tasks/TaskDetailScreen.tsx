"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { AnalysisFreshness } from "@/lib/types";
import { useAppState } from "@/components/shared/AppStateProvider";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TagPill } from "@/components/shared/TagPill";

function getFreshnessLabel(freshness: AnalysisFreshness) {
  if (freshness === "never_analyzed") return "Never analyzed";
  if (freshness === "ready_for_refresh") return "New activity since last analysis";
  if (freshness === "waiting_for_activity") return "Waiting for new activity";
  return "Fresh";
}

export function TaskDetailScreen({ taskId }: { taskId: string }) {
  const router = useRouter();
  const {
    state,
    isSaving,
    aiOperation,
    setTaskStatus,
    toggleSubtask,
    addComment,
    analyzeTask,
    applyTaskAnalysis,
    updateTask,
    deleteTask,
    createGitHubIssueForTask,
    getAreaName,
    getListName,
    getTagNames
  } = useAppState();
  const task = state.tasks.find((entry) => entry.id === taskId);
  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [areaDraft, setAreaDraft] = useState("");
  const [listDraft, setListDraft] = useState("");
  const [githubRepositoryId, setGitHubRepositoryId] = useState("");

  if (!task) notFound();
  const currentTask = task;
  const isAiAnalyzing =
    aiOperation.taskId === currentTask.id && aiOperation.type === "analyze";
  const isAiApplying =
    aiOperation.taskId === currentTask.id && aiOperation.type === "apply";
  const isAiBusy = isAiAnalyzing || isAiApplying;

  useEffect(() => {
    setTitleDraft(currentTask.title);
    setDescriptionDraft(currentTask.description);
    setAreaDraft(currentTask.areaId ?? "");
    setListDraft(currentTask.listId ?? "");
    setGitHubRepositoryId(currentTask.githubLink?.repositoryId ?? "");
  }, [currentTask]);

  const availableLists = useMemo(
    () => state.lists.filter((list) => list.areaId === areaDraft),
    [areaDraft, state.lists]
  );
  const requiresList = Boolean(areaDraft);
  const canSaveTask = titleDraft.trim().length > 0 && (!requiresList || Boolean(listDraft));

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addComment(currentTask.id, comment);
    setComment("");
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveTask) return;

    await updateTask({
      taskId: currentTask.id,
      title: titleDraft,
      description: descriptionDraft,
      areaId: areaDraft || null,
      listId: listDraft || null
    });
    setIsEditing(false);
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this task permanently?");
    if (!confirmed) return;
    await deleteTask(currentTask.id);
    router.push("/tasks");
  }

  return (
    <div className="detail-layout">
      <section className="panel detail-main">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Task Detail</p>
            <h2>{currentTask.title}</h2>
          </div>
          <StatusBadge status={currentTask.status} />
        </div>
        <p className="detail-description">{currentTask.description || "No notes yet."}</p>
        <p className="task-path">
          {getAreaName(currentTask.areaId)}
          {currentTask.listId ? ` > ${getListName(currentTask.listId)}` : ""}
        </p>
        <div className="tag-row">
          {getTagNames(currentTask.tagIds).map((tag) => (
            <TagPill key={tag} label={tag} />
          ))}
        </div>
        <div className="tag-row">
          <TagPill label={`AI: ${getFreshnessLabel(currentTask.analysis.freshness)}`} />
        </div>
        <div className="action-row">
          {currentTask.status !== "open" ? (
            <button
              type="button"
              onClick={() => setTaskStatus(currentTask.id, "open")}
              disabled={isSaving}
            >
              Reopen
            </button>
          ) : null}
          {currentTask.status !== "waiting_on" ? (
            <button
              type="button"
              onClick={() => setTaskStatus(currentTask.id, "waiting_on")}
              disabled={isSaving}
            >
              Waiting on
            </button>
          ) : null}
          {currentTask.status !== "done" ? (
            <button
              type="button"
              onClick={() => setTaskStatus(currentTask.id, "done")}
              disabled={isSaving}
            >
              Mark done
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => analyzeTask(currentTask.id)}
            disabled={isSaving || !currentTask.analysis.isEligible}
          >
            {isAiAnalyzing
              ? "Analyzing..."
              : currentTask.analysis.lastAnalyzedAt
                ? "Refresh insight"
                : "Analyze task"}
          </button>
          <button type="button" onClick={() => setIsEditing((current) => !current)} disabled={isSaving}>
            {isEditing ? "Close edit" : "Edit task"}
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={handleDelete}
            disabled={isSaving}
          >
            Delete task
          </button>
        </div>
      </section>

      {isEditing ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Edit</p>
              <h3>Update task details</h3>
            </div>
          </div>
          <form className="task-edit-form" onSubmit={submitEdit}>
            <label className="field-block">
              <span>Title</span>
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                disabled={isSaving}
              />
            </label>
            <label className="field-block">
              <span>Description</span>
              <textarea
                value={descriptionDraft}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                placeholder="Add notes or context..."
                disabled={isSaving}
              />
            </label>
            <div className="placement-grid">
              <label className="field-block">
                <span>Area</span>
                <select
                  value={areaDraft}
                  onChange={(event) => {
                    const nextArea = event.target.value;
                    const nextLists = state.lists.filter((list) => list.areaId === nextArea);
                    setAreaDraft(nextArea);
                    setListDraft(nextLists.length === 1 ? nextLists[0].id : "");
                  }}
                  disabled={isSaving}
                >
                  <option value="">Keep in Inbox</option>
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
                  value={listDraft}
                  onChange={(event) => setListDraft(event.target.value)}
                  disabled={isSaving || !areaDraft}
                >
                  <option value="">
                    {areaDraft ? "Choose a list..." : "Select an area first"}
                  </option>
                  {availableLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {requiresList && !listDraft ? (
              <p className="muted-copy">Choose a list before saving placement.</p>
            ) : null}
            <div className="action-row">
              <button type="submit" disabled={isSaving || !canSaveTask}>
                Save changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setTitleDraft(currentTask.title);
                  setDescriptionDraft(currentTask.description);
                  setAreaDraft(currentTask.areaId ?? "");
                  setListDraft(currentTask.listId ?? "");
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="detail-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AI Insight</p>
              <h3>Execution help</h3>
            </div>
          </div>
          <p className="task-meta">
            {getFreshnessLabel(currentTask.analysis.freshness)}
            {currentTask.analysis.lastAnalyzedAt
              ? ` · Last analyzed ${new Date(currentTask.analysis.lastAnalyzedAt).toLocaleDateString()}`
              : ""}
          </p>
          {currentTask.analysis.lastRunMessage ? (
            <div className="empty-card">
              <p>
                {currentTask.analysis.lastRunSource === "fallback"
                  ? `Fallback used: ${currentTask.analysis.lastRunMessage}`
                  : currentTask.analysis.lastRunMessage}
              </p>
            </div>
          ) : null}
          {isAiBusy ? (
            <div className="empty-card">
              <p>
                {isAiAnalyzing
                  ? "AI is reading the task history and building a sharper plan..."
                  : "Applying the AI recommendation..."}
              </p>
            </div>
          ) : null}
          {currentTask.analysis.latest ? (
            <div className="task-card-stack">
              <article className="task-card">
                <p>{currentTask.analysis.latest.summary}</p>
                {currentTask.analysis.latest.gaps.length ? (
                  <>
                    <p className="eyebrow">Gaps</p>
                    <div className="activity-list">
                      {currentTask.analysis.latest.gaps.map((gap) => (
                        <div key={gap} className="activity-row">
                          <p>{gap}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {currentTask.analysis.latest.blockers.length ? (
                  <>
                    <p className="eyebrow">Blockers</p>
                    <div className="activity-list">
                      {currentTask.analysis.latest.blockers.map((blocker) => (
                        <div key={blocker} className="activity-row">
                          <p>{blocker}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {currentTask.analysis.latest.nextSteps.length ? (
                  <>
                    <p className="eyebrow">Next steps</p>
                    <div className="suggestion-stack">
                      {currentTask.analysis.latest.nextSteps.map((step) => (
                        <div key={step.id} className={`suggestion-card ${step.applied ? "accepted" : "suggested"}`}>
                          <div>
                            <strong>{step.title}</strong>
                            <p>{step.why}</p>
                          </div>
                          <div className="action-row">
                            <button
                              type="button"
                              disabled={isSaving || step.applied}
                              onClick={() =>
                                applyTaskAnalysis(currentTask.id, "next_step", step.id)
                              }
                            >
                              {isAiApplying && !step.applied ? "Applying..." : step.applied ? "Added" : "Add as subtask"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {currentTask.analysis.latest.suggestedNotes.length ? (
                  <>
                    <p className="eyebrow">Suggested notes</p>
                    <div className="suggestion-stack">
                      {currentTask.analysis.latest.suggestedNotes.map((note) => (
                        <div key={note.id} className={`suggestion-card ${note.applied ? "accepted" : "suggested"}`}>
                          <div>
                            <p>{note.body}</p>
                          </div>
                          <div className="action-row">
                            <button
                              type="button"
                              disabled={isSaving || note.applied}
                              onClick={() =>
                                applyTaskAnalysis(currentTask.id, "suggested_note", note.id)
                              }
                            >
                              {isAiApplying && !note.applied ? "Applying..." : note.applied ? "Saved" : "Save note"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {currentTask.analysis.latest.clarifyingQuestions.length ? (
                  <>
                    <p className="eyebrow">Questions that would sharpen the plan</p>
                    <div className="activity-list">
                      {currentTask.analysis.latest.clarifyingQuestions.map((question) => (
                        <div key={question.id} className="activity-row">
                          <div>
                            <strong>{question.question}</strong>
                            <p>{question.why}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {currentTask.analysis.latest.improvedTask ? (
                  <>
                    <p className="eyebrow">Improved framing</p>
                    <article className="comment-card">
                      <strong>{currentTask.analysis.latest.improvedTask.title}</strong>
                      <p>{currentTask.analysis.latest.improvedTask.description}</p>
                      <div className="action-row">
                        <button
                          type="button"
                          disabled={isSaving || currentTask.analysis.latest.improvedTask.applied}
                          onClick={() => applyTaskAnalysis(currentTask.id, "improved_task")}
                        >
                          {isAiApplying && !currentTask.analysis.latest.improvedTask.applied
                            ? "Applying..."
                            : currentTask.analysis.latest.improvedTask.applied
                            ? "Applied"
                            : "Apply rewrite"}
                        </button>
                      </div>
                    </article>
                  </>
                ) : null}
              </article>
            </div>
          ) : (
            <div className="empty-card">
              <p>
                {currentTask.analysis.isEligible
                  ? "Run AI analysis to turn this task into clearer next actions."
                  : "AI is waiting for new user activity before it analyzes this task again."}
              </p>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Subtasks</p>
              <h3>Breakdown</h3>
            </div>
          </div>
          {currentTask.subtasks.length ? (
            <div className="checklist">
              {currentTask.subtasks.map((subtask) => (
                <label key={subtask.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={subtask.isDone}
                    onChange={() => toggleSubtask(currentTask.id, subtask.id)}
                    disabled={isSaving}
                  />
                  <span>{subtask.title}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="empty-card">
              <p>No subtasks yet.</p>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Comments</p>
              <h3>Context</h3>
            </div>
          </div>
          <form className="comment-form" onSubmit={submitComment}>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Add context, notes, or an update..."
              disabled={isSaving}
            />
            <button type="submit" disabled={isSaving}>
              Save comment
            </button>
          </form>
          <div className="comment-list">
            {currentTask.comments.length ? (
              currentTask.comments.map((entry) => (
                <article key={entry.id} className="comment-card">
                  <p>{entry.body}</p>
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </article>
              ))
            ) : (
              <div className="empty-card">
                <p>No comments yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="detail-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">History</p>
              <h3>Recent activity</h3>
            </div>
          </div>
          <div className="activity-list">
            {currentTask.activity.length ? (
              currentTask.activity.map((entry) => (
                <div key={entry.id} className="activity-row">
                  <p>{entry.body}</p>
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              ))
            ) : (
              <div className="empty-card">
                <p>No activity yet.</p>
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">GitHub</p>
              <h3>Linked work</h3>
            </div>
          </div>
          {currentTask.githubLink ? (
            <div className="activity-row">
              <p>
                Linked to{" "}
                <a href={currentTask.githubLink.url} target="_blank" rel="noreferrer">
                  {currentTask.githubLink.repository} #{currentTask.githubLink.issueNumber}
                </a>
              </p>
            </div>
          ) : state.githubRepositories.length ? (
            <div className="task-edit-form">
              <label className="field-block">
                <span>Create issue in repository</span>
                <select
                  value={githubRepositoryId}
                  onChange={(event) => setGitHubRepositoryId(event.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Choose a repository...</option>
                  {state.githubRepositories.map((repository) => (
                    <option key={repository.id} value={repository.id}>
                      {repository.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={isSaving || !githubRepositoryId}
                onClick={() =>
                  createGitHubIssueForTask(currentTask.id, githubRepositoryId)
                }
              >
                Create GitHub issue
              </button>
            </div>
          ) : (
            <div className="empty-card">
              <p>Add a repository in Settings before creating GitHub issues from tasks.</p>
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Metadata</p>
            <h3>Placement & recurrence</h3>
          </div>
        </div>
        <dl className="metadata-list">
          <div>
            <dt>Area</dt>
            <dd>{getAreaName(currentTask.areaId)}</dd>
          </div>
          <div>
            <dt>List</dt>
            <dd>{getListName(currentTask.listId)}</dd>
          </div>
          <div>
            <dt>Recurrence</dt>
            <dd>{currentTask.recurrenceLabel ?? "None"}</dd>
          </div>
          <div>
            <dt>GitHub</dt>
            <dd>{currentTask.githubLink ? currentTask.githubLink.repository : "Not linked"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
