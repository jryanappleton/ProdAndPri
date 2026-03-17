import { TaskStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: TaskStatus }) {
  const label =
    status === "waiting_on" ? "Waiting On" : status === "done" ? "Done" : "Open";

  return <span className={`status-badge status-${status}`}>{label}</span>;
}
