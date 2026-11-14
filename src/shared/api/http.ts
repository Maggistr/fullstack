import { ApiError } from "./ApiError";
import { tokenStorage } from "./tokenStorage";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** JSON-тело запроса. */
  json?: unknown;
  /** Тело в формате application/x-www-form-urlencoded (нужно для /auth/login). */
  form?: Record<string, string>;
  /** Публичный запрос: токен не добавляется и при 401 обновление не запускается. */
  public?: boolean;
}

let onSessionLost: () => void = () => {};

/** Приложение сообщает, что делать, когда сессию восстановить нельзя (refresh token недействителен). */
export function setSessionLostHandler(handler: () => void) {
  onSessionLost = handler;
}

function errorMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (status === 422) return "Некорректные данные запроса";
  return `Ошибка сервера (${status})`;
}

async function send(path: string, options: RequestOptions, withToken: boolean): Promise<Response> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.form) {
    body = new URLSearchParams(options.form);
  }
  const access = tokenStorage.getAccess();
  if (withToken && access) headers.Authorization = `Bearer ${access}`;

  try {
    return await fetch(`${API_URL}${path}`, { method: options.method ?? "GET", headers, body });
  } catch {
    throw new ApiError("Не удалось связаться с сервером. Проверьте соединение и повторите попытку.", 0);
  }
}

// Одновременные запросы, получившие 401, ждут одно и то же обновление:
// refresh token одноразовый, второй параллельный запрос с ним был бы отклонён.
let refreshing: Promise<boolean> | null = null;

/** Обновляет пару токенов. false — сессии больше нет (токен недействителен). Сетевая ошибка — исключение. */
function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const refresh = tokenStorage.getRefresh();
    if (!refresh) return false;
    const response = await send("/auth/refresh", { method: "POST", json: { refresh_token: refresh }, public: true }, false);
    if (response.status === 401 || response.status === 422) {
      tokenStorage.clear();
      return false;
    }
    if (!response.ok) throw new ApiError(errorMessage(response.status, null), response.status);
    const tokens = (await response.json()) as TokenPair;
    tokenStorage.set(tokens.access_token, tokens.refresh_token);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(errorMessage(response.status, body), response.status);
  return body as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options, !options.public);

  if (response.status === 401 && !options.public && tokenStorage.getRefresh()) {
    // Access token истёк или его нет (после перезагрузки страницы): пробуем обновить и повторить запрос
    const restored = await refreshTokens();
    if (restored) response = await send(path, options, true);
  }

  if (response.status === 401 && !options.public) {
    tokenStorage.clear();
    onSessionLost();
    throw new ApiError("Сессия истекла. Войдите снова.", 401);
  }
  return parse<T>(response);
}
