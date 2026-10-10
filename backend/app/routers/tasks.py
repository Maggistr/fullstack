from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _get_or_404(db: Session, task_id: int):
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Задача с id={task_id} не найдена")
    return task


def _check_meeting(db: Session, meeting_id: int) -> None:
    if crud.get_meeting(db, meeting_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Собрание с id={meeting_id} не найдено")


@router.get("", response_model=list[schemas.TaskOut])
def list_tasks(
    meeting_id: int | None = None,
    status_: schemas.TaskStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return crud.list_tasks(db, meeting_id, status_, skip, limit)


@router.post("", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(data: schemas.TaskCreate, db: Session = Depends(get_db)):
    _check_meeting(db, data.meeting_id)
    return crud.create_task(db, data)


@router.get("/{task_id}", response_model=schemas.TaskOut)
def read_task(task_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, task_id)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, data: schemas.TaskUpdate, db: Session = Depends(get_db)):
    return crud.update_task(db, _get_or_404(db, task_id), data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    crud.delete_task(db, _get_or_404(db, task_id))
