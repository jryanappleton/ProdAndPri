import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";

type Row = Record<string, null | string | number | bigint | Uint8Array>;

const sqliteUrl =
  process.env.SQLITE_DATABASE_URL ??
  process.env.LEGACY_SQLITE_DATABASE_URL ??
  "file:./dev.db";

const sqlitePath = resolve(
  process.cwd(),
  sqliteUrl.startsWith("file:") ? sqliteUrl.slice("file:".length) : sqliteUrl
);

const prisma = new PrismaClient();
const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });

function readTable(table: string) {
  return sqlite.prepare(`SELECT * FROM "${table}"`).all() as Row[];
}

function parseDate(value: Row[string]) {
  if (value == null) return null;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "bigint") return new Date(Number(value));
  return new Date(String(value));
}

function parseRequiredDate(value: Row[string], field: string) {
  const parsed = parseDate(value);
  if (!parsed) {
    throw new Error(`Expected ${field} to be present in the SQLite export.`);
  }

  return parsed;
}

function asString(value: Row[string]) {
  if (value == null) return null;
  return String(value);
}

function asNumber(value: Row[string]) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return Number(value);
}

function asBoolean(value: Row[string]) {
  if (value == null) return false;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "bigint") return Number(value) !== 0;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return Boolean(value);
}

function hasRows(record: Record<string, unknown[]>, key: string) {
  return record[key] && record[key].length > 0;
}

async function ensureEmptyTarget() {
  const existing = await prisma.workspace.count();
  if (existing > 0) {
    throw new Error(
      "Target Postgres database is not empty. Clear it first or point this script at a fresh database."
    );
  }
}

