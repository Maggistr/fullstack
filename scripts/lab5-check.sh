#!/usr/bin/env bash
# ЛР №5: запуск и проверка всего приложения (БД + backend + frontend) по инструкции из README.
#
# Что делает:
#   1. проверяет наличие нужных программ, создаёт backend/.env из примера (если его нет);
#   2. поднимает PostgreSQL (docker compose) и ждёт, пока БД примет соединение;
#   3. ставит зависимости backend в backend/.venv и запускает автотесты (pytest);
#   4. запускает backend (uvicorn) и прогоняет сквозной сценарий через HTTP:
#      регистрация, вход, CRUD собраний и задач, права доступа (401/403/404/422),
#      обновление и отзыв токенов, проверка данных прямо в PostgreSQL и каскадного удаления;
#   5. запускает тесты frontend, собирает его (tsc + vite build) и проверяет, что dev-сервер отвечает.
#
# Использование (из корня репозитория):
#   bash scripts/lab5-check.sh [--quick] [--install] [--no-docker] [--no-frontend] [--keep] [--reset-db]
#
#   --quick        только запуск: без pytest, сквозной проверки API, npm test и сборки (подразумевает --keep)
#   --install      принудительно переустановить зависимости (pip install, npm ci)
#   --no-docker    не трогать docker: PostgreSQL уже запущен, параметры в backend/.env
#   --no-frontend  пропустить npm install / сборку / dev-сервер
#   --keep         после проверки оставить backend и frontend запущенными (для демонстрации MVP)
#   --reset-db     удалить том БД (docker compose down -v) и начать с чистой базы
#   -h, --help     эта справка
#
# Зависимости ставятся только при первом запуске и при изменении requirements*.txt / package-lock.json.
#
# Код возврата: 0 — все проверки пройдены, 1 — есть ошибки.

set -uo pipefail

# ---------- параметры ----------
USE_DOCKER=1
USE_FRONTEND=1
KEEP=0
RESET_DB=0
QUICK=0
FORCE_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --no-docker) USE_DOCKER=0 ;;
    --no-frontend) USE_FRONTEND=0 ;;
    --keep) KEEP=1 ;;
    --reset-db) RESET_DB=1 ;;
    --quick) QUICK=1; KEEP=1 ;;
    --install) FORCE_INSTALL=1 ;;
    -h | --help) sed -n '2,/^# Код возврата/p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Неизвестный параметр: $arg (см. --help)"; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 2

BACKEND_PORT=8000
FRONTEND_PORT=5173
API="http://localhost:${BACKEND_PORT}"
WEB="http://localhost:${FRONTEND_PORT}"
LOG_DIR="$ROOT/.run"
mkdir -p "$LOG_DIR"

