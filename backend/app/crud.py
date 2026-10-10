from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from . import models, schemas


# ---------- Собрания ----------
def _meeting_query():
    return select(models.Meeting).options(
        selectinload(models.Meeting.agenda_items),
        selectinload(models.Meeting.decisions),
        selectinload(models.Meeting.tasks),
    )


def list_meetings(db: Session, skip: int = 0, limit: int = 100) -> list[models.Meeting]:
    query = select(models.Meeting).order_by(models.Meeting.date.desc(), models.Meeting.id.desc())
    return list(db.scalars(query.offset(skip).limit(limit)))


def get_meeting(db: Session, meeting_id: int) -> models.Meeting | None:
    return db.scalars(_meeting_query().where(models.Meeting.id == meeting_id)).first()


def create_meeting(db: Session, data: schemas.MeetingCreate) -> models.Meeting:
    meeting = models.Meeting(**data.model_dump(exclude={"agenda", "decisions"}))
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
