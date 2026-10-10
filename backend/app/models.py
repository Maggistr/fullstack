from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    date: Mapped[date] = mapped_column(Date)
    summary: Mapped[str] = mapped_column(Text, default="")
    audio_path: Mapped[str | None] = mapped_column(String(500), default=None)

    agenda_items: Mapped[list["AgendaItem"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="AgendaItem.position",
    )
    decisions: Mapped[list["Decision"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Decision.id"
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Task.id"
    )


class AgendaItem(Base):
    __tablename__ = "agenda_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    text: Mapped[str] = mapped_column(String(500))

    meeting: Mapped[Meeting] = relationship(back_populates="agenda_items")


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(String(500))

    meeting: Mapped[Meeting] = relationship(back_populates="decisions")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    assignee: Mapped[str] = mapped_column(String(100))
    deadline: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="in_progress")

    meeting: Mapped[Meeting] = relationship(back_populates="tasks")
