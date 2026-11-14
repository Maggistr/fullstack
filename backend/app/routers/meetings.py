from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..dependencies import get_current_user

# Все маршруты собраний приватные: нужен access token
router = APIRouter(prefix="/meetings", tags=["meetings"])


def _get_own_or_error(db: Session, meeting_id: int, user: models.User) -> models.Meeting:
    """404 — собрания нет, 403 — оно есть, но принадлежит другому пользователю."""
    meeting = crud.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Собрание с id={meeting_id} не найдено")
    if meeting.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Нет доступа к этому собранию")
    return meeting


@router.get("", response_model=list[schemas.MeetingShort])
def list_meetings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.list_meetings(db, user.id, skip, limit)


@router.post("", response_model=schemas.MeetingOut, status_code=status.HTTP_201_CREATED)
def create_meeting(
    data: schemas.MeetingCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.create_meeting(db, data, owner_id=user.id)


@router.get("/{meeting_id}", response_model=schemas.MeetingOut)
def read_meeting(
    meeting_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return _get_own_or_error(db, meeting_id, user)


@router.patch("/{meeting_id}", response_model=schemas.MeetingOut)
def update_meeting(
    meeting_id: int,
    data: schemas.MeetingUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = _get_own_or_error(db, meeting_id, user)
    return crud.update_meeting(db, meeting, data)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    meeting_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    crud.delete_meeting(db, _get_own_or_error(db, meeting_id, user))
