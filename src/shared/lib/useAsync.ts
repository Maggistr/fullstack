import { DependencyList, useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/fakeServer";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string; httpStatus?: number };

export interface UseAsyncResult<T> {
  state: AsyncState<T>;
  /** Повторить загрузку (показывает состояние загрузки). */
  reload: () => void;
  /** Локально заменить загруженные данные без повторного запроса. */
  update: (updater: (data: T) => T) => void;
}

/** Загружает данные и отдаёт состояние: loading / success / error. */
export function useAsync<T>(fetcher: () => Promise<T>, deps: DependencyList): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetcher()
      .then((data) => !cancelled && setState({ status: "success", data }))
      .catch((e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Неизвестная ошибка";
        setState({ status: "error", message, httpStatus: e instanceof ApiError ? e.status : undefined });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const update = useCallback((updater: (data: T) => T) => {
    setState((prev) => (prev.status === "success" ? { status: "success", data: updater(prev.data) } : prev));
  }, []);

  return { state, reload, update };
}
