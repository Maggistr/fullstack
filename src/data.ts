export interface Task {
  id: number;
  title: string;
  assignee: string;
  deadline: string;
  done: boolean;
  meetingId: number;
}

export interface Meeting {
  id: number;
  title: string;
  date: string;
  agenda: string[];
  summary: string;
  decisions: string[];
}

export const meetings: Meeting[] = [
  {
    id: 1,
    title: "Планирование спринта",
    date: "2026-10-05",
    agenda: ["Итоги прошлого спринта", "Цели нового спринта", "Распределение задач"],
    summary:
      "Команда обсудила итоги спринта, выбрала приоритеты и распределила задачи по разработчикам.",
    decisions: ["Релиз перенесён на 20 октября", "Добавить авторизацию в MVP"],
  },
  {
    id: 2,
    title: "Встреча с заказчиком",
    date: "2026-10-08",
    agenda: ["Демо прототипа", "Обратная связь", "Сроки"],
    summary: "Заказчик одобрил прототип и попросил добавить экспорт протокола в PDF.",
    decisions: ["Добавить экспорт в PDF", "Следующая встреча через 2 недели"],
  },
];

export const tasks: Task[] = [
  { id: 1, title: "Подготовить макеты экранов", assignee: "Анна", deadline: "2026-10-10", done: false, meetingId: 1 },
  { id: 2, title: "Настроить backend на FastAPI", assignee: "Игорь", deadline: "2026-10-15", done: true, meetingId: 1 },
  { id: 3, title: "Реализовать экспорт в PDF", assignee: "Мария", deadline: "2026-10-22", done: false, meetingId: 2 },
];
