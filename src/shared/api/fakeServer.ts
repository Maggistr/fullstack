/**
 * Имитация сервера для ЛР №3: данные хранятся в памяти, ответы приходят с задержкой.
 * Режим задаётся параметром адреса и читается один раз при загрузке страницы:
 *   /?demo=slow   — долгая загрузка (видно состояние «загрузка»)
 *   /?demo=empty  — пустые списки (состояние «нет данных»)
 *   /?demo=error  — все запросы завершаются ошибкой (состояние «ошибка»)
 * Файл будет удалён после подключения frontend к реальному API.
 */
export type DemoMode = "normal" | "slow" | "empty" | "error";

function readDemoMode(): DemoMode {
  const value = new URLSearchParams(window.location.search).get("demo");
  return value === "slow" || value === "empty" || value === "error" ? value : "normal";
}

export const demoMode: DemoMode = readDemoMode();

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function simulateRequest<T>(handler: () => T): Promise<T> {
  const base = demoMode === "slow" ? 4000 : 500;
  await new Promise((resolve) => setTimeout(resolve, base + Math.random() * 300));
  if (demoMode === "error") {
    throw new ApiError("Не удалось связаться с сервером. Проверьте соединение и повторите попытку.", 503);
  }
  return handler();
}
