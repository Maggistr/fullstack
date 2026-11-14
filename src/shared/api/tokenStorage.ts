/**
 * Хранение токенов.
 * - access token живёт только в памяти: при перезагрузке страницы пропадает и получается заново по refresh token;
 * - refresh token лежит в localStorage, чтобы сессия переживала перезагрузку и была общей для вкладок.
 * Компромисс: localStorage доступен скриптам страницы (риск XSS). Более строгий вариант — httpOnly-cookie.
 */
const REFRESH_KEY = "meetings.refreshToken";

let accessToken: string | null = null;

export const tokenStorage = {
  getAccess: () => accessToken,
  getRefresh(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set(access: string, refresh: string) {
    accessToken = access;
    try {
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      /* хранилище недоступно — сессия проживёт до перезагрузки */
    }
  },
  clear() {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* ignore */
    }
  },
  refreshKey: REFRESH_KEY,
};
