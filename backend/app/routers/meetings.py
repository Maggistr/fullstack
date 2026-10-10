from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _get_or_404(db: Session, meeting_id: int):
    meeting = crud.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Собрание с id={meeting_id} не найдено")
    return meeting


@router.get("", response_model=list[schemas.MeetingShort])
def list_meetings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return crud.list_meetings(db, skip, limit)


@router.post("", response_model=schemas.MeetingOut, status_code=status.HTTP_201_CREATED)
def create_meeting(data: schemas.MeetingCreate, db: Session = Depends(get_db)):
    return crud.create_meeting(db, data)


@router.get("/{meeting_id}", response_model=schemas.MeetingOut)
def read_meeting(meeting_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, meeting_id)


@router.patch("/{meeting_id}", response_model=schemas.MeetingOut)
def update_meeting(meeting_id: int, data: schemas.MeetingUpdate, db: Session = Depends(get_db)):
    meeting = _get_or_404(db, meeting_id)
    return crud.update_meeting(db, meeting, data)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    crud.delete_meeting(db, _get_or_404(db, meeting_id))
