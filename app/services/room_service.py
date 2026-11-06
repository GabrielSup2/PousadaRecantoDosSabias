from fastapi import HTTPException, status

from app.repositories.room_repository import RoomRepository
from app.schemas.room import RoomCreate, RoomPublic, RoomUpdate

REQUIRED_ROOM_FIELDS = ("name", "capacity", "daily_rate", "is_active")


class RoomService:
    def __init__(self, room_repo: RoomRepository | None = None):
        self.room_repo = room_repo or RoomRepository()

    def get_all_rooms(self, include_inactive: bool = False) -> list[RoomPublic]:
        return self.room_repo.get_all(active_only=not include_inactive)

    def get_room_by_id(self, room_id: str) -> RoomPublic:
        room = self.room_repo.get_by_id(room_id)
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Quarto não encontrado"
            )
        return room

    def create_room(self, payload: RoomCreate) -> RoomPublic:
        return self.room_repo.create(payload)

    def update_room(self, room_id: str, payload: RoomUpdate) -> RoomPublic:
        self.get_room_by_id(room_id)

        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Informe ao menos um campo para atualizar",
            )
        if any(
            field in updates and updates[field] is None
            for field in REQUIRED_ROOM_FIELDS
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome, capacidade, diária e status não podem ser nulos",
            )

        self.room_repo.update(room_id, updates)
        return self.get_room_by_id(room_id)

    def delete_room(self, room_id: str) -> None:
        self.get_room_by_id(room_id)
        self.room_repo.delete(room_id)
