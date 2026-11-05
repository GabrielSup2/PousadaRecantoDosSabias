from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


Role = Literal["user", "admin"]
BCRYPT_MAX_PASSWORD_BYTES = 72


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password_size(cls, value: str) -> str:
        if len(value.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError("A senha não pode ter mais de 72 bytes.")
        return value


class UserInDB(UserBase):
    id: str
    role: Role = "user"
    password_hash: str


class UserPublic(UserBase):
    id: str
    role: Role = "user"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password_size(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and len(value.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError("A senha não pode ter mais de 72 bytes.")
        return value

