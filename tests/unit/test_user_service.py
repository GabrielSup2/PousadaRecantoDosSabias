"""Testes unitários do UserService (app/services/user_service.py).

Verifica regras de negócio: mapeamento para UserPublic (que não expõe o
hash), atualização com hash de senha e erros de recurso inexistente.
"""
import pytest
from fastapi import HTTPException

from app.core.security import verify_password
from app.schemas.user import UserInDB, UserUpdate
from app.services.user_service import UserService


class FakeUserRepository:
    """Substituto do UserRepository para os testes unitários."""

    def __init__(self, users=None):
        self.users = users or {}
        self.updates = []
        self.deleted = []

    def get_all(self):
        return list(self.users.values())

    def get_by_id(self, user_id):
        return self.users.get(user_id)

    def update_user(self, user_id, updates):
        self.updates.append((user_id, updates))
        for key, value in updates.items():
            setattr(self.users[user_id], key, value)

    def delete_user(self, user_id):
        self.deleted.append(user_id)


def _user(user_id="u1", email="ana@test.com", role="user"):
    return UserInDB(id=user_id, email=email, full_name="Ana", role=role, password_hash="hash")


# ─── consultas ──────────────────────────────────────────────────────

def test_get_all_users_mapeia_para_userpublic():
    repo = FakeUserRepository(users={
        "u1": _user(),
        "u2": _user("u2", "bia@test.com"),
    })

    result = UserService(user_repo=repo).get_all_users()

    assert len(result) == 2
    assert {u.email for u in result} == {"ana@test.com", "bia@test.com"}
    assert all(not hasattr(u, "password_hash") for u in result)


def test_get_user_by_id():
    result = UserService(user_repo=FakeUserRepository(users={"u1": _user()})).get_user_by_id("u1")
    assert result.id == "u1"
    assert result.email == "ana@test.com"


def test_get_user_by_id_inexistente_retorna_404():
    with pytest.raises(HTTPException) as exc:
        UserService(user_repo=FakeUserRepository()).get_user_by_id("inexistente")
    assert exc.value.status_code == 404
    assert exc.value.detail == "Usuário não encontrado"


# ─── atualização ────────────────────────────────────────────────────

def test_update_user_com_sucesso():
    repo = FakeUserRepository(users={"u1": _user()})

    result = UserService(user_repo=repo).update_user("u1", UserUpdate(full_name="Ana Clara"))

    assert result.full_name == "Ana Clara"


def test_update_user_inexistente_retorna_404():
    with pytest.raises(HTTPException) as exc:
        UserService(user_repo=FakeUserRepository()).update_user("x", UserUpdate(full_name="X"))
    assert exc.value.status_code == 404


def test_update_user_hasheia_a_senha_antes_de_persistir():
    repo = FakeUserRepository(users={"u1": _user()})

    UserService(user_repo=repo).update_user("u1", UserUpdate(password="novaSenha123"))

    _, updates = repo.updates[-1]
    assert "password" not in updates  # senha em texto puro não chega ao banco
    assert updates["password_hash"] != "novaSenha123"
    assert verify_password("novaSenha123", updates["password_hash"])


def test_update_user_sem_campos_nao_altera_dados():
    """Com UserUpdate() vazio, o service repassa um dict vazio ao repositório
    (a proteção contra updates vazios fica na camada do repositório)."""
    repo = FakeUserRepository(users={"u1": _user()})

    UserService(user_repo=repo).update_user("u1", UserUpdate())

    assert repo.updates == [("u1", {})]
    assert repo.users["u1"].full_name == "Ana"


# ─── exclusão ───────────────────────────────────────────────────────

def test_delete_user_com_sucesso():
    repo = FakeUserRepository(users={"u1": _user()})

    UserService(user_repo=repo).delete_user("u1")

    assert repo.deleted == ["u1"]


def test_delete_user_inexistente_retorna_404():
    with pytest.raises(HTTPException) as exc:
        UserService(user_repo=FakeUserRepository()).delete_user("x")
    assert exc.value.status_code == 404
