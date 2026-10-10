# Протоколы собраний

## Назначение
Веб-приложение для ведения протоколов собраний: планирование повестки, фиксация задач и дедлайнов,
ИИ-суммаризация обсуждений и аудиозаписей с выделением решений.

## Пользовательские сценарии
1. Посмотреть список собраний и открыть протокол.
2. Создать собрание: указать название, дату, повестку, загрузить аудиозапись.
3. Прочитать ИИ-резюме и принятые решения по собранию.
4. Отследить задачи, ответственных и дедлайны.

## Экраны
| Экран | Маршрут |
|---|---|
| Список собраний | `/` |
| Протокол собрания (повестка, ИИ-резюме, решения, задачи) | `/meetings/:id` |
| Новое собрание | `/new` |
| Задачи и дедлайны | `/tasks` |

## Стек
React + TypeScript, Vite, React Router, библиотека UI-компонентов MUI (Material UI).
Frontend пока работает на демонстрационных данных (`src/data.ts`). Backend (FastAPI + PostgreSQL + SQLAlchemy) лежит в `backend/`, подключение к нему будет в следующей работе.

## Структура
```
backend/          # серверная часть (см. раздел «Backend»)
src/
  main.tsx        # точка входа, тема MUI, роутер
  App.tsx         # шапка и маршруты
  data.ts         # демо-данные
  pages/          # страницы
docs/screenshots/ # скриншоты экранов
```

## Запуск frontend
Нужен Node.js 18+.
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # проверка сборки
```

## Скриншоты
Лежат в `docs/screenshots/`: `meetings.png`, `meeting.png`, `new.png`, `tasks.png`.

### Список собраний
![Список собраний](docs/screenshots/meetings.png)

### Протокол собрания
![Протокол собрания](docs/screenshots/meeting.png)

### Новое собрание
![Новое собрание](docs/screenshots/new.png)

### Задачи и дедлайны
![Задачи и дедлайны](docs/screenshots/tasks.png)

## Изменения интерфейса
Пока нет.

---

# Backend (лабораторная работа №2)

## Стек
FastAPI, SQLAlchemy 2.0, PostgreSQL 16, Pydantic v2, pydantic-settings, Uvicorn.

## Структура
```
backend/
  app/
    main.py         # создание приложения, CORS, подключение роутеров, создание таблиц
    config.py       # настройки из окружения / .env (pydantic-settings)
    database.py     # engine, SessionLocal, Base, зависимость get_db
    models.py       # таблицы SQLAlchemy
    schemas.py      # схемы Pydantic (запросы и ответы)
    crud.py         # операции с БД
    routers/
      meetings.py   # /meetings
      tasks.py      # /tasks
  .env.example      # пример настроек без секретов
  requirements.txt
docker-compose.yml  # PostgreSQL для разработки
```

## Модель данных
Основная сущность — собрание (`meetings`). Повестка, решения и задачи относятся к одному собранию (связь «один ко многим»).

| Таблица | Поля |
|---|---|
| `meetings` | `id` (PK), `title`, `date`, `summary`, `audio_path` |
| `agenda_items` | `id` (PK), `meeting_id` (FK → meetings.id), `position`, `text` |
| `decisions` | `id` (PK), `meeting_id` (FK → meetings.id), `text` |
| `tasks` | `id` (PK), `meeting_id` (FK → meetings.id), `title`, `assignee`, `deadline`, `status` |

- Внешние ключи объявлены с `ON DELETE CASCADE`, а в SQLAlchemy у связей стоит `cascade="all, delete-orphan"`: при удалении собрания удаляются его повестка, решения и задачи.
- `tasks.status` принимает значения `in_progress` («В работе»), `done` («Готово»), `postponed` («Отложена»). В демо-данных frontend это булево поле `done`; при подключении frontend его нужно заменить на `status`.
- В API повестка и решения передаются обычными списками строк, их разбиение на строки таблиц делает backend.

## Настройка и запуск
Нужны Python 3.11+ и Docker (или установленный PostgreSQL).

```bash
# 1. Настройки окружения
cp backend/.env.example backend/.env      # при желании измените пароль

# 2. База данных (из корня репозитория)
docker compose up -d db

# 3. Зависимости и запуск
cd backend
python -m venv .venv
source .venv/bin/activate                 # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Таблицы создаются автоматически при старте приложения (`Base.metadata.create_all`). Без Docker создайте БД и пользователя в своём PostgreSQL и впишите их в `backend/.env`.

Документация и проверка вручную: http://localhost:8000/docs (Swagger UI).

## API
| Метод | Адрес | Описание | Успех |
|---|---|---|---|
| GET | `/meetings` | список собраний (`skip`, `limit`) | 200 |
| POST | `/meetings` | создать собрание с повесткой и решениями | 201 |
| GET | `/meetings/{id}` | собрание с повесткой, решениями и задачами | 200 |
| PATCH | `/meetings/{id}` | изменить поля; переданные `agenda`/`decisions` заменяют список целиком | 200 |
| DELETE | `/meetings/{id}` | удалить собрание вместе со связанными записями | 204 |
| GET | `/tasks` | список задач (фильтры `meeting_id`, `status`) | 200 |
| POST | `/tasks` | создать задачу (`meeting_id` в теле) | 201 |
| GET | `/tasks/{id}` | одна задача | 200 |
| PATCH | `/tasks/{id}` | изменить поля задачи | 200 |
| DELETE | `/tasks/{id}` | удалить задачу | 204 |
| GET | `/health` | проверка работы сервиса | 200 |

Ошибки: `404` с понятным текстом (`{"detail": "Собрание с id=9999 не найдено"}`), в том числе при создании задачи для несуществующего собрания; `422` при некорректных данных (пустое название, неверная дата или статус, нечисловой id).

## Проверка
Через Swagger (`/docs`) проверены: создание собрания с повесткой и решениями; создание задач; чтение списка и одного собрания; изменение собрания и задачи; фильтрация задач; ошибки 404 и 422; каскадное удаление (после `DELETE /meetings/{id}` в таблицах `agenda_items`, `decisions`, `tasks` не остаётся строк этого собрания).
