from typing import Optional

from app.core.firebase import get_firestore_client
from app.schemas.reservation import ReservationCreate, ReservationPublic


class ReservationRepository:
    def __init__(self):
        self._db = get_firestore_client()
        self._collection = self._db.collection("reservations")

    def get_by_id(self, reservation_id: str) -> Optional[ReservationPublic]:
        doc = self._collection.document(reservation_id).get()
        if not doc.exists:
            return None
        return self._to_public(doc.id, doc.to_dict())

    def get_all(
        self,
        room_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> list[ReservationPublic]:
        if room_id:
            query = self._collection.where("room_id", "==", room_id)
        elif user_id:
            query = self._collection.where("user_id", "==", user_id)
        else:
            query = self._collection

        reservations = [
            self._to_public(doc.id, doc.to_dict()) for doc in query.stream()
        ]
        if room_id and user_id:
            reservations = [
                reservation
                for reservation in reservations
                if reservation.user_id == user_id
            ]
        return sorted(reservations, key=lambda reservation: reservation.check_in)

    def create(
        self,
        payload: ReservationCreate,
        user_id: str,
        total_price: float,
    ) -> ReservationPublic:
        doc_ref = self._collection.document()
        data = self._to_storage(payload.model_dump())
        data["user_id"] = user_id
        data["total_price"] = total_price
        doc_ref.set(data)
        return self._to_public(doc_ref.id, data)

    def update(self, reservation_id: str, updates: dict) -> None:
        normalized = self._to_storage(updates)
        if normalized:
            self._collection.document(reservation_id).update(normalized)

    def delete(self, reservation_id: str) -> None:
        self._collection.document(reservation_id).delete()

    @staticmethod
    def _to_storage(data: dict) -> dict:
        normalized = dict(data)
        for field in ("check_in", "check_out"):
            value = normalized.get(field)
            if value is not None and hasattr(value, "isoformat"):
                normalized[field] = value.isoformat()
        return normalized

    @staticmethod
    def _to_public(reservation_id: str, data: dict) -> ReservationPublic:
        return ReservationPublic(id=reservation_id, **data)
