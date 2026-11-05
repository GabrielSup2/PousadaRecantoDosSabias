"""Testes de integração da API de autenticação (POST /auth/*).

Exercitam o caminho completo: rota FastAPI -> service -> repository ->
Firestore fake (em memória). O login real usa o fluxo OAuth2 form-encoded.
"""
from datetime import datetime, timedelta, timezone

from app.core.security import create_access_token


# ─── /auth/register ─────────────────────────────────────────────────

def test_register_cria_usuario_retorna_201(client):
    r = client.post("/auth/register", json={
        "email": "novo@test.com",
        "password": "senha123",
        "full_name": "Novo Usuário",
    })

    assert r.status_code == 201
    body = r.json()
    assert body["id"]
    assert body["email"] == "novo@test.com"
    assert body["role"] == "user"
    assert "password" not in body  # senha nunca retorna na resposta
    assert "password_hash" not in body


def test_register_email_duplicado_retorna_400(client, seed_user):
    seed_user("u1", "duplicado@test.com")

    r = client.post("/auth/register", json={
        "email": "duplicado@test.com",
        "password": "senha123",
    })

    assert r.status_code == 400
    assert r.json()["detail"] == "Email já cadastrado"


def test_register_email_invalido_retorna_422(client):
    r = client.post("/auth/register", json={
        "email": "nao-e-email",
        "password": "senha123",
    })
    assert r.status_code == 422


def test_register_senha_curta_retorna_422(client):
    r = client.post("/auth/register", json={
        "email": "curta@test.com",
        "password": "123",
    })
    assert r.status_code == 422


# ─── /auth/login ────────────────────────────────────────────────────

def test_login_com_sucesso_retorna_token(client, seed_user):
    seed_user("u1", "login@test.com")

    r = client.post("/auth/login", data={
        "username": "login@test.com",
        "password": "senha123",
    })

    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"


def test_login_senha_incorreta_retorna_401(client, seed_user):
    seed_user("u1", "login@test.com")

    r = client.post("/auth/login", data={
        "username": "login@test.com",
        "password": "senhaErrada",
    })

    assert r.status_code == 401


def test_login_email_inexistente_retorna_401(client):
    r = client.post("/auth/login", data={
        "username": "naoexiste@test.com",
        "password": "senha123",
    })
    assert r.status_code == 401


# ─── /auth/me ───────────────────────────────────────────────────────

def test_me_com_token_valido_retorna_usuario(client, seed_user):
    seed_user("u1", "me@test.com")

    r = client.get("/auth/me", headers={
        "Authorization": f"Bearer {create_access_token(subject='u1')}",
    })

    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "me@test.com"
    assert body["id"] == "u1"


def test_me_sem_token_retorna_401(client):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_me_com_token_invalido_retorna_401(client):
    r = client.get("/auth/me", headers={"Authorization": "Bearer token.invalido"})
    assert r.status_code == 401


def test_me_com_token_de_usuario_inexistente_retorna_401(client):
    token = create_access_token(subject="usuario-que-nao-existe")

    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 401


def test_token_expirado_retorna_401(client, seed_user):
    seed_user("u1", "expira@test.com")
    token = create_access_token(subject="u1", expires_minutes=-1)

    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 401
