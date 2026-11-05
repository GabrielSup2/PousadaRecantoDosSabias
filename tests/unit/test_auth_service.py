"""Testes unitários do AuthService (app/services/auth_service.py).

Usa um repositório fake injetado (o service aceita injeção no __init__),
sem nenhum banco de dados.
"""
import pytest
from fastapi import HTTPException

from app.core.security import hash_password
from app.schemas.user import UserCreate, UserInDB
from app.services.auth_service import AuthService


class FakeUserRepository:
    """Substituto do UserRepository para os testes unitários."""

    def __init__(self, users=None):
        self.users = users or {}
        self.create_calls = []

    def get_by_email(self, email):
        for user in self.users.values():
            if user.email == email:
                return user
        return None

    def create_user(self, user):
        self.create_calls.append(user)
        created = UserInDB(
            id="user-novo",
            email=user.email,
            full_name=user.full_name,
            role="user",
            password_hash="hash-simulado",
        )
        self.users["user-novo"] = created
        return created


# ─── register ───────────────────────────────────────────────────────

def test_register_user_com_sucesso():
    repo = FakeUserRepository()
    result = AuthService(user_repo=repo).register_user(
        UserCreate(email="ana@test.com", password="senha123", full_name="Ana")
    )

    assert result.id == "user-novo"
    assert result.email == "ana@test.com"
    assert result.full_name == "Ana"
    assert result.role == "user"


def test_register_user_email_duplicado_retorna_400():
    existente = UserInDB(
        id="u1", email="ana@test.com", full_name="Ana", role="user", password_hash="x"
    )
    repo = FakeUserRepository(users={"u1": existente})

    with pytest.raises(HTTPException) as exc:
        AuthService(user_repo=repo).register_user(
            UserCreate(email="ana@test.com", password="senha123")
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Email já cadastrado"


# ─── login ──────────────────────────────────────────────────────────

def test_login_com_sucesso_retorna_token():
    repo = FakeUserRepository(users={
        "u1": UserInDB(
            id="u1", email="ana@test.com", full_name="Ana", role="user",
            password_hash=hash_password("senha123"),
        ),
    })

    result = AuthService(user_repo=repo).login("ana@test.com", "senha123")

    assert result.access_token
    assert result.token_type == "bearer"


def test_login_retorna_token_com_payload_contratual():
    from datetime import datetime, timezone
    from jose import jwt
    from app.config import get_settings

    repo = FakeUserRepository(users={
        "u1": UserInDB(
            id="u1", email="ana@test.com", full_name="Ana", role="user",
            password_hash=hash_password("senha123"),
        ),
    })

    result = AuthService(user_repo=repo).login("ana@test.com", "senha123")
    payload = jwt.decode(
        result.access_token,
        get_settings().jwt_secret,
        algorithms=[get_settings().jwt_algorithm],
    )
    # Contrato: identificação + expiração
    assert payload["sub"] == "u1"
    assert payload["exp"] > datetime.now(timezone.utc).timestamp()
    # Por design, papel e e-mail não vão no token
    assert "role" not in payload
    assert "email" not in payload


def test_login_senha_incorreta_retorna_401():
    repo = FakeUserRepository(users={
        "u1": UserInDB(
            id="u1", email="ana@test.com", full_name="Ana", role="user",
            password_hash=hash_password("senha123"),
        ),
    })

    with pytest.raises(HTTPException) as exc:
        AuthService(user_repo=repo).login("ana@test.com", "senhaErrada")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Credenciais inválidas"


def test_login_email_inexistente_retorna_401():
    repo = FakeUserRepository(users={})

    with pytest.raises(HTTPException) as exc:
        AuthService(user_repo=repo).login("naoexiste@test.com", "senha123")

    assert exc.value.status_code == 401


def test_email_case_insensitive_deve_impedir_duplicidade():
    repo = FakeUserRepository()
    service = AuthService(user_repo=repo)
    
    service.register_user(UserCreate(email="ana@teste.com", password="senha123"))
    
    with pytest.raises(HTTPException):
        service.register_user(UserCreate(email="Ana@Teste.com", password="outrasenha"))
 
