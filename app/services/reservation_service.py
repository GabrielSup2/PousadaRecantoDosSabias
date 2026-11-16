from datetime import date
from typing import Optional

from fastapi import HTTPException, status

from app.repositories.reservation_repository import ReservationRepository
from app.repositories.room_repository import RoomRepository
from app.schemas.reservation import (
    ReservationCreate,
    ReservationPublic,
    ReservationUpdate,
)
from app.schemas.room import RoomPublic
from app.schemas.user import UserPublic

REQUIRED_UPDATE_FIELDS = (
    "room_id",
    "guest_name",
    "guests",
    "check_in",
    "check_out",
    "status",
)


class ReservationService:
    def __init__(
        self,
        reservation_repo: ReservationRepository | None = None,
        room_repo: RoomRepository | None = None,
    ):
        self.reservation_repo = reservation_repo or ReservationRepository()
        self.room_repo = room_repo or RoomRepository()

    def get_all_reservations(
        self, current_user: UserPublic, room_id: Optional[str] = None
    ) -> list[ReservationPublic]:
        user_id = None if current_user.role == "admin" else current_user.id
        return self.reservation_repo.get_all(room_id=room_id, user_id=user_id)

    def get_reservation_by_id(
        self, reservation_id: str, current_user: UserPublic
    ) -> ReservationPublic:
        reservation = self.reservation_repo.get_by_id(reservation_id)
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva não encontrada",
            )
        self._ensure_can_manage(reservation, current_user)
        return reservation

    def create_reservation(
        self, payload: ReservationCreate, current_user: UserPublic
    ) -> ReservationPublic:
        room = self._get_room(payload.room_id)
        self._ensure_room_available(room)
        self._ensure_capacity(room, payload.guests)
        self._ensure_no_overlap(payload.room_id, payload.check_in, payload.check_out)

        total_price = self._calculate_total(room, payload.check_in, payload.check_out)
        return self.reservation_repo.create(
            payload, user_id=current_user.id, total_price=total_price
        )

    def update_reservation(
        self,
        reservation_id: str,
        payload: ReservationUpdate,
        current_user: UserPublic,
    ) -> ReservationPublic:
        current = self.get_reservation_by_id(reservation_id, current_user)

        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Informe ao menos um campo para atualizar",
            )
        self._ensure_required_fields_not_null(updates)

        room_id = updates.get("room_id", current.room_id)
        room = self._get_room(room_id)
        if room_id != current.room_id:
            self._ensure_room_available(room)

        check_in = updates.get("check_in", current.check_in)
        check_out = updates.get("check_out", current.check_out)
        if check_out <= check_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A data de saída deve ser posterior à data de entrada",
            )

        guests = updates.get("guests", current.guests)
        self._ensure_capacity(room, guests)

        period_changed = any(
            field in updates for field in ("room_id", "check_in", "check_out")
        )
        if period_changed:
            self._ensure_no_overlap(
                room_id, check_in, check_out, ignore_id=reservation_id
            )
            updates["total_price"] = self._calculate_total(
                room, check_in, check_out
            )

        self.reservation_repo.update(reservation_id, updates)
        return self.get_reservation_by_id(reservation_id, current_user)

    def cancel_reservation(
        self, reservation_id: str, current_user: UserPublic
    ) -> ReservationPublic:
        reservation = self.get_reservation_by_id(reservation_id, current_user)
        if reservation.status == "cancelled":
            return reservation

        self.reservation_repo.update(reservation_id, {"status": "cancelled"})
        return self.get_reservation_by_id(reservation_id, current_user)

    def delete_reservation(
        self, reservation_id: str, current_user: UserPublic
    ) -> None:
        self.get_reservation_by_id(reservation_id, current_user)
        self.reservation_repo.delete(reservation_id)

    def _get_room(self, room_id: str) -> RoomPublic:
        room = self.room_repo.get_by_id(room_id)
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quarto não encontrado",
            )
        return room

    def _ensure_room_available(self, room: RoomPublic) -> None:
        if not room.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este quarto não está disponível para reservas",
            )

    def _ensure_capacity(self, room: RoomPublic, guests: int) -> None:
        if guests > room.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "O número de hóspedes excede a capacidade do quarto "
                    f"({room.capacity})"
                ),
            )

    def _ensure_no_overlap(
        self,
        room_id: str,
        check_in: date,
        check_out: date,
        ignore_id: Optional[str] = None,
    ) -> None:
        for reservation in self.reservation_repo.get_all(room_id=room_id):
            if ignore_id and reservation.id == ignore_id:
                continue
            if reservation.status == "cancelled":
                continue
            if check_in < reservation.check_out and check_out > reservation.check_in:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Já existe uma reserva para este quarto "
                        "no período informado"
                    ),
                )

    def _ensure_required_fields_not_null(self, updates: dict) -> None:
        if any(
            field in updates and updates[field] is None
            for field in REQUIRED_UPDATE_FIELDS
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campos obrigatórios não podem ser nulos",
            )

    def _ensure_can_manage(
        self, reservation: ReservationPublic, current_user: UserPublic
    ) -> None:
        if (
            current_user.role != "admin"
            and reservation.user_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para alterar esta reserva",
            )

    @staticmethod
    def _calculate_total(
        room: RoomPublic, check_in: date, check_out: date
    ) -> float:
        nights = (check_out - check_in).days
        return round(nights * room.daily_rate, 2)
