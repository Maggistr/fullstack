import { demoMode } from "@/shared/api/fakeServer";
import type { Meeting } from "./types";

const DEMO_MEETINGS: Meeting[] = [
  {
    id: 1,
    title: "Планирование спринта",
    date: "2026-10-05",
    agenda: ["Итоги прошлого спринта", "Цели нового спринта", "Распределение задач"],
    summary: "Команда обсудила итоги спринта, выбрала приоритеты и распределила задачи по разработчикам.",
    decisions: ["Релиз перенесён на 20 октября", "Добавить авторизацию в MVP"],
    audioName: null,
  },
  {
    id: 2,
    title: "Встреча с заказчиком",
    date: "2026-10-08",
    agenda: ["Демо прототипа", "Обратная связь", "Сроки"],
    summary: "Заказчик одобрил прототип и попросил добавить экспорт протокола в PDF.",
    decisions: ["Добавить экспорт в PDF", "Следующая встреча через 2 недели"],
    audioName: "demo-call.mp3",
  },
];

export const initialMeetings: Meeting[] = demoMode === "empty" ? [] : DEMO_MEETINGS;
