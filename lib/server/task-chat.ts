import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  TaskChatDraft,
  TaskChatDraftField,
  TaskChatDraftNote,
  TaskChatDraftSubtask,
  TaskChatDraftTag
} from "@/lib/types";

const taskChatReplySchema = z.object({
  replyText: z.string().trim().min(1).max(6000)
});

const taskChatDraftSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
  nextAction: z.string().trim().min(1).max(2000).nullable().optional(),
  description: z.string().trim().min(1).max(4000).nullable().optional(),
  notes: z.array(z.string().trim().min(1).max(2000)).max(8).default([]),
  subtasks: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
  tags: z
    .array(
      z.object({
        tagId: z.string().trim().min(1).max(100).optional(),
        name: z.string().trim().min(1).max(120)
      })
    )
    .max(8)
    .default([])
});

function toDraftField(value: string | null | undefined): TaskChatDraftField | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return {
    value: trimmed,
    applied: false
  };
}

function toDraftNote(body: string): TaskChatDraftNote {
  return {
    id: randomUUID(),
    body,
    applied: false
  };
}

function toDraftSubtask(title: string): TaskChatDraftSubtask {
  return {
    id: randomUUID(),
    title,
    applied: false
  };
}

function toDraftTag(input: { tagId?: string; name: string }): TaskChatDraftTag {
  return {
    id: randomUUID(),
    tagId: input.tagId ?? "",
    name: input.name,
    applied: false
  };
}

export function validateTaskChatReply(raw: string) {
  return taskChatReplySchema.parse(JSON.parse(raw));
}

export function validateTaskChatDraft(raw: string): TaskChatDraft {
  const parsed = taskChatDraftSchema.parse(JSON.parse(raw));
  return {
    summary: parsed.summary,
    nextAction: toDraftField(parsed.nextAction),
    description: toDraftField(parsed.description),
    notes: parsed.notes.map(toDraftNote),
    subtasks: parsed.subtasks.map(toDraftSubtask),
    tags: parsed.tags.map(toDraftTag),
    generatedAt: null
  };
}

export function parseStoredTaskChatDraft(raw: string | null | undefined): TaskChatDraft | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as TaskChatDraft;
    return {
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Drafted from the AI conversation.",
      nextAction:
        parsed.nextAction?.value?.trim()
          ? {
              value: parsed.nextAction.value.trim(),
              applied: Boolean(parsed.nextAction.applied)
            }
          : null,
      description:
        parsed.description?.value?.trim()
          ? {
              value: parsed.description.value.trim(),
              applied: Boolean(parsed.description.applied)
            }
          : null,
      notes: Array.isArray(parsed.notes)
        ? parsed.notes
            .filter((note) => typeof note?.body === "string" && note.body.trim())
            .map((note) => ({
              id: typeof note.id === "string" && note.id.trim() ? note.id : randomUUID(),
              body: note.body.trim(),
              applied: Boolean(note.applied)
            }))
        : [],
      subtasks: Array.isArray(parsed.subtasks)
        ? parsed.subtasks
            .filter((subtask) => typeof subtask?.title === "string" && subtask.title.trim())
            .map((subtask) => ({
              id: typeof subtask.id === "string" && subtask.id.trim() ? subtask.id : randomUUID(),
              title: subtask.title.trim(),
              applied: Boolean(subtask.applied)
            }))
        : [],
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .filter((tag) => typeof tag?.name === "string" && tag.name.trim())
            .map((tag) => ({
              id: typeof tag.id === "string" && tag.id.trim() ? tag.id : randomUUID(),
              tagId: typeof tag.tagId === "string" ? tag.tagId : "",
              name: tag.name.trim(),
              applied: Boolean(tag.applied)
            }))
        : [],
      generatedAt:
        typeof parsed.generatedAt === "string" && parsed.generatedAt.trim()
          ? parsed.generatedAt
          : null
    };
  } catch {
    return null;
  }
}

export function serializeTaskChatDraft(draft: TaskChatDraft | null) {
  if (!draft) {
    return null;
  }

  return JSON.stringify(draft);
}
