import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStorage } from "@/shared/api/tokenStorage";
import { mockFetch } from "@/test/fakeApi";
import NewMeetingPage from "./NewMeetingPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/new"]}>
      <Routes>
        <Route path="/new" element={<NewMeetingPage />} />
        <Route path="/meetings/:id" element={<div>ПРОТОКОЛ ОТКРЫТ</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  tokenStorage.set("access", "refresh");
});

describe("NewMeetingPage", () => {
  it("создаёт собрание с несколькими пунктами повестки и открывает его протокол", async () => {
    const calls = mockFetch((c) => {
      if (c.method === "POST" && c.path === "/meetings") {
        return { status: 201, body: { id: 7, summary: "", decisions: [], tasks: [], ...(c.body as object) } };
      }
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Название/), "Ретроспектива");
    await user.type(screen.getByLabelText("Пункт 1"), "Что получилось");
    await user.click(screen.getByRole("button", { name: "Добавить пункт" }));
    await user.type(screen.getByLabelText("Пункт 2"), "Что улучшить");
    await user.click(screen.getByRole("button", { name: "Добавить пункт" })); // пустой пункт отбрасывается
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("ПРОТОКОЛ ОТКРЫТ")).toBeInTheDocument();
    expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({
      title: "Ретроспектива",
      agenda: ["Что получилось", "Что улучшить"],
    });
  });

  it("не отправляет пустую форму и подсказывает, что исправить", async () => {
    const calls = mockFetch(() => undefined);
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Введите название собрания")).toBeInTheDocument();
    expect(screen.getByText("Добавьте хотя бы один пункт повестки")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("удаляет пункт повестки, но оставляет минимум один", async () => {
    mockFetch(() => undefined);
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Добавить пункт" }));
    expect(screen.getByLabelText("Пункт 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Удалить: пункт 2" }));
    await waitFor(() => expect(screen.queryByLabelText("Пункт 2")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Удалить: пункт 1" })).toBeDisabled();
  });

  it("показывает ошибку сервера и не уходит со страницы", async () => {
    mockFetch(() => ({ status: 422, body: { detail: [{ loc: ["body", "title"], msg: "x" }] } }));
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/Название/), "Ретроспектива");
    await user.type(screen.getByLabelText("Пункт 1"), "Пункт");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Проверьте поля: Название")).toBeInTheDocument();
    expect(screen.queryByText("ПРОТОКОЛ ОТКРЫТ")).not.toBeInTheDocument();
  });
});
