from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from . import models, schemas


# ---------- Пользователи и сессии ----------
def get_user(db: Session, user_id: int) -> models.User | None:
    return db.get(models.User, user_id)


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.scalars(select(models.User).where(models.User.email == email.lower())).first()


def create_user(db: Session, email: str, name: str, password_hash: str) -> models.User:
    user = models.User(email=email.lower(), name=name, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_refresh_token(
    db: Session, user_id: int, token_hash: str, expires_at: datetime
) -> models.RefreshToken:
    token = models.RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
    db.add(token)
    db.commit()
    return token


def get_refresh_token(db: Session, token_hash: str) -> models.RefreshToken | None:
    return db.scalars(
        select(models.RefreshToken).where(models.RefreshToken.token_hash == token_hash)
    ).first()


def revoke_refresh_token(db: Session, token: models.RefreshToken) -> None:
    if token.revoked_at is None:
        token.revoked_at = datetime.now(timezone.utc)
        db.commit()


def delete_expired_refresh_tokens(db: Session, user_id: int) -> None:
    """Чистит старые записи сессий пользователя, чтобы таблица не росла."""
    db.execute(
        delete(models.RefreshToken).where(
            models.RefreshToken.user_id == user_id,
            models.RefreshToken.expires_at < datetime.now(timezone.utc),
        )
    )
    db.commit()


# ---------- Собрания ----------
def _meeting_query():
    return select(models.Meeting).options(
        selectinload(models.Meeting.agenda_items),
        selectinload(models.Meeting.decisions),
        selectinload(models.Meeting.tasks),
    )


def list_meetings(
    db: Session, owner_id: int, skip: int = 0, limit: int = 100
) -> list[models.Meeting]:
    query = (
        select(models.Meeting)
        .options(
            selectinload(models.Meeting.agenda_items), selectinload(models.Meeting.decisions)
        )
        .where(models.Meeting.owner_id == owner_id)
        .order_by(models.Meeting.date.desc(), models.Meeting.id.desc())
    )
    return list(db.scalars(query.offset(skip).limit(limit)))


def get_meeting(db: Session, meeting_id: int) -> models.Meeting | None:
    return db.scalars(_meeting_query().where(models.Meeting.id == meeting_id)).first()


def create_meeting(db: Session, data: schemas.MeetingCreate, owner_id: int) -> models.Meeting:
    meeting = models.Meeting(
        **data.model_dump(exclude={"agenda", "decisions"}), owner_id=owner_id
    )
    meeting.agenda_items = [
        models.AgendaItem(position=i, text=text) for i, text in enumerate(data.agenda, start=1)
    ]
    meeting.decisions = [models.Decision(text=text) for text in data.decisions]
    db.add(meeting)
    db.commit()
    return get_meeting(db, meeting.id)


def update_meeting(
    db: Session, meeting: models.Meeting, data: schemas.MeetingUpdate
) -> models.Meeting:
    changes = data.model_dump(exclude_unset=True)
    agenda = changes.pop("agenda", None)
    decisions = changes.pop("decisions", None)

    for field, value in changes.items():
        setattr(meeting, field, value)
    if agenda is not None:
        meeting.agenda_items = [
            models.AgendaItem(position=i, text=text) for i, text in enumerate(agenda, start=1)
        ]
    if decisions is not None:
        meeting.decisions = [models.Decision(text=text) for text in decisions]

    db.commit()
    return get_meeting(db, meeting.id)


def delete_meeting(db: Session, meeting: models.Meeting) -> None:
    # Повестка, решения и задачи удаляются каскадом
    db.delete(meeting)
    db.commit()


# ---------- Задачи ----------
def list_tasks(
    db: Session,
    owner_id: int,
    meeting_id: int | None = None,
    status: schemas.TaskStatus | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[models.Task]:
    # Только задачи собраний, которыми владеет пользователь
    query = (
        select(models.Task)
        .join(models.Meeting, models.Task.meeting_id == models.Meeting.id)
        .where(models.Meeting.owner_id == owner_id)
        .order_by(models.Task.deadline, models.Task.id)
    )
    if meeting_id is not None:
        query = query.where(models.Task.meeting_id == meeting_id)
    if status is not None:
        query = query.where(models.Task.status == status.value)
    return list(db.scalars(query.offset(skip).limit(limit)))


def get_task(db: Session, task_id: int) -> models.Task | None:
    return db.get(models.Task, task_id)


def create_task(db: Session, data: schemas.TaskCreate) -> models.Task:
    task = models.Task(**data.model_dump(mode="python"))
    task.status = data.status.value
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: models.Task, data: schemas.TaskUpdate) -> models.Task:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value.value if field == "status" else value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: models.Task) -> None:
    db.delete(task)
    db.commit()