# ---------- вывод ----------
if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BOLD=""; RESET=""
fi
FAILS=0
step() { printf '\n%s== %s ==%s\n' "$BOLD" "$*" "$RESET"; }
ok() { printf '  %s✔%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$*"; }
fail() { printf '  %s✘%s %s\n' "$RED" "$RESET" "$*"; FAILS=$((FAILS + 1)); }
die() { fail "$*"; summary; exit 1; }

BACKEND_PID=""
FRONT_PID=""
# Останавливает процесс вместе с его дочерними (на случай обёрток вроде npm)
stop_proc() {
  [ -n "${1:-}" ] || return 0
  if command -v pkill >/dev/null 2>&1; then pkill -P "$1" 2>/dev/null; fi
  kill "$1" 2>/dev/null
  return 0
}
cleanup() {
  if [ "$KEEP" -eq 1 ] && [ "$FAILS" -eq 0 ]; then
    return
  fi
  stop_proc "$FRONT_PID"
  stop_proc "$BACKEND_PID"
  return 0
}
trap cleanup EXIT
trap 'echo; echo "Прервано."; exit 130' INT TERM

summary() {
  echo
  if [ "$FAILS" -eq 0 ]; then
    printf '%s%sВсе проверки пройдены.%s\n' "$BOLD" "$GREEN" "$RESET"
  else
    printf '%s%sОшибок: %d.%s Логи: %s\n' "$BOLD" "$RED" "$FAILS" "$RESET" "$LOG_DIR"
  fi
}

port_busy() { curl -s -o /dev/null --max-time 2 "http://localhost:$1" 2>/dev/null; }

wait_http() { # url, сколько секунд ждать
  local i
  for ((i = 0; i < $2; i++)); do
    curl -sf -o /dev/null --max-time 2 "$1" 2>/dev/null && return 0
    sleep 1
  done
  return 1
}

# ---------- 1. Окружение ----------
step "1. Проверка окружения"
PY_SYS=""
for c in python3 python; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' 2>/dev/null; then
    PY_SYS="$c"; break
  fi
done
[ -n "$PY_SYS" ] && ok "Python: $($PY_SYS --version 2>&1)" || die "Нужен Python 3.11+"
command -v curl >/dev/null 2>&1 && ok "curl найден" || die "Нужен curl"
if [ "$USE_DOCKER" -eq 1 ]; then
  command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 \
    && ok "docker compose найден" \
    || die "Нужен docker с плагином compose (или запустите с --no-docker и поднимите PostgreSQL сами)"
fi
if [ "$USE_FRONTEND" -eq 1 ]; then
  command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 \
    && ok "Node.js: $(node --version)" || die "Нужен Node.js 18+ (или запустите с --no-frontend)"
fi

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  secret="$("$PY_SYS" -c 'import secrets; print(secrets.token_hex(32))')"
  # JWT_SECRET_KEY в примере — заглушка, для реального запуска генерируем свой ключ
  "$PY_SYS" - "$secret" <<'PY'
import re, sys
path = "backend/.env"
text = open(path, encoding="utf-8").read()
text = re.sub(r"(?m)^JWT_SECRET_KEY=.*$", "JWT_SECRET_KEY=" + sys.argv[1], text)
open(path, "w", encoding="utf-8", newline="\n").write(text)
PY
  ok "Создан backend/.env (JWT_SECRET_KEY сгенерирован, остальное — из примера)"
else
  ok "backend/.env уже есть"
fi

for p in "$BACKEND_PORT" "$( [ "$USE_FRONTEND" -eq 1 ] && echo "$FRONTEND_PORT" || echo "$BACKEND_PORT")"; do
  if port_busy "$p"; then die "Порт $p уже занят — остановите запущенное приложение и повторите"; fi
done

# ---------- 2. База данных ----------
step "2. PostgreSQL"
if [ "$USE_DOCKER" -eq 1 ]; then
  : >"$LOG_DIR/db.log" # лог каждого запуска начинается заново
  DC=(docker compose --env-file backend/.env)
  if [ "$RESET_DB" -eq 1 ]; then
    "${DC[@]}" down -v >>"$LOG_DIR/db.log" 2>&1 && ok "Том БД удалён (чистая база)"
  fi
  if "${DC[@]}" up -d db >>"$LOG_DIR/db.log" 2>&1; then
    ok "Контейнер db запущен"
  elif [ -n "$("${DC[@]}" ps --status running -q db 2>/dev/null)" ]; then
    # Бывает, что compose возвращает ошибку уже после старта (например, Docker Desktop перезапускает движок)
    warn "docker compose сообщил об ошибке, но контейнер db работает — продолжаем (подробности: $LOG_DIR/db.log)"
  else
    tail -15 "$LOG_DIR/db.log"
    if grep -q "port is already allocated" "$LOG_DIR/db.log"; then
      echo
      echo "  Порт 5432 уже занят: его держит другой контейнер или PostgreSQL, установленный на самом компьютере."
      echo "  Посмотреть контейнеры:        docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
      echo "  Удалить старый контейнер:     docker rm -f <имя>"
      echo "  Кто слушает порт в WSL:       ss -ltnp | grep 5432"
      echo "  Кто слушает порт в Windows:   netstat -ano | findstr :5432   (в PowerShell)"
    elif grep -q "dockerDesktopLinuxEngine\|Cannot connect to the Docker daemon" "$LOG_DIR/db.log"; then
      echo
      echo "  Docker не отвечает. Запустите Docker Desktop, дождитесь «Engine running» и повторите."
    fi
    die "Не удалось запустить контейнер db"
  fi
else
  warn "--no-docker: ожидается, что PostgreSQL уже запущен с параметрами из backend/.env"
fi

# ---------- 3. Backend: зависимости и автотесты ----------
step "3. Backend: зависимости и автотесты"
if [ ! -d backend/.venv ]; then
  "$PY_SYS" -m venv backend/.venv >"$LOG_DIR/venv.log" 2>&1 || { cat "$LOG_DIR/venv.log"; die "Не удалось создать venv"; }
fi
if [ -x backend/.venv/bin/python ]; then VENV_PY="$ROOT/backend/.venv/bin/python"; else VENV_PY="$ROOT/backend/.venv/Scripts/python.exe"; fi
DEPS_MARK="backend/.venv/.deps-installed"
if [ "$FORCE_INSTALL" -eq 1 ] || [ ! -f "$DEPS_MARK" ] \
  || [ backend/requirements.txt -nt "$DEPS_MARK" ] || [ backend/requirements-dev.txt -nt "$DEPS_MARK" ]; then
  if "$VENV_PY" -m pip install -q -r backend/requirements-dev.txt >"$LOG_DIR/pip.log" 2>&1; then
    touch "$DEPS_MARK"; ok "Зависимости установлены"
  else
    tail -20 "$LOG_DIR/pip.log"; die "pip install завершился с ошибкой"
  fi
else
  ok "Зависимости backend уже установлены (пропуск; --install — переустановить)"
fi

if [ "$QUICK" -eq 1 ]; then
  warn "--quick: pytest пропущен"
elif (cd backend && "$VENV_PY" -m pytest -q >"$LOG_DIR/pytest.log" 2>&1); then
  ok "pytest: $(tail -1 "$LOG_DIR/pytest.log")"
else
  tail -30 "$LOG_DIR/pytest.log"; fail "pytest: есть упавшие тесты"
fi

# ---------- 4. Backend + БД: сквозной сценарий ----------
step "4. Запуск backend и подключение к PostgreSQL"
db_ready() {
  (cd backend && "$VENV_PY" - <<'PY'
import sys
from sqlalchemy import text
from app.database import engine
try:
    with engine.connect() as c:
        c.execute(text("select 1"))
except Exception as e:  # noqa: BLE001
    print(e, file=sys.stderr)
    sys.exit(1)
PY
  ) >"$LOG_DIR/dbcheck.log" 2>&1
}
db_ok=0
for ((i = 0; i < 60; i++)); do
  if db_ready; then db_ok=1; break; fi
  sleep 1
done
if [ "$db_ok" -eq 1 ]; then ok "PostgreSQL принимает соединения"; else tail -5 "$LOG_DIR/dbcheck.log"; die "Не удалось подключиться к БД за 60 с (проверьте backend/.env)"; fi

pushd backend >/dev/null || exit 2
"$VENV_PY" -m uvicorn app.main:app --port "$BACKEND_PORT" >"$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
popd >/dev/null || exit 2
if wait_http "$API/health" 30; then ok "Backend отвечает: $API (таблицы созданы при старте)"; else tail -20 "$LOG_DIR/backend.log"; die "Backend не запустился"; fi

step "5. Сквозной сценарий через API (данные проверяются в PostgreSQL)"
if [ "$QUICK" -eq 1 ]; then
  warn "--quick: сквозная проверка API пропущена"
else
(cd backend && "$VENV_PY" - "$API" "$WEB" <<'PY'
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from sqlalchemy import text

from app.database import engine

API, WEB = sys.argv[1], sys.argv[2]
RUN = str(int(time.time()))
EMAIL_A, EMAIL_B = f"lab5check-a-{RUN}@example.com", f"lab5check-b-{RUN}@example.com"
PASSWORD = "lab5-check-pass-1"
failures = 0
GREEN, RED, RESET = ("\033[32m", "\033[31m", "\033[0m") if sys.stdout.isatty() else ("", "", "")


def check(name, cond, detail=""):
    global failures
    if cond:
        print(f"  {GREEN}✔{RESET} {name}")
    else:
        failures += 1
        print(f"  {RED}✘{RESET} {name} {detail}")
    return cond


def call(method, path, token=None, body=None, form=None, headers=None):
    data, hdr = None, dict(headers or {})
    if body is not None:
        data, hdr["Content-Type"] = json.dumps(body).encode(), "application/json"
    elif form is not None:
        data = urllib.parse.urlencode(form).encode()
    if token:
        hdr["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(API + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw, status, rh = r.read(), r.status, r.headers
    except urllib.error.HTTPError as e:
        raw, status, rh = e.read(), e.code, e.headers
    try:
        return status, json.loads(raw) if raw else None, rh
    except ValueError:
        return status, raw.decode(errors="replace"), rh


def db(sql, **params):
    with engine.connect() as c:
        return c.execute(text(sql), params).scalar()


def login(email, password=PASSWORD):
    return call("POST", "/auth/login", form={"username": email, "password": password})


try:
    # --- служебное
    s, b, _ = call("GET", "/health")
    check("GET /health → 200", s == 200 and b == {"status": "ok"})
    s, _, _ = call("GET", "/docs")
    check("Swagger UI /docs доступен", s == 200)
    s, _, h = call(
        "OPTIONS", "/auth/login",
        headers={"Origin": WEB, "Access-Control-Request-Method": "POST",
                 "Access-Control-Request-Headers": "content-type,authorization"},
    )
    check("CORS: frontend (5173) допущен к API", h.get("access-control-allow-origin") == WEB, f"[{s}]")

    # --- публичное / приватное
    s, _, h = call("GET", "/meetings")
    check("Без токена GET /meetings → 401", s == 401 and h.get("www-authenticate") == "Bearer")

    # --- регистрация и вход
    s, b, _ = call("POST", "/auth/register", body={"email": EMAIL_A, "name": "Анна Проверкина", "password": PASSWORD})
    check("Регистрация → 201, пароль в ответе не возвращается",
          s == 201 and b.get("email") == EMAIL_A and "password" not in json.dumps(b))
    s, b, _ = call("POST", "/auth/register", body={"email": EMAIL_A.upper(), "name": "Дубль", "password": PASSWORD})
    check("Повторная регистрация того же email → 409", s == 409, f"[{s}]")
    s, _, _ = call("POST", "/auth/register", body={"email": "bad", "name": "X", "password": "1"})
    check("Некорректные данные регистрации → 422", s == 422)
    s, _, _ = login(EMAIL_A, "wrong-password-1")
    check("Неверный пароль → 401", s == 401)
    ph = db("select password_hash from users where email = :e", e=EMAIL_A)
    check("В БД лежит хеш argon2id, а не пароль", bool(ph) and ph.startswith("$argon2id$") and PASSWORD not in ph)

    s, tok_a, _ = login(EMAIL_A)
    check("Вход → 200, выданы access и refresh токены",
          s == 200 and tok_a.get("access_token") and tok_a.get("refresh_token"))
    A = tok_a["access_token"]
    s, me, _ = call("GET", "/auth/me", A)
    check("GET /auth/me → текущий пользователь", s == 200 and me["email"] == EMAIL_A)

    # --- собрания: создание, чтение, изменение
    title = f"Проверка ЛР5 {RUN}"
    s, m, _ = call("POST", "/meetings", A, body={
        "title": title, "date": "2026-11-20", "summary": "Резюме",
        "agenda": ["Итоги", "Планы"], "decisions": ["Запустить MVP"]})
    check("POST /meetings → 201 с повесткой и решениями",
          s == 201 and m["agenda"] == ["Итоги", "Планы"] and m["decisions"] == ["Запустить MVP"])
    mid = m["id"]
    check("Собрание сохранено в PostgreSQL",
          db("select count(*) from meetings where id = :i and title = :t", i=mid, t=title) == 1)
    check("Повестка и решения лежат в связанных таблицах",
          db("select count(*) from agenda_items where meeting_id = :i", i=mid) == 2
          and db("select count(*) from decisions where meeting_id = :i", i=mid) == 1)
    check("Владелец собрания записан в БД",
          db("select count(*) from meetings m join users u on u.id = m.owner_id "
             "where m.id = :i and u.email = :e", i=mid, e=EMAIL_A) == 1)

    s, lst, _ = call("GET", "/meetings", A)
    item = next((x for x in lst if x["id"] == mid), None) if s == 200 else None
    check("Список собраний содержит новое, со счётчиками пунктов и решений",
          bool(item) and item["agenda_count"] == 2 and item["decisions_count"] == 1)
    s, one, _ = call("GET", "/meetings/%d" % mid, A)
    check("GET /meetings/{id} → 200", s == 200 and one["title"] == title)

    s, upd, _ = call("PATCH", f"/meetings/{mid}", A, body={"title": title + " (ред.)", "agenda": ["Один пункт"]})
    check("PATCH /meetings/{id} меняет название и заменяет повестку",
          s == 200 and upd["title"].endswith("(ред.)") and upd["agenda"] == ["Один пункт"]
          and upd["decisions"] == ["Запустить MVP"])
    check("Изменение видно в БД", db("select count(*) from agenda_items where meeting_id = :i", i=mid) == 1)
    s, _, _ = call("PATCH", f"/meetings/{mid}", A, body={"title": None})
    check("PATCH с null в обязательном поле → 422", s == 422)
    s, _, _ = call("POST", "/meetings", A, body={"title": "  ", "date": "2026-11-20"})
    check("Пустое название при создании → 422", s == 422)
    s, b, _ = call("GET", "/meetings/999999", A)
    check("Несуществующее собрание → 404 с понятным текстом", s == 404 and "999999" in b["detail"])

    # --- задачи
    s, t, _ = call("POST", "/tasks", A, body={
        "meeting_id": mid, "title": "Подготовить демо", "assignee": "Анна", "deadline": "2026-11-25"})
    check("POST /tasks → 201, статус по умолчанию «в работе»", s == 201 and t["status"] == "in_progress")
    tid = t["id"]
    check("Задача сохранена в PostgreSQL",
          db("select count(*) from tasks where id = :i and meeting_id = :m", i=tid, m=mid) == 1)
    s, t2, _ = call("PATCH", f"/tasks/{tid}", A, body={"status": "done", "title": "Подготовить демо (готово)"})
    check("PATCH /tasks/{id} меняет статус и название", s == 200 and t2["status"] == "done")
    check("Статус обновлён в БД", db("select status from tasks where id = :i", i=tid) == "done")
    s, flt, _ = call("GET", f"/tasks?status=done&meeting_id={mid}", A)
    check("Фильтр задач по статусу и собранию", s == 200 and [x["id"] for x in flt] == [tid])
    s, _, _ = call("POST", "/tasks", A, body={
        "meeting_id": 999999, "title": "Задача", "assignee": "Анна", "deadline": "2026-11-25"})
    check("Задача для несуществующего собрания → 404", s == 404)
    s, _, _ = call("POST", "/tasks", A, body={
        "meeting_id": mid, "title": "Задача", "assignee": "Анна", "deadline": "вчера"})
    check("Некорректная дата дедлайна → 422", s == 422)
    s, one, _ = call("GET", f"/meetings/{mid}", A)
    check("Задача видна в протоколе собрания", s == 200 and [x["id"] for x in one["tasks"]] == [tid])

    # --- права доступа: второй пользователь
    call("POST", "/auth/register", body={"email": EMAIL_B, "name": "Борис", "password": PASSWORD})
    s, tok_b, _ = login(EMAIL_B)
    B = tok_b["access_token"]
    s, lst_b, _ = call("GET", "/meetings", B)
    check("Другой пользователь не видит чужие собрания в списке", s == 200 and all(x["id"] != mid for x in lst_b))
    s, lst_bt, _ = call("GET", "/tasks", B)
    check("... и чужие задачи", s == 200 and all(x["id"] != tid for x in lst_bt))
    check("Чужое собрание: GET → 403", call("GET", f"/meetings/{mid}", B)[0] == 403)
    check("Чужое собрание: PATCH → 403", call("PATCH", f"/meetings/{mid}", B, body={"title": "Взлом"})[0] == 403)
    check("Чужое собрание: DELETE → 403", call("DELETE", f"/meetings/{mid}", B)[0] == 403)
    check("Чужая задача: PATCH → 403", call("PATCH", f"/tasks/{tid}", B, body={"status": "postponed"})[0] == 403)
    check("Чужая задача: DELETE → 403", call("DELETE", f"/tasks/{tid}", B)[0] == 403)
    s, _, _ = call("POST", "/tasks", B, body={
        "meeting_id": mid, "title": "Подброс", "assignee": "Б", "deadline": "2026-11-25"})
    check("Создать задачу в чужом собрании → 403", s == 403)
    check("Данные владельца не изменились",
          db("select title from meetings where id = :i", i=mid).endswith("(ред.)")
          and db("select status from tasks where id = :i", i=tid) == "done")

    # --- токены
    s, tok2, _ = call("POST", "/auth/refresh", body={"refresh_token": tok_a["refresh_token"]})
    check("POST /auth/refresh → новая пара токенов",
          s == 200 and tok2["refresh_token"] != tok_a["refresh_token"])
    s, b, _ = call("POST", "/auth/refresh", body={"refresh_token": tok_a["refresh_token"]})
    check("Использованный refresh token отозван → 401", s == 401 and "отозван" in b["detail"])
    s, _, _ = call("POST", "/auth/refresh", body={"refresh_token": "не-токен"})
    check("Неизвестный refresh token → 401", s == 401)
    s, _, _ = call("POST", "/auth/refresh", body={"refresh_token": tok2["access_token"]})
    check("Access token нельзя использовать как refresh → 401", s == 401)
    s, _, _ = call("GET", "/auth/me", tok_a["refresh_token"])
    check("Refresh token нельзя использовать как access → 401", s == 401)
    check("В БД хранятся только хеши refresh token",
          db("select count(*) from refresh_tokens where token_hash = :t", t=tok2["refresh_token"]) == 0)

    # --- удаление и каскад
    check("DELETE /tasks/{id} → 204", call("DELETE", f"/tasks/{tid}", A)[0] == 204)
    check("Удалённая задача → 404", call("GET", f"/tasks/{tid}", A)[0] == 404)
    s, t3, _ = call("POST", "/tasks", A, body={
        "meeting_id": mid, "title": "Для каскада", "assignee": "Анна", "deadline": "2026-11-26"})
    check("DELETE /meetings/{id} → 204", call("DELETE", f"/meetings/{mid}", A)[0] == 204)
    check("Каскад: повестка, решения и задачи удалены из БД",
          db("select count(*) from agenda_items where meeting_id = :i", i=mid) == 0
          and db("select count(*) from decisions where meeting_id = :i", i=mid) == 0
          and db("select count(*) from tasks where meeting_id = :i", i=mid) == 0)
    check("Удалённое собрание → 404", call("GET", f"/meetings/{mid}", A)[0] == 404)

    # --- выход
    s, _, _ = call("POST", "/auth/logout", body={"refresh_token": tok2["refresh_token"]})
    check("POST /auth/logout → 204", s == 204)
    s, _, _ = call("POST", "/auth/refresh", body={"refresh_token": tok2["refresh_token"]})
    check("После выхода refresh token не работает → 401", s == 401)
finally:
    # Чистим за собой: каскад удалит собрания и сессии тестовых пользователей
    try:
        with engine.begin() as c:
            c.execute(text("delete from users where email like 'lab5check-%'"))
        print("  Тестовые пользователи удалены из БД")
    except Exception as e:  # noqa: BLE001
        print(f"  Не удалось удалить тестовых пользователей: {e}")

sys.exit(1 if failures else 0)
PY
)
[ $? -eq 0 ] || fail "Сквозной сценарий API завершился с ошибками"
fi

# ---------- 6. Frontend ----------
if [ "$USE_FRONTEND" -eq 1 ]; then
  step "6. Frontend"
  NPM_MARK="node_modules/.package-lock.json"  # npm сам обновляет этот файл при каждой установке
  if [ "$FORCE_INSTALL" -eq 1 ] || [ ! -d node_modules ] || [ ! -f "$NPM_MARK" ] \
    || { [ -f package-lock.json ] && [ package-lock.json -nt "$NPM_MARK" ]; } || [ package.json -nt "$NPM_MARK" ]; then
    if [ -f package-lock.json ]; then npm_cmd=(npm ci --no-audit --no-fund); else npm_cmd=(npm install --no-audit --no-fund); fi
    warn "Установка зависимостей frontend (при первом запуске это долго, особенно на диске /mnt/c)"
    if "${npm_cmd[@]}" >"$LOG_DIR/npm-install.log" 2>&1; then ok "npm: зависимости установлены"; else tail -20 "$LOG_DIR/npm-install.log"; die "npm install завершился с ошибкой"; fi
  else
    ok "Зависимости frontend уже установлены (пропуск; --install — переустановить)"
  fi
  if [ "$QUICK" -eq 1 ]; then
    warn "--quick: npm test и сборка пропущены"
  else
    if npm test >"$LOG_DIR/npm-test.log" 2>&1; then ok "npm test: $(grep -E "^ +Tests " "$LOG_DIR/npm-test.log" | sed "s/^ *//")"; else tail -40 "$LOG_DIR/npm-test.log"; fail "npm test: есть упавшие тесты"; fi
    if npm run build >"$LOG_DIR/npm-build.log" 2>&1; then ok "npm run build: типы и сборка в порядке"; else tail -30 "$LOG_DIR/npm-build.log"; fail "npm run build завершился с ошибкой"; fi
  fi

  # Vite запускается напрямую, а не через npm: так PID указывает на сам сервер и его можно остановить через kill
  "$ROOT/node_modules/.bin/vite" --port "$FRONTEND_PORT" --strictPort >"$LOG_DIR/frontend.log" 2>&1 &
  FRONT_PID=$!
  if wait_http "$WEB/" 30; then
    ok "Dev-сервер frontend отвечает: $WEB"
    if curl -s "$WEB/" | grep -q 'id="root"'; then ok "Главная страница содержит точку входа приложения"; else fail "Главная страница frontend не похожа на приложение"; fi
    # Маршруты SPA отдаются тем же index.html (проверка fallback для /login и приватных адресов)
    for route in /login /register /tasks; do
      code="$(curl -s -o /dev/null -w '%{http_code}' "$WEB$route")"
      [ "$code" = "200" ] && ok "SPA-маршрут $route → 200" || fail "SPA-маршрут $route → $code"
    done
  else
    tail -20 "$LOG_DIR/frontend.log"; fail "Dev-сервер frontend не запустился"
  fi
else
  step "6. Frontend"
  warn "пропущено (--no-frontend)"
fi

# ---------- итог ----------
summary
if [ "$FAILS" -eq 0 ]; then
  if [ "$KEEP" -eq 1 ]; then
    echo
    echo "Приложение запущено для демонстрации:"
    echo "  frontend: $WEB"
    echo "  backend:  $API  (Swagger: $API/docs)"
    echo "Остановить: kill $BACKEND_PID${FRONT_PID:+ $FRONT_PID}"
  fi
  exit 0
fi
exit 1