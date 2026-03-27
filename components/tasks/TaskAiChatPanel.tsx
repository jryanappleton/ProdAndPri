"use client";

import { FormEvent, useEffect, useState } from "react";
import { Task } from "@/lib/types";
import { useAppState } from "@/components/shared/AppStateProvider";

export function TaskAiChatPanel({ task }: { task: Task }) {
  const {
    taskChats,
    aiOperation,
    isSaving,
    loadTaskChat,
    sendTaskChatMessage,
    generateTaskChatDraft,
    resetTaskChat,
    dismissTaskChatDraft,
    applyTaskChatDraft
  } = useAppState();
  const chat = taskChats[task.id];
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chat !== undefined) {
      return;
    }

    loadTaskChat(task.id).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Failed to load AI chat.");
    });
  }, [chat, loadTaskChat, task.id]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setError(null);
    setMessage("");

    try {
      await sendTaskChatMessage(task.id, trimmed);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to send AI message.");
      setMessage(trimmed);
    }
  }

  async function handleReset() {
    setError(null);

    try {
      await resetTaskChat(task.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to reset AI chat.");
    }
  }

  async function handleConvert() {
    setError(null);

    try {
      await generateTaskChatDraft(task.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to build task draft.");
    }
  }

  async function handleDismissDraft() {
    setError(null);

    try {
      await dismissTaskChatDraft(task.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to dismiss draft.");
    }
  }

  async function handleApply(
    action: "next_action" | "description" | "note" | "subtask" | "tag",
    itemId?: string
  ) {
    setError(null);

    try {
      await applyTaskChatDraft(task.id, action, itemId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to apply draft.");
    }
  }

  const isSending = aiOperation.taskId === task.id && aiOperation.type === "chat_send";
  const isConverting = aiOperation.taskId === task.id && aiOperation.type === "chat_convert";
  const isApplying = aiOperation.taskId === task.id && aiOperation.type === "chat_apply";
  const isResetting = aiOperation.taskId === task.id && aiOperation.type === "chat_reset";
  const isDismissingDraft =
    aiOperation.taskId === task.id && aiOperation.type === "chat_dismiss_draft";

  return (
    <section className="panel ai-chat-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI Chat</p>
          <h3>Talk through the task</h3>
        </div>
        <div className="action-row">
          <button type="button" onClick={handleConvert} disabled={isSaving || isConverting}>
            {isConverting ? "Improving..." : "Improve task"}
          </button>
          <button type="button" onClick={handleReset} disabled={isSaving || isResetting}>
            {isResetting ? "Resetting..." : "Reset chat"}
          </button>
        </div>
      </div>
      <p className="task-meta">
        Use this as a normal conversation. When the thinking is done, click Improve task to turn
        the discussion into a reviewable draft.
      </p>
      {error ? (
        <div className="empty-card">
          <p>{error}</p>
        </div>
      ) : null}
      <div className="ai-chat-thread">
        {chat?.messages.length ? (
          chat.messages.map((entry) => (
            <article
              key={entry.id}
              className={entry.role === "user" ? "chat-message chat-message-user" : "chat-message"}
            >
              <p className="eyebrow">{entry.role === "user" ? "You" : "AI"}</p>
              <p>{entry.body}</p>
            </article>
          ))
        ) : (
          <div className="empty-card">
            <p>Ask questions, explore options, or talk the task through like a normal chat.</p>
          </div>
        )}
        {isSending ? (
          <div className="chat-message">
            <p className="eyebrow">AI</p>
            <p>Thinking through the latest message...</p>
          </div>
        ) : null}
      </div>
      <form className="comment-form" onSubmit={submitMessage}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Message AI about this task..."
          disabled={isSaving}
        />
        <button type="submit" disabled={isSaving || !message.trim()}>
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>

      {chat?.draft ? (
        <section className="ai-draft-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Draft</p>
              <h4>Review before saving</h4>
            </div>
            <button
              type="button"
              onClick={handleDismissDraft}
              disabled={isSaving || isDismissingDraft}
            >
              {isDismissingDraft ? "Closing..." : "Close draft"}
            </button>
          </div>
          <div className="draft-card">
            <p>{chat.draft.summary}</p>
            {chat.draft.generatedAt ? (
              <span>{new Date(chat.draft.generatedAt).toLocaleString()}</span>
            ) : null}
          </div>
          {chat.draft.nextAction ? (
            <div className={`draft-card ${chat.draft.nextAction.applied ? "accepted" : ""}`}>
              <strong>Next action</strong>
              <p>{chat.draft.nextAction.value}</p>
              <div className="action-row">
                <button
                  type="button"
                  disabled={isSaving || isApplying || chat.draft.nextAction.applied}
                  onClick={() => handleApply("next_action")}
                >
                  {chat.draft.nextAction.applied ? "Applied" : isApplying ? "Applying..." : "Set next action"}
                </button>
              </div>
            </div>
          ) : null}
          {chat.draft.description ? (
            <div className={`draft-card ${chat.draft.description.applied ? "accepted" : ""}`}>
              <strong>Description</strong>
              <p>{chat.draft.description.value}</p>
              <div className="action-row">
                <button
                  type="button"
                  disabled={isSaving || isApplying || chat.draft.description.applied}
                  onClick={() => handleApply("description")}
                >
                  {chat.draft.description.applied ? "Applied" : isApplying ? "Applying..." : "Replace description"}
                </button>
              </div>
            </div>
          ) : null}
          {chat.draft.notes.length ? (
            <div className="draft-stack">
              {chat.draft.notes.map((note) => (
                <div key={note.id} className={`draft-card ${note.applied ? "accepted" : ""}`}>
                  <strong>Note</strong>
                  <p>{note.body}</p>
                  <div className="action-row">
                    <button
                      type="button"
                      disabled={isSaving || isApplying || note.applied}
                      onClick={() => handleApply("note", note.id)}
                    >
                      {note.applied ? "Applied" : isApplying ? "Applying..." : "Add note"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {chat.draft.subtasks.length ? (
            <div className="draft-stack">
              {chat.draft.subtasks.map((subtask) => (
                <div key={subtask.id} className={`draft-card ${subtask.applied ? "accepted" : ""}`}>
                  <strong>Subtask</strong>
                  <p>{subtask.title}</p>
                  <div className="action-row">
                    <button
                      type="button"
                      disabled={isSaving || isApplying || subtask.applied}
                      onClick={() => handleApply("subtask", subtask.id)}
                    >
                      {subtask.applied ? "Applied" : isApplying ? "Applying..." : "Create subtask"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {chat.draft.tags.length ? (
            <div className="draft-stack">
              {chat.draft.tags.map((tag) => (
                <div key={tag.id} className={`draft-card ${tag.applied ? "accepted" : ""}`}>
                  <strong>Tag</strong>
                  <p>{tag.name}</p>
                  <div className="action-row">
                    <button
                      type="button"
                      disabled={isSaving || isApplying || tag.applied}
                      onClick={() => handleApply("tag", tag.id)}
                    >
                      {tag.applied ? "Applied" : isApplying ? "Applying..." : "Add tag"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
