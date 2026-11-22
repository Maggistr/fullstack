import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStorage } from "@/shared/api/tokenStorage";
import { Call, mockFetch } from "@/test/fakeApi";
import MeetingPage from "./MeetingPage";

const meetingDto = () => ({
  id: 1,
  title: "Планирование спринта",
  date: "2026-10-05",
  summary: "Обсудили цели",
  audio_path: null,
  agenda: ["Итоги", "Цели"],
  decisions: ["Релиз 20 октября"],
});

const taskDto = (over: object = {}) => ({
  id: 5,
  meeting_id: 1,
  title: "Подготовить макеты",
  assignee: "Анна",
  deadline: "2026-10-10",
  status: "in_progress",
  ...over,
});

function renderPage(path = "/meetings/1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/meetings/:id" element={<MeetingPage />} />
        <Route path="/" element={<div>СПИСОК СОБРАНИЙ</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  tokenStorage.set("access", "refresh");
});

/** Хранилище «сервера» для теста: тесты меняют его так же, как это делал бы backend. */
function serverWith(tasks = [taskDto()]) {
  const state = { meeting: meetingDto(), tasks };
  const calls = mockFetch((c: Call) => {
    if (c.method === "GET" && c.path === "/meetings/1") return { body: state.meeting };
    if (c.method === "GET" && c.path.startsWith("/tasks?meeting_id=1")) return { body: state.tasks };
    if (c.method === "PATCH" && c.path === "/meetings/1") {
      state.meeting = { ...state.meeting, ...(c.body as object) };
      return { body: state.meeting };
    }
    if (c.method === "DELETE" && c.path === "/meetings/1") return { status: 204 };
    const taskMatch = c.path.match(/^\/tasks\/(\d+)$/);
    if (taskMatch && c.method === "PATCH") {
      const t = state.tasks.find((x) => x.id === Number(taskMatch[1]))!;
      Object.assign(t, c.body);
      return { body: t };
    }
    if (taskMatch && c.method === "DELETE") {
      state.tasks = state.tasks.filter((x) => x.id !== Number(taskMatch[1]));
      return { status: 204 };
    }
  });
  return { state, calls };
}

