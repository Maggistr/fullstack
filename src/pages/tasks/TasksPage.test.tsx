import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStorage } from "@/shared/api/tokenStorage";
import { mockFetch } from "@/test/fakeApi";
import TasksPage from "./TasksPage";

const tasks = () => [
  { id: 1, meeting_id: 1, title: "Подготовить макеты", assignee: "Анна", deadline: "2030-10-10", status: "in_progress" },
  { id: 2, meeting_id: 1, title: "Написать тесты", assignee: "Борис", deadline: "2030-10-12", status: "done" },
];
const meetings = [{ id: 1, title: "Планёрка", date: "2030-10-01", audio_path: null, agenda_count: 1, decisions_count: 0 }];

beforeEach(() => {
  vi.unstubAllGlobals();
  tokenStorage.set("access", "refresh");
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <TasksPage />
    </MemoryRouter>,
  );

describe("TasksPage", () => {
  it("показывает задачи пользователя с названием собрания", async () => {
    mockFetch((c) => (c.path === "/tasks" ? { body: tasks() } : c.path === "/meetings" ? { body: meetings } : undefined));
    renderPage();
    expect(await screen.findByText("Подготовить макеты")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Планёрка" })).toHaveLength(2);
  });

  it("показывает «нет данных», если задач нет", async () => {
    mockFetch((c) => (c.path === "/tasks" ? { body: [] } : { body: [] }));
    renderPage();
    expect(await screen.findByText("Задач пока нет")).toBeInTheDocument();
  });

  it("показывает ошибку загрузки с кнопкой «Повторить» при сбое сервера", async () => {
    mockFetch(() => ({ status: 500, body: { detail: "Внутренняя ошибка" } }));
    renderPage();
    expect(await screen.findByRole("button", { name: "Повторить" })).toBeInTheDocument();
  });

  it("редактирование и удаление задач сразу отражаются в таблице", async () => {
    const calls = mockFetch((c) => {
      if (c.method === "GET" && c.path === "/tasks") return { body: tasks() };
      if (c.method === "GET" && c.path === "/meetings") return { body: meetings };
      if (c.method === "PATCH" && c.path === "/tasks/1") return { body: { ...tasks()[0], ...(c.body as object) } };
      if (c.method === "DELETE" && c.path === "/tasks/2") return { status: 204 };
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Редактировать задачу «Подготовить макеты»" }));
    const dialog = await screen.findByRole("dialog");
    const assignee = within(dialog).getByLabelText(/Ответственный/);
    await user.clear(assignee);
    await user.type(assignee, "Вера");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Вера")).toBeInTheDocument();
    expect(screen.queryByText("Анна")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Удалить задачу «Написать тесты»" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Удалить" }));
    await waitFor(() => expect(screen.queryByText("Написать тесты")).not.toBeInTheDocument());
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(1);
  });
});
