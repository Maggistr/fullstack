import { apiRequest } from "@/shared/api/http";
import type { NewTask, Task, TaskPatch, TaskStatus } from "../model/types";

interface TaskDto {
  id: number;
  meeting_id: number;
  title: string;
  assignee: string;
  deadline: string;
  status: TaskStatus;
}

const toTask = (dto: TaskDto): Task => ({
  id: dto.id,
  meetingId: dto.meeting_id,
  title: dto.title,
  assignee: dto.assignee,
  deadline: dto.deadline,
  status: dto.status,
});

export const listTasks = async (): Promise<Task[]> => (await apiRequest<TaskDto[]>("/tasks")).map(toTask);

export const listTasksByMeeting = async (meetingId: number): Promise<Task[]> =>
  (await apiRequest<TaskDto[]>(`/tasks?meeting_id=${meetingId}`)).map(toTask);

export const createTask = async (input: NewTask): Promise<Task> =>
  toTask(
    await apiRequest<TaskDto>("/tasks", {
      method: "POST",
      json: { meeting_id: input.meetingId, title: input.title, assignee: input.assignee, deadline: input.deadline },
    }),
  );

export const updateTaskStatus = async (id: number, status: TaskStatus): Promise<Task> =>
  toTask(await apiRequest<TaskDto>(`/tasks/${id}`, { method: "PATCH", json: { status } }));

export const updateTask = async (id: number, patch: TaskPatch): Promise<Task> =>
  toTask(await apiRequest<TaskDto>(`/tasks/${id}`, { method: "PATCH", json: patch }));

export const deleteTask = (id: number): Promise<void> => apiRequest<void>(`/tasks/${id}`, { method: "DELETE" });
