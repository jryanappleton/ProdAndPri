import { TaskDetailScreen } from "@/components/tasks/TaskDetailScreen";

export default async function TaskDetailPage({
  params
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskDetailScreen taskId={taskId} />;
}
