from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.dependencies import get_current_active_user
from app.schemas.auth import TokenResponse
from app.schemas.user import UserCreate, UserPublic
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED
)
def register_user(
    payload: UserCreate,
):
    service = AuthService()
    return service.register_user(payload)


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    service = AuthService()
    return service.login(form_data.username, form_data.password)


@router.get("/me", response_model=UserPublic)
def me(current_user: UserPublic = Depends(get_current_active_user)):
    return current_user

