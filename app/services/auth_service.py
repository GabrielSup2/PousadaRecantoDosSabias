from fastapi import HTTPException, status

from app.core.security import create_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse
from app.schemas.user import UserCreate, UserPublic


class AuthService:
    def __init__(self, user_repo: UserRepository | None = None):
        self.user_repo = user_repo or UserRepository()

    def register_user(self, user: UserCreate) -> UserPublic:
        normalized_email = user.email.strip().lower()
        existing = self.user_repo.get_by_email(normalized_email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado",
            )
        user_data = user.model_copy(update={"email": normalized_email})
        created = self.user_repo.create_user(user_data)
        return UserPublic(
            id=created.id,
            email=created.email,
            full_name=created.full_name,
            role=created.role,
        )

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.user_repo.get_by_email(email.strip().lower())
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas",
            )
        token = create_access_token(subject=user.id)
        return TokenResponse(access_token=token)

