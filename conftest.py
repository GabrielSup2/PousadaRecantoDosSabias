"""
Configuração global dos testes (conftest raiz).

Define as variáveis de ambiente ANTES de qualquer import do app — o app exige
JWT_SECRET e FIREBASE_PROJECT_ID na inicialização (app/config.py) — e
substitui o cliente Firestore real pelo emulador em memória
(tests/fakes/fake_firestore.py), permitindo rodar a suíte sem credenciais
reais de nuvem.
"""
import os

os.environ.setdefault("JWT_SECRET", "chave-de-teste-nao-usar-em-producao")
os.environ.setdefault("FIREBASE_PROJECT_ID", "pousada-recanto-dos-sabios-teste")
os.environ.setdefault("FIREBASE_CREDENTIALS_JSON_PATH", "/tmp/nao-existe.json")

from functools import lru_cache

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.main import app
from tests.fakes.fake_firestore import FakeFirestore


@pytest.fixture()
def fake_db():
    """Banco Firestore falso (em memória), novo a cada teste."""
    return FakeFirestore()


@pytest.fixture(autouse=True)
def _patch_firestore(monkeypatch, fake_db):
    """Substitui o cliente Firestore real pelo emulador em todos os repositórios."""
    from app.core import firebase as firebase_module
    from app.repositories import user_repository

    monkeypatch.setattr(firebase_module, "get_firestore_client", lambda: fake_db)
    monkeypatch.setattr(user_repository, "get_firestore_client", lambda: fake_db)


@pytest.fixture()
def client():
    """Cliente HTTP de teste da aplicação FastAPI (testa rotas reais)."""
    return TestClient(app)


@lru_cache
def _hash_senha_teste() -> str:
    """Hash bcrypt da senha padrão dos testes, calculado uma única vez."""
    return hash_password("senha123")


@pytest.fixture()
def seed_user(fake_db):
    """Cria um usuário diretamente no banco falso e devolve o seu id."""
    def _seed(user_id, email, role="user", password="senha123"):
        senha_hash = _hash_senha_teste() if password == "senha123" else hash_password(password)
        fake_db.seed("users", user_id, {
            "email": email,
            "full_name": f"Nome {user_id}",
            "role": role,
            "password_hash": senha_hash,
        })
        return user_id
    return _seed


@pytest.fixture()
def auth_headers():
    """Headers de autenticação com token JWT válido para o usuário informado."""
    def _headers(user_id: str) -> dict:
        return {"Authorization": f"Bearer {create_access_token(subject=user_id)}"}
    return _headers
