import { isValidIsoDate } from "@/shared/lib/date";
import type { FormErrors } from "@/shared/lib/validation";

export interface TaskFormValues {
  title: string;
  assignee: string;
  deadline: string;
  meetingId: number | "";
}

export type TaskFormErrors = FormErrors<TaskFormValues>;

export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};

  const title = values.title.trim();
  if (!title) errors.title = "Опишите задачу";
  else if (title.length < 3) errors.title = "Минимум 3 символа";
  else if (title.length > 300) errors.title = "Не длиннее 300 символов";

  const assignee = values.assignee.trim();
  if (!assignee) errors.assignee = "Укажите ответственного";
  else if (assignee.length > 100) errors.assignee = "Не длиннее 100 символов";

  if (!values.deadline) errors.deadline = "Укажите дедлайн";
  else if (!isValidIsoDate(values.deadline)) errors.deadline = "Некорректная дата";

  if (values.meetingId === "") errors.meetingId = "Выберите собрание";

  return errors;
}
