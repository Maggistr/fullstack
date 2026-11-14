import { apiRequest } from "@/shared/api/http";
import { tokenStorage } from "@/shared/api/tokenStorage";
import type { Credentials, RegistrationData, User } from "../model/types";

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export const registerUser = (data: RegistrationData): Promise<User> =>
  apiRequest<User>("/auth/register", { method: "POST", json: data, public: true });

/** Вход: сохраняет пару токенов и возвращает текущего пользователя. */
export async function loginUser({ email, password }: Credentials): Promise<User> {
  const tokens = await apiRequest<TokenPair>("/auth/login", {
    method: "POST",
    form: { username: email, password },
    public: true,
  });
  tokenStorage.set(tokens.access_token, tokens.refresh_token);
  return fetchCurrentUser();
}

export const fetchCurrentUser = (): Promise<User> => apiRequest<User>("/auth/me");

/** Выход: просим сервер отозвать refresh token этой сессии, затем чистим токены на клиенте. */
export async function logoutUser(): Promise<void> {
  const refresh = tokenStorage.getRefresh();
  try {
    if (refresh) {
      await apiRequest<void>("/auth/logout", { method: "POST", json: { refresh_token: refresh }, public: true });
    }
  } finally {
    // Даже если сервер недоступен, локальная сессия закрывается
    tokenStorage.clear();
  }
}
