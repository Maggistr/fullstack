import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/shared/api/ApiError";
import { setSessionLostHandler } from "@/shared/api/http";
import { tokenStorage } from "@/shared/api/tokenStorage";
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from "../api/userApi";
import type { Credentials, RegistrationData, User } from "./types";

/** loading — выясняем, есть ли действующая сессия (при первой загрузке страницы). */
export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Сообщение для экрана входа, например «Сессия истекла». */
  notice: string | null;
  login: (credentials: Credentials) => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearSession = useCallback((message: string | null = null) => {
    setUser(null);
    setStatus("anonymous");
    setNotice(message);
  }, []);

  // Восстановление сессии после перезагрузки: refresh token → access token → текущий пользователь
  useEffect(() => {
    let cancelled = false;
    if (!tokenStorage.getRefresh()) {
      clearSession();
      return;
    }
    fetchCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setStatus("authenticated");
      })
            .catch((e: unknown) => {
        if (cancelled) return;
        // 401: сессию уже закрыл обработчик из http.ts и выставил сообщение «Сессия истекла»
        if (e instanceof ApiError && e.status === 401) return;
        // Сервер недоступен — токены не трогаем, но войти без проверки нельзя
        clearSession(e instanceof ApiError && e.status === 0 ? e.message : null);
      });
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Сессия потеряна в середине работы (refresh token истёк или отозван)
  useEffect(() => {
    setSessionLostHandler(() => clearSession("Сессия истекла. Войдите снова."));
  }, [clearSession]);

  // Выход в другой вкладке: общий refresh token удалён
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === tokenStorage.refreshKey && e.newValue === null) clearSession();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clearSession]);

  const login = useCallback(async (credentials: Credentials) => {
    const u = await loginUser(credentials);
    setUser(u);
    setNotice(null);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (data: RegistrationData) => {
      await registerUser(data);
      await login({ email: data.email, password: data.password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, notice, login, register, logout }),
    [status, user, notice, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth нужно вызывать внутри AuthProvider");
  return ctx;
}
