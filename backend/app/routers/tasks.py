from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..dependencies import get_current_user

# Все маршруты задач приватные; доступ к задаче определяется владельцем её собрания
router = APIRouter(prefix="/tasks", tags=["tasks"])


def _check_meeting(db: Session, meeting_id: int, user: models.User) -> None:
    meeting = crud.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Собрание с id={meeting_id} не найдено")
    if meeting.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Нет доступа к этому собранию")


def _get_own_or_error(db: Session, task_id: int, user: models.User) -> models.Task:
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Задача с id={task_id} не найдена")
    if task.meeting.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Нет доступа к этой задаче")
    return task


@router.get("", response_model=list[schemas.TaskOut])
def list_tasks(
    meeting_id: int | None = None,
    status_: schemas.TaskStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.list_tasks(db, user.id, meeting_id, status_, skip, limit)


@router.post("", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    data: schemas.TaskCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_meeting(db, data.meeting_id, user)
    return crud.create_task(db, data)


@router.get("/{task_id}", response_model=schemas.TaskOut)
def read_task(
    task_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return _get_own_or_error(db, task_id, user)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    data: schemas.TaskUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.update_task(db, _get_own_or_error(db, task_id, user), data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    crud.delete_task(db, _get_own_or_error(db, task_id, user))
