import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetch } from "@/test/fakeApi";
import { ApiError } from "./ApiError";
import { apiRequest, setSessionLostHandler } from "./http";
import { tokenStorage } from "./tokenStorage";

const pair = (n: number) => ({ access_token: `access-${n}`, refresh_token: `refresh-${n}`, token_type: "bearer" });

beforeEach(() => {
  tokenStorage.clear();
  setSessionLostHandler(() => {});
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("добавляет Bearer-токен к приватным запросам", async () => {
    tokenStorage.set("access-1", "refresh-1");
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        seen.push((init.headers as Record<string, string>).Authorization);
        return new Response("[]", { status: 200 });
      }),
    );
    await apiRequest("/meetings");
    expect(seen).toEqual(["Bearer access-1"]);
  });

  it("при 401 обновляет токены и повторяет запрос", async () => {
    tokenStorage.set("expired", "refresh-1");
    const calls = mockFetch((c) => {
      if (c.path === "/auth/refresh") return { body: pair(2) };
      if (c.path === "/meetings") return { body: [] };
    });
    // первый запрос с просроченным токеном отвечает 401
    let first = true;
    const original = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/meetings") && first) {
        first = false;
        return new Response(JSON.stringify({ detail: "Срок действия токена истёк" }), { status: 401 });
      }
      return original(url, init);
    }));

    await expect(apiRequest("/meetings")).resolves.toEqual([]);
    expect(calls.map((c) => c.path)).toEqual(["/auth/refresh", "/meetings"]);
    expect(tokenStorage.getRefresh()).toBe("refresh-2");
    expect(tokenStorage.getAccess()).toBe("access-2");
  });

  it("параллельные запросы с 401 делают одно обновление токена", async () => {
    tokenStorage.set("expired", "refresh-1");
    let refreshCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/auth/refresh")) {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 20));
        return new Response(JSON.stringify(pair(2)), { status: 200 });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer access-2"
        ? new Response("[]", { status: 200 })
        : new Response(JSON.stringify({ detail: "x" }), { status: 401 });
    }));

    await Promise.all([apiRequest("/meetings"), apiRequest("/tasks"), apiRequest("/auth/me")]);
    expect(refreshCalls).toBe(1);
  });

  it("если refresh token недействителен: очищает токены и сообщает о потере сессии", async () => {
    tokenStorage.set("expired", "refresh-old");
    const lost = vi.fn();
    setSessionLostHandler(lost);
    mockFetch(() => ({ status: 401, body: { detail: "Refresh token отозван" } }));

    await expect(apiRequest("/meetings")).rejects.toMatchObject({ status: 401 });
    expect(lost).toHaveBeenCalledTimes(1);
    expect(tokenStorage.getRefresh()).toBeNull();
    expect(tokenStorage.getAccess()).toBeNull();
  });

  it("публичные запросы не запускают обновление токена", async () => {
    tokenStorage.set("a", "r");
    const calls = mockFetch(() => ({ status: 401, body: { detail: "Неверный email или пароль" } }));
    await expect(apiRequest("/auth/login", { method: "POST", form: { username: "a", password: "b" }, public: true })).rejects.toThrow(
      "Неверный email или пароль",
    );
    expect(calls).toHaveLength(1);
    expect(tokenStorage.getRefresh()).toBe("r");
  });

  it("422 превращается в понятное сообщение с названиями полей", async () => {
    tokenStorage.set("a", "r");
    mockFetch(() => ({
      status: 422,
      body: { detail: [{ loc: ["body", "title"], msg: "x" }, { loc: ["body", "deadline"], msg: "y" }] },
    }));
    await expect(apiRequest("/tasks", { method: "POST", json: {} })).rejects.toThrow("Проверьте поля: Название, Дедлайн");
  });

  it("403 и 404 сохраняют текст сервера и статус", async () => {
    tokenStorage.set("a", "r");
    mockFetch((c) => (c.path === "/meetings/1" ? { status: 403, body: { detail: "Нет доступа к этому собранию" } } : undefined));
    const error = await apiRequest("/meetings/1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, message: "Нет доступа к этому собранию" });
  });

  it("сетевая ошибка даёт статус 0 и не разлогинивает", async () => {
    tokenStorage.set("a", "r");
    const lost = vi.fn();
    setSessionLostHandler(lost);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(apiRequest("/meetings")).rejects.toMatchObject({ status: 0 });
    expect(lost).not.toHaveBeenCalled();
    expect(tokenStorage.getRefresh()).toBe("r");
  });

  it("204 возвращает undefined", async () => {
    tokenStorage.set("a", "r");
    mockFetch(() => ({ status: 204 }));
    await expect(apiRequest("/tasks/1", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
