import { ApiError, simulateRequest } from "@/shared/api/fakeServer";
import { initialTasks } from "../model/demoData";
import type { NewTask, Task, TaskStatus } from "../model/types";

const tasks: Task[] = [...initialTasks];
let nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;

export const listTasks = (): Promise<Task[]> =>
  simulateRequest(() => [...tasks].sort((a, b) => a.deadline.localeCompare(b.deadline)));

export const listTasksByMeeting = (meetingId: number): Promise<Task[]> =>
  simulateRequest(() =>
    tasks.filter((t) => t.meetingId === meetingId).sort((a, b) => a.deadline.localeCompare(b.deadline)),
  );

export const createTask = (input: NewTask): Promise<Task> =>
  simulateRequest(() => {
    const task: Task = { ...input, id: nextId++, status: "in_progress" };
    tasks.push(task);
    return task;
  });

export const updateTaskStatus = (id: number, status: TaskStatus): Promise<Task> =>
  simulateRequest(() => {
    const task = tasks.find((t) => t.id === id);
    if (!task) throw new ApiError(`Задача с id=${id} не найдена`, 404);
    task.status = status;
    return { ...task };
  });