async function main() {
  await ensureEmptyTarget();

  const rows = {
    Workspace: readTable("Workspace"),
    Area: readTable("Area"),
    TaskList: readTable("TaskList"),
    Tag: readTable("Tag"),
    UserPreferences: readTable("UserPreferences"),
    GitHubConnection: readTable("GitHubConnection"),
    GitHubRepository: readTable("GitHubRepository"),
    Import: readTable("Import"),
    Task: readTable("Task"),
    Subtask: readTable("Subtask"),
    TaskComment: readTable("TaskComment"),
    TaskActivity: readTable("TaskActivity"),
    TaskAiState: readTable("TaskAiState"),
    TaskChat: readTable("TaskChat"),
    TaskChatMessage: readTable("TaskChatMessage"),
    TaskTag: readTable("TaskTag"),
    TodayPlan: readTable("TodayPlan"),
    TodayPlanItem: readTable("TodayPlanItem"),
    TodayFeedbackMessage: readTable("TodayFeedbackMessage"),
    GitHubIssueLink: readTable("GitHubIssueLink"),
    ImportRow: readTable("ImportRow"),
    Job: readTable("Job")
  };

  await prisma.$transaction(async (tx) => {
    if (hasRows(rows, "Workspace")) {
      await tx.workspace.createMany({
        data: rows.Workspace.map((row) => ({
          id: String(row.id),
          name: String(row.name),
          createdAt: parseDate(row.createdAt) ?? undefined,
          updatedAt: parseDate(row.updatedAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "Area")) {
      await tx.area.createMany({
        data: rows.Area.map((row) => ({
          id: String(row.id),
          workspaceId: String(row.workspaceId),
          name: String(row.name),
          slug: String(row.slug),
          description: asString(row.description),
          position: asNumber(row.position) ?? 0,
          isArchived: asBoolean(row.isArchived),
          createdAt: parseDate(row.createdAt) ?? undefined,
          updatedAt: parseDate(row.updatedAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "TaskList")) {
      await tx.taskList.createMany({
        data: rows.TaskList.map((row) => ({
          id: String(row.id),
          workspaceId: String(row.workspaceId),
          areaId: String(row.areaId),
          name: String(row.name),
          slug: String(row.slug),
          description: asString(row.description),
          position: asNumber(row.position) ?? 0,
          isArchived: asBoolean(row.isArchived),
          createdAt: parseDate(row.createdAt) ?? undefined,
          updatedAt: parseDate(row.updatedAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "Tag")) {
      await tx.tag.createMany({
        data: rows.Tag.map((row) => ({
          id: String(row.id),
          workspaceId: String(row.workspaceId),
          name: String(row.name),
          slug: String(row.slug),
          color: asString(row.color),
          createdAt: parseDate(row.createdAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "UserPreferences")) {
      await tx.userPreferences.createMany({
        data: rows.UserPreferences.map((row) => ({
          workspaceId: String(row.workspaceId),
          defaultLens: String(row.defaultLens) as never,
          quickWinsPreference: asNumber(row.quickWinsPreference) ?? 60,
          deepWorkPreference: asNumber(row.deepWorkPreference) ?? 70,
          revenueWeight: asNumber(row.revenueWeight) ?? 65,
          unblockWeight: asNumber(row.unblockWeight) ?? 60,
          strategicWeight: asNumber(row.strategicWeight) ?? 70,
          adminWeight: asNumber(row.adminWeight) ?? 45,
          workingHours: asString(row.workingHours),
          updatedAt: parseDate(row.updatedAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "GitHubConnection")) {
      await tx.gitHubConnection.createMany({
        data: rows.GitHubConnection.map((row) => ({
          workspaceId: String(row.workspaceId),
          installationType: String(row.installationType),
          encryptedToken: asString(row.encryptedToken),
          username: asString(row.username),
          createdAt: parseDate(row.createdAt) ?? undefined,
          updatedAt: parseDate(row.updatedAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "GitHubRepository")) {
      await tx.gitHubRepository.createMany({
        data: rows.GitHubRepository.map((row) => ({
          id: String(row.id),
          workspaceId: String(row.workspaceId),
          owner: String(row.owner),
          repo: String(row.repo),
          isActive: asBoolean(row.isActive),
          lastSyncedAt: parseDate(row.lastSyncedAt),
          createdAt: parseDate(row.createdAt) ?? undefined,
          updatedAt: parseDate(row.updatedAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "Import")) {
      await tx.import.createMany({
        data: rows.Import.map((row) => ({
          id: String(row.id),
          workspaceId: String(row.workspaceId),
          sourceType: String(row.sourceType) as never,
          status: String(row.status) as never,
          originalFilename: String(row.originalFilename),
          mappingConfig: asString(row.mappingConfig),
          summary: asString(row.summary),
          createdAt: parseDate(row.createdAt) ?? undefined,
          completedAt: parseDate(row.completedAt)
        }))
      });
    }

    if (hasRows(rows, "Task")) {
      await tx.task.createMany({
        data: rows.Task.map((row) => ({
          id: String(row.id),
          workspaceId: String(row.workspaceId),
          areaId: asString(row.areaId),
          listId: asString(row.listId),
          sourceType: String(row.sourceType) as never,
          sourceRef: asString(row.sourceRef),
          title: String(row.title),
          normalizedTitle: String(row.normalizedTitle),
          description: asString(row.description),
          nextAction: asString(row.nextAction),
          nextActionSubtaskId: asString(row.nextActionSubtaskId),
          status: String(row.status) as never,
          priorityOverride: asNumber(row.priorityOverride),
          dueDate: parseDate(row.dueDate),
          deferUntil: parseDate(row.deferUntil),
          isInbox: asBoolean(row.isInbox),
          waitingReason: asString(row.waitingReason),
          waitingSince: parseDate(row.waitingSince),
          recurrenceRule: asString(row.recurrenceRule),
          recurrenceLabel: asString(row.recurrenceLabel),
          nextRecurrenceAt: parseDate(row.nextRecurrenceAt),
          createdAt: parseDate(row.createdAt) ?? undefined,
          updatedAt: parseDate(row.updatedAt) ?? undefined,
          lastWorkedAt: parseDate(row.lastWorkedAt),
          completedAt: parseDate(row.completedAt)
        }))
      });
    }

    if (hasRows(rows, "Subtask")) {
      await tx.subtask.createMany({
        data: rows.Subtask.map((row) => ({
          id: String(row.id),
          taskId: String(row.taskId),
          title: String(row.title),
          isDone: asBoolean(row.isDone),
          position: asNumber(row.position) ?? 0,
          createdAt: parseDate(row.createdAt) ?? undefined,
          updatedAt: parseDate(row.updatedAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "TaskComment")) {
      await tx.taskComment.createMany({
        data: rows.TaskComment.map((row) => ({
          id: String(row.id),
          taskId: String(row.taskId),
          body: String(row.body),
          commentType: String(row.commentType) as never,
          createdAt: parseDate(row.createdAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "TaskActivity")) {
      await tx.taskActivity.createMany({
        data: rows.TaskActivity.map((row) => ({
          id: String(row.id),
          taskId: String(row.taskId),
          eventType: String(row.eventType),
          payload: asString(row.payload),
          createdAt: parseDate(row.createdAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "TaskAiState")) {
      await tx.taskAiState.createMany({
        data: rows.TaskAiState.map((row) => ({
          taskId: String(row.taskId),
          classification: asString(row.classification),
          clarificationSuggestion: asString(row.clarificationSuggestion),
          subtaskSuggestion: asString(row.subtaskSuggestion),
          nextStepSuggestion: asString(row.nextStepSuggestion),
          stalenessSignals: asString(row.stalenessSignals),
          lastAnalyzedAt: parseDate(row.lastAnalyzedAt),
          todayClassification: asString(row.todayClassification),
          todayMeta: asString(row.todayMeta),
          todayAnalyzedAt: parseDate(row.todayAnalyzedAt)
        }))
      });
    }

    if (hasRows(rows, "TaskChat")) {
      await tx.taskChat.createMany({
        data: rows.TaskChat.map((row) => ({
          id: String(row.id),
          taskId: String(row.taskId),
          openAiConversationId: asString(row.openAiConversationId),
          draftJson: asString(row.draftJson),
          draftGeneratedAt: parseDate(row.draftGeneratedAt),
          resetCount: asNumber(row.resetCount) ?? 0,
          createdAt: parseDate(row.createdAt) ?? undefined,
          updatedAt: parseDate(row.updatedAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "TaskChatMessage")) {
      await tx.taskChatMessage.createMany({
        data: rows.TaskChatMessage.map((row) => ({
          id: String(row.id),
          taskChatId: String(row.taskChatId),
          role: String(row.role) as never,
          body: String(row.body),
          openAiResponseId: asString(row.openAiResponseId),
          createdAt: parseDate(row.createdAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "TaskTag")) {
      await tx.taskTag.createMany({
        data: rows.TaskTag.map((row) => ({
          taskId: String(row.taskId),
          tagId: String(row.tagId)
        }))
      });
    }

    if (hasRows(rows, "TodayFeedbackMessage")) {
      await tx.todayFeedbackMessage.createMany({
        data: rows.TodayFeedbackMessage.map((row) => ({
          id: String(row.id),
          workspaceId: String(row.workspaceId),
          date: parseRequiredDate(row.date, "TodayFeedbackMessage.date"),
          lens: String(row.lens) as never,
          body: String(row.body),
          createdAt: parseDate(row.createdAt) ?? undefined
        }))
      });
    }

    if (hasRows(rows, "TodayPlan")) {
      await tx.todayPlan.createMany({
        data: rows.TodayPlan.map((row) => ({
          id: String(row.id),
          workspaceId: String(row.workspaceId),
          date: parseRequiredDate(row.date, "TodayPlan.date"),
          lens: String(row.lens) as never,
          briefing: String(row.briefing),
          inputContext: asString(row.inputContext),
          generationVersion: asNumber(row.generationVersion) ?? 1,
          status: String(row.status) as never,
          generatedAt: parseRequiredDate(row.generatedAt, "TodayPlan.generatedAt")
        }))
      });
    }

    if (hasRows(rows, "TodayPlanItem")) {
      await tx.todayPlanItem.createMany({
        data: rows.TodayPlanItem.map((row) => ({
          id: String(row.id),
          todayPlanId: String(row.todayPlanId),
          taskId: String(row.taskId),
          groupKey: String(row.groupKey) as never,
          rank: asNumber(row.rank) ?? 0,
          reasonSummary: String(row.reasonSummary),
          reasonCodes: asString(row.reasonCodes),
          dismissed: asBoolean(row.dismissed),
          finalScore: asNumber(row.finalScore) ?? 0,
          analysisGeneratedAt: parseDate(row.analysisGeneratedAt)
        }))
      });
    }

    if (hasRows(rows, "GitHubIssueLink")) {
      await tx.gitHubIssueLink.createMany({
        data: rows.GitHubIssueLink.map((row) => ({
          id: String(row.id),
          taskId: String(row.taskId),
          repositoryId: String(row.repositoryId),
          githubIssueNumber: asNumber(row.githubIssueNumber) ?? 0,
          githubIssueNodeId: asString(row.githubIssueNodeId),
          githubIssueUrl: String(row.githubIssueUrl),
          githubState: String(row.githubState),
          githubTitle: String(row.githubTitle),
          githubBodySnapshot: asString(row.githubBodySnapshot),
          githubUpdatedAt: parseDate(row.githubUpdatedAt),
          lastSyncedAt: parseDate(row.lastSyncedAt)
        }))
      });
    }

    if (hasRows(rows, "ImportRow")) {
      await tx.importRow.createMany({
        data: rows.ImportRow.map((row) => ({
          id: String(row.id),
          importId: String(row.importId),
          rawPayload: String(row.rawPayload),
          normalizedPayload: asString(row.normalizedPayload),
          decision: String(row.decision) as never,
          matchedTaskId: asString(row.matchedTaskId),
          createdTaskId: asString(row.createdTaskId)
        }))
      });
    }

    if (hasRows(rows, "Job")) {
      await tx.job.createMany({
        data: rows.Job.map((row) => ({
          id: String(row.id),
          type: String(row.type) as never,
          status: String(row.status) as never,
          payload: asString(row.payload),
          attempts: asNumber(row.attempts) ?? 0,
          runAt: parseRequiredDate(row.runAt, "Job.runAt"),
          lastError: asString(row.lastError),
          createdAt: parseDate(row.createdAt) ?? undefined,
          updatedAt: parseDate(row.updatedAt) ?? undefined
        }))
      });
    }
  });

  console.log(
    `Migrated ${rows.Workspace.length} workspace(s), ${rows.Task.length} task(s), and ${rows.TaskComment.length} comment(s) from ${sqlitePath}.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
