from typing import Optional

from app.core.firebase import get_firestore_client
from app.schemas.room import RoomCreate, RoomPublic


class RoomRepository:
    def __init__(self):
        self._db = get_firestore_client()
        self._collection = self._db.collection("rooms")

    def get_by_id(self, room_id: str) -> Optional[RoomPublic]:
        doc = self._collection.document(room_id).get()
        if not doc.exists:
            return None
        return self._to_public(doc.id, doc.to_dict())

    def get_all(self, active_only: bool = False) -> list[RoomPublic]:
        query = (
            self._collection.where("is_active", "==", True)
            if active_only
            else self._collection
        )
        rooms = [self._to_public(doc.id, doc.to_dict()) for doc in query.stream()]
        return sorted(rooms, key=lambda room: room.name)

    def create(self, room: RoomCreate) -> RoomPublic:
        doc_ref = self._collection.document()
        payload = room.model_dump()
        doc_ref.set(payload)
        return RoomPublic(id=doc_ref.id, **payload)

    def update(self, room_id: str, updates: dict) -> None:
        if updates:
            self._collection.document(room_id).update(updates)

    def delete(self, room_id: str) -> None:
        self._collection.document(room_id).delete()

    @staticmethod
    def _to_public(room_id: str, data: dict) -> RoomPublic:
        return RoomPublic(id=room_id, **data)
