from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

ReservationStatus = Literal["confirmed", "cancelled"]

GUEST_NAME_MAX_LENGTH = 120
GUEST_PHONE_MAX_LENGTH = 20
MAX_GUESTS = 20


def _clean_text(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Este campo é obrigatório.")
    return value


def _clean_phone(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    digits = "".join(char for char in value if char.isdigit())
    if not digits:
        return None
    if len(digits) not in (10, 11):
        raise ValueError("O telefone deve ter 10 ou 11 dígitos.")
    return digits


class ReservationBase(BaseModel):
    room_id: str = Field(min_length=1)
    guest_name: str = Field(max_length=GUEST_NAME_MAX_LENGTH)
    guest_phone: Optional[str] = Field(
        default=None, max_length=GUEST_PHONE_MAX_LENGTH
    )
    guests: int = Field(ge=1, le=MAX_GUESTS)
    check_in: date
    check_out: date
    status: ReservationStatus = "confirmed"

    @field_validator("room_id")
    @classmethod
    def validate_room_id(cls, value: str) -> str:
        return _clean_text(value)

    @field_validator("guest_name")
    @classmethod
    def validate_guest_name(cls, value: str) -> str:
        return _clean_text(value)

    @field_validator("guest_phone")
    @classmethod
    def validate_guest_phone(cls, value: Optional[str]) -> Optional[str]:
        return _clean_phone(value)

    @model_validator(mode="after")
    def validate_period(self):
        if self.check_out <= self.check_in:
            raise ValueError(
                "A data de saída deve ser posterior à data de entrada."
            )
        return self


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    room_id: Optional[str] = Field(default=None, min_length=1)
    guest_name: Optional[str] = Field(
        default=None, max_length=GUEST_NAME_MAX_LENGTH
    )
    guest_phone: Optional[str] = Field(
        default=None, max_length=GUEST_PHONE_MAX_LENGTH
    )
    guests: Optional[int] = Field(default=None, ge=1, le=MAX_GUESTS)
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    status: Optional[ReservationStatus] = None

    @field_validator("room_id")
    @classmethod
    def validate_room_id(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value) if value is not None else None

    @field_validator("guest_name")
    @classmethod
    def validate_guest_name(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value) if value is not None else None

    @field_validator("guest_phone")
    @classmethod
    def validate_guest_phone(cls, value: Optional[str]) -> Optional[str]:
        return _clean_phone(value)

    @model_validator(mode="after")
    def validate_period(self):
        if (
            self.check_in is not None
            and self.check_out is not None
            and self.check_out <= self.check_in
        ):
            raise ValueError(
                "A data de saída deve ser posterior à data de entrada."
            )
        return self


class ReservationPublic(ReservationBase):
    id: str
    total_price: float
    user_id: str
