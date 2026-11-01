/** Значения совпадают с backend (tasks.status): in_progress, done, postponed. */
export type TaskStatus = "in_progress" | "done" | "postponed";

export interface Task {
  id: number;
  title: string;
  assignee: string;
  /** Дата в формате YYYY-MM-DD. */
  deadline: string;
  status: TaskStatus;
  meetingId: number;
}

export type NewTask = Omit<Task, "id" | "status">;

export const TASK_STATUSES: readonly TaskStatus[] = ["in_progress", "done", "postponed"];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  in_progress: "В работе",
  done: "Готово",
  postponed: "Отложена",
};

export const TASK_STATUS_COLOR: Record<TaskStatus, "warning" | "success" | "default"> = {
  in_progress: "warning",
  done: "success",
  postponed: "default",
};
