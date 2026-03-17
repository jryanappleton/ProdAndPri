import { PrismaClient, TodayLens } from "@prisma/client";

export async function resetAndSeedWorkspace(prisma: PrismaClient) {
  await prisma.todayPlanItem.deleteMany();
  await prisma.todayPlan.deleteMany();
  await prisma.taskAiState.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskTag.deleteMany();
  await prisma.gitHubIssueLink.deleteMany();
  await prisma.importRow.deleteMany();
  await prisma.import.deleteMany();
  await prisma.job.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.taskList.deleteMany();
  await prisma.area.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.todayFeedbackMessage.deleteMany();
  await prisma.gitHubRepository.deleteMany();
  await prisma.gitHubConnection.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: {
      name: "Personal"
    }
  });

  await prisma.userPreferences.create({
    data: {
      workspaceId: workspace.id,
      defaultLens: TodayLens.balanced
    }
  });

  return workspace;
}

export async function ensureWorkspaceSeeded(prisma: PrismaClient) {
  const workspace = await prisma.workspace.findFirst();
  if (workspace) {
    return workspace;
  }

  return resetAndSeedWorkspace(prisma);
}
