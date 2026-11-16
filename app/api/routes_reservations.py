from typing import Optional

from fastapi import APIRouter, Depends, status

from app.dependencies import get_current_active_user
from app.schemas.reservation import (
    ReservationCreate,
    ReservationPublic,
    ReservationUpdate,
)
from app.schemas.user import UserPublic
from app.services.reservation_service import ReservationService

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.get("", response_model=list[ReservationPublic])
def list_reservations(
    room_id: Optional[str] = None,
    current_user: UserPublic = Depends(get_current_active_user),
):
    service = ReservationService()
    return service.get_all_reservations(current_user, room_id=room_id)


@router.get("/{reservation_id}", response_model=ReservationPublic)
def get_reservation(
    reservation_id: str,
    current_user: UserPublic = Depends(get_current_active_user),
):
    service = ReservationService()
    return service.get_reservation_by_id(reservation_id, current_user)


@router.post(
    "", response_model=ReservationPublic, status_code=status.HTTP_201_CREATED
)
def create_reservation(
    payload: ReservationCreate,
    current_user: UserPublic = Depends(get_current_active_user),
):
    service = ReservationService()
    return service.create_reservation(payload, current_user)


@router.put("/{reservation_id}/cancel", response_model=ReservationPublic)
def cancel_reservation(
    reservation_id: str,
    current_user: UserPublic = Depends(get_current_active_user),
):
    service = ReservationService()
    return service.cancel_reservation(reservation_id, current_user)


@router.put("/{reservation_id}", response_model=ReservationPublic)
def update_reservation(
    reservation_id: str,
    payload: ReservationUpdate,
    current_user: UserPublic = Depends(get_current_active_user),
):
    service = ReservationService()
    return service.update_reservation(reservation_id, payload, current_user)


@router.delete(
    "/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_reservation(
    reservation_id: str,
    current_user: UserPublic = Depends(get_current_active_user),
):
    service = ReservationService()
    service.delete_reservation(reservation_id, current_user)
