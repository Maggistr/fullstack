import datetime as dt
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

# Строка без пробелов по краям, длиной от 1 символа
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class TaskStatus(str, Enum):
    in_progress = "in_progress"  # «В работе»
    done = "done"  # «Готово»
    postponed = "postponed"  # «Отложена»


# ---------- Задачи ----------
class TaskBase(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
    assignee: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    deadline: dt.date
    status: TaskStatus = TaskStatus.in_progress


class TaskCreate(TaskBase):
    meeting_id: int


class TaskUpdate(BaseModel):
    """Частичное обновление: передаются только изменяемые поля."""

    title: Annotated[
        str | None, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)
    ] = None
    assignee: Annotated[
        str | None, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
    ] = None
    deadline: dt.date | None = None
    status: TaskStatus | None = None


class TaskOut(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int


# ---------- Собрания ----------
class MeetingBase(BaseModel):
    title: Title
    date: dt.date
    summary: str = ""
    audio_path: str | None = Field(default=None, max_length=500)


class MeetingCreate(MeetingBase):
    agenda: list[Text] = []
    decisions: list[Text] = []


class MeetingUpdate(BaseModel):
    """Частичное обновление. Если передан agenda/decisions, список заменяется целиком."""

    title: Title | None = None
    date: dt.date | None = None
    summary: str | None = None
    audio_path: str | None = Field(default=None, max_length=500)
    agenda: list[Text] | None = None
    decisions: list[Text] | None = None


class MeetingOut(MeetingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # В БД это отдельные таблицы, а наружу отдаём простые списки строк,
    # как в демо-данных frontend (data.ts)
    agenda: list[str] = Field(default=[], validation_alias="agenda_items")
    decisions: list[str] = []
    tasks: list[TaskOut] = []

    @field_validator("agenda", "decisions", mode="before")
    @classmethod
    def rows_to_text(cls, value):
        return [getattr(item, "text", item) for item in value]


class MeetingShort(BaseModel):
    """Краткая запись для списка собраний."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    date: dt.date
    audio_path: str | None = None
