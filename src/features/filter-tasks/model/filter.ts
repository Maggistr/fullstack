import type { Task, TaskStatus } from "@/entities/task";

export interface TaskFilterValue {
  status: TaskStatus | "all";
  query: string;
}

export const DEFAULT_TASK_FILTER: TaskFilterValue = { status: "all", query: "" };

export function isFilterActive(filter: TaskFilterValue): boolean {
  return filter.status !== "all" || filter.query.trim() !== "";
}

export function applyTaskFilter(tasks: Task[], filter: TaskFilterValue): Task[] {
  const query = filter.query.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (filter.status === "all" || t.status === filter.status) &&
      (!query || t.title.toLowerCase().includes(query) || t.assignee.toLowerCase().includes(query)),
  );
}
