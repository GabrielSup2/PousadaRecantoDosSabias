from typing import Optional

from pydantic import BaseModel, Field, field_validator

ROOM_NAME_MAX_LENGTH = 80
ROOM_DESCRIPTION_MAX_LENGTH = 500
ROOM_MAX_CAPACITY = 20


def _clean_name(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("O nome do quarto é obrigatório.")
    return value


def _clean_description(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value or None


class RoomBase(BaseModel):
    name: str = Field(
        max_length=ROOM_NAME_MAX_LENGTH,
        description="Identificação do quarto, como 'Quarto 101'",
    )
    description: Optional[str] = Field(
        default=None, max_length=ROOM_DESCRIPTION_MAX_LENGTH
    )
    capacity: int = Field(ge=1, le=ROOM_MAX_CAPACITY)
    daily_rate: float = Field(gt=0, description="Valor da diária em reais")
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _clean_name(value)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: Optional[str]) -> Optional[str]:
        return _clean_description(value)

    @field_validator("daily_rate")
    @classmethod
    def round_daily_rate(cls, value: float) -> float:
        return round(value, 2)


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=ROOM_NAME_MAX_LENGTH)
    description: Optional[str] = Field(
        default=None, max_length=ROOM_DESCRIPTION_MAX_LENGTH
    )
    capacity: Optional[int] = Field(default=None, ge=1, le=ROOM_MAX_CAPACITY)
    daily_rate: Optional[float] = Field(default=None, gt=0)
    is_active: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        return _clean_name(value) if value is not None else None

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: Optional[str]) -> Optional[str]:
        return _clean_description(value)

    @field_validator("daily_rate")
    @classmethod
    def round_daily_rate(cls, value: Optional[float]) -> Optional[float]:
        return round(value, 2) if value is not None else None


class RoomPublic(RoomBase):
    id: str