describe("MeetingPage: данные из API", () => {
  it("показывает собрание, повестку, решения и задачи", async () => {
    serverWith();
    renderPage();
    expect(await screen.findByRole("heading", { name: "Планирование спринта" })).toBeInTheDocument();
    expect(screen.getByText("1. Итоги")).toBeInTheDocument();
    expect(screen.getByText("Релиз 20 октября")).toBeInTheDocument();
    expect(screen.getByText("Подготовить макеты")).toBeInTheDocument();
  });

  it("при отказе в доступе (403) показывает сообщение без кнопки «Повторить»", async () => {
    mockFetch(() => ({ status: 403, body: { detail: "Нет доступа к этому собранию" } }));
    renderPage();
    expect(await screen.findByText("Нет доступа к этому собранию")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
  });

  it("при 404 и при некорректном id показывает «не найдено»", async () => {
    mockFetch(() => ({ status: 404, body: { detail: "Собрание с id=1 не найдено" } }));
    const first = renderPage();
    expect(await screen.findByText("Собрание с id=1 не найдено")).toBeInTheDocument();
    first.unmount();

    renderPage("/meetings/abc");
    expect(await screen.findByText("Собрание не найдено")).toBeInTheDocument();
  });

  it("при сбое сервера (500) предлагает «Повторить»", async () => {
    mockFetch(() => ({ status: 500, body: { detail: "Внутренняя ошибка" } }));
    renderPage();
    expect(await screen.findByRole("button", { name: "Повторить" })).toBeInTheDocument();
  });
});

describe("MeetingPage: редактирование собрания", () => {
  it("сохраняет изменения через PATCH и сразу обновляет экран", async () => {
    const { calls } = serverWith();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Редактировать" }));
    const dialog = await screen.findByRole("dialog", { name: "Редактирование собрания" });

    const title = within(dialog).getByLabelText(/Название/);
    await user.clear(title);
    await user.type(title, "Новое название");
    await user.type(within(dialog).getByLabelText("Решение 1"), " (подтверждено)");
    await user.click(within(dialog).getByRole("button", { name: "Добавить пункт" }));
    await user.type(within(dialog).getByLabelText("Пункт 3"), "Вопросы");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByRole("heading", { name: "Новое название" })).toBeInTheDocument();
    const patch = calls.find((c) => c.method === "PATCH" && c.path === "/meetings/1");
    expect(patch?.body).toMatchObject({
      title: "Новое название",
      agenda: ["Итоги", "Цели", "Вопросы"],
      decisions: ["Релиз 20 октября (подтверждено)"],
    });
    expect(await screen.findByText("3. Вопросы")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("не отправляет форму с ошибками и показывает понятные подсказки", async () => {
    const { calls } = serverWith();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Редактировать" }));
    const dialog = await screen.findByRole("dialog");
    await user.clear(within(dialog).getByLabelText(/Название/));
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(await within(dialog).findByText("Введите название собрания")).toBeInTheDocument();
    expect(within(dialog).getByText("Исправьте ошибки в форме и повторите сохранение.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("показывает ошибку сервера (403) в диалоге и не закрывает его", async () => {
    mockFetch((c) => {
      if (c.method === "GET" && c.path === "/meetings/1") return { body: meetingDto() };
      if (c.method === "GET") return { body: [] };
      if (c.method === "PATCH") return { status: 403, body: { detail: "Нет доступа к этому собранию" } };
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Редактировать" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(await within(dialog).findByText("Нет доступа к этому собранию")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("показывает ошибку валидации сервера (422) по названиям полей", async () => {
    mockFetch((c) => {
      if (c.method === "GET" && c.path === "/meetings/1") return { body: meetingDto() };
      if (c.method === "GET") return { body: [] };
      if (c.method === "PATCH") return { status: 422, body: { detail: [{ loc: ["body", "date"], msg: "bad" }] } };
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Редактировать" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));
    expect(await within(dialog).findByText("Проверьте поля: Дата")).toBeInTheDocument();
  });
});

describe("MeetingPage: удаление собрания", () => {
  it("после подтверждения удаляет собрание и возвращает к списку", async () => {
    const { calls } = serverWith();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Удалить" }));
    const dialog = await screen.findByRole("dialog", { name: "Удалить собрание?" });
    expect(calls.some((c) => c.method === "DELETE")).toBe(false); // без подтверждения ничего не удалено
    await user.click(within(dialog).getByRole("button", { name: "Удалить" }));

    expect(await screen.findByText("СПИСОК СОБРАНИЙ")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "DELETE").map((c) => c.path)).toEqual(["/meetings/1"]);
  });

  it("отмена не удаляет собрание", async () => {
    const { calls } = serverWith();
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Удалить" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    expect(screen.getByRole("heading", { name: "Планирование спринта" })).toBeInTheDocument();
  });

  it("если сервер отказал, остаётся на странице и показывает причину", async () => {
    mockFetch((c) => {
      if (c.method === "GET" && c.path === "/meetings/1") return { body: meetingDto() };
      if (c.method === "GET") return { body: [] };
      if (c.method === "DELETE") return { status: 403, body: { detail: "Нет доступа к этому собранию" } };
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Удалить" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Удалить" }));
    expect(await within(dialog).findByText("Нет доступа к этому собранию")).toBeInTheDocument();
    expect(screen.queryByText("СПИСОК СОБРАНИЙ")).not.toBeInTheDocument();
  });
});

describe("MeetingPage: задачи", () => {
  it("редактирует задачу и показывает новые данные", async () => {
    const { calls } = serverWith();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Редактировать задачу «Подготовить макеты»" }));
    const dialog = await screen.findByRole("dialog", { name: "Редактирование задачи" });
    const assignee = within(dialog).getByLabelText(/Ответственный/);
    await user.clear(assignee);
    await user.type(assignee, "Борис");
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText(/Борис, до/)).toBeInTheDocument();
    expect(calls.find((c) => c.method === "PATCH" && c.path === "/tasks/5")?.body).toEqual({
      title: "Подготовить макеты",
      assignee: "Борис",
      deadline: "2026-10-10",
    });
  });

  it("валидирует форму редактирования задачи", async () => {
    const { calls } = serverWith();
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Редактировать задачу «Подготовить макеты»" }));
    const dialog = await screen.findByRole("dialog");
    await user.clear(within(dialog).getByLabelText(/Задача/));
    await user.click(within(dialog).getByRole("button", { name: "Сохранить" }));
    expect(await within(dialog).findByText("Опишите задачу")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("удаляет задачу после подтверждения, и она исчезает из списка", async () => {
    const { calls } = serverWith();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Удалить задачу «Подготовить макеты»" }));
    const dialog = await screen.findByRole("dialog", { name: "Удалить задачу?" });
    await user.click(within(dialog).getByRole("button", { name: "Удалить" }));

    await waitFor(() => expect(screen.queryByText("Подготовить макеты")).not.toBeInTheDocument());
    expect(screen.getByText("Задач по этому собранию пока нет.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "DELETE" && c.path === "/tasks/5")).toBe(true);
  });

  it("создаёт задачу и она появляется в списке без перезагрузки", async () => {
    const { state } = serverWith([]);
    const calls = mockFetch((c) => {
      if (c.method === "GET" && c.path === "/meetings/1") return { body: state.meeting };
      if (c.method === "GET") return { body: [] };
      if (c.method === "POST" && c.path === "/tasks") {
        return { status: 201, body: taskDto({ id: 9, ...(c.body as object) }) };
      }
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Добавить задачу" }));
    await user.type(await screen.findByLabelText(/^Задача/), "Написать отчёт");
    await user.type(screen.getByLabelText(/Ответственный/), "Вера");
    await user.type(screen.getByLabelText(/Дедлайн/), "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Создать задачу" }));

    expect(await screen.findByText("Написать отчёт")).toBeInTheDocument();
    expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({
      meeting_id: 1,
      title: "Написать отчёт",
      assignee: "Вера",
      deadline: "2026-12-01",
    });
  });
});
