import { demoMode } from "@/shared/api/fakeServer";
import type { Task } from "./types";

const DEMO_TASKS: Task[] = [
  { id: 1, title: "Подготовить макеты экранов", assignee: "Анна", deadline: "2026-10-28", status: "in_progress", meetingId: 1 },
  { id: 2, title: "Настроить backend на FastAPI", assignee: "Игорь", deadline: "2026-10-15", status: "done", meetingId: 1 },
  { id: 3, title: "Реализовать экспорт в PDF", assignee: "Мария", deadline: "2026-11-20", status: "in_progress", meetingId: 2 },
  { id: 4, title: "Согласовать сроки второго этапа", assignee: "Игорь", deadline: "2026-12-05", status: "postponed", meetingId: 2 },
];

export const initialTasks: Task[] = demoMode === "empty" ? [] : DEMO_TASKS;
