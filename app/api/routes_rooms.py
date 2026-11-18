from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import (
    get_current_active_user,
    get_current_admin,
    get_optional_current_user,
)
from app.schemas.room import (
    RoomAvailability,
    RoomCreate,
    RoomPublic,
    RoomUpdate,
)
from app.schemas.user import UserPublic
from app.services.reservation_service import ReservationService
from app.services.room_service import RoomService

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _ensure_can_see_inactive(
    include_inactive: bool, current_user: Optional[UserPublic]
) -> None:
    is_admin = current_user is not None and current_user.role == "admin"
    if include_inactive and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores",
        )


@router.get("", response_model=list[RoomPublic])
def list_rooms(
    include_inactive: bool = False,
    current_user: Optional[UserPublic] = Depends(get_optional_current_user),
):
    _ensure_can_see_inactive(include_inactive, current_user)
    service = RoomService()
    return service.get_all_rooms(include_inactive=include_inactive)


@router.get("/availability", response_model=list[RoomAvailability])
def get_room_availability(
    check_in: date,
    check_out: date,
    ignore_reservation_id: Optional[str] = None,
    current_user: UserPublic = Depends(get_current_active_user),
):
    service = ReservationService()
    return service.get_room_availability(
        check_in, check_out, current_user, ignore_reservation_id
    )


@router.get("/{room_id}", response_model=RoomPublic)
def get_room(
    room_id: str,
    current_user: Optional[UserPublic] = Depends(get_optional_current_user),
):
    room = RoomService().get_room_by_id(room_id)
    if not room.is_active and (current_user is None or current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quarto não encontrado"
        )
    return room


@router.post("", response_model=RoomPublic, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    _admin: UserPublic = Depends(get_current_admin),
):
    service = RoomService()
    return service.create_room(payload)


@router.put("/{room_id}", response_model=RoomPublic)
def update_room(
    room_id: str,
    payload: RoomUpdate,
    _admin: UserPublic = Depends(get_current_admin),
):
    service = RoomService()
    return service.update_room(room_id, payload)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: str,
    _admin: UserPublic = Depends(get_current_admin),
):
    service = RoomService()
    service.delete_room(room_id)
