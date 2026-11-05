"""Testes de integração da API de usuários (/users).

Foco em autorização por papel (user vs admin) e no isolamento de dados:
o usuário comum só acessa o próprio perfil; o admin acessa todos.
"""
from app.core.security import create_access_token


# ─── GET /users ─────────────────────────────────────────────────────

def test_get_users_sem_token_retorna_401(client):
    assert client.get("/users").status_code == 401


def test_get_users_como_usuario_comum_retorna_403(client, seed_user, auth_headers):
    seed_user("u1", "comum@test.com")

    r = client.get("/users", headers=auth_headers("u1"))

    assert r.status_code == 403


def test_get_users_como_admin_retorna_todos(client, seed_user, auth_headers):
    seed_user("u-admin", "admin@test.com", role="admin")
    seed_user("u1", "ana@test.com")
    seed_user("u2", "bia@test.com")

    r = client.get("/users", headers=auth_headers("u-admin"))

    assert r.status_code == 200
    assert len(r.json()) == 3


# ─── GET /users/{id} ────────────────────────────────────────────────

def test_get_user_proprio_perfil(client, seed_user, auth_headers):
    seed_user("u1", "ana@test.com")

    r = client.get("/users/u1", headers=auth_headers("u1"))

    assert r.status_code == 200
    assert r.json()["email"] == "ana@test.com"


def test_get_user_de_outro_usuario_comum_retorna_403(client, seed_user, auth_headers):
    seed_user("u1", "ana@test.com")
    seed_user("u2", "bia@test.com")

    r = client.get("/users/u2", headers=auth_headers("u1"))

    assert r.status_code == 403


def test_get_user_como_admin_pode_ver_qualquer_um(client, seed_user, auth_headers):
    seed_user("u-admin", "admin@test.com", role="admin")
    seed_user("u2", "bia@test.com")

    r = client.get("/users/u2", headers=auth_headers("u-admin"))

    assert r.status_code == 200
    assert r.json()["id"] == "u2"


def test_get_user_inexistente_como_comum_retorna_403(client, seed_user, auth_headers):
    """O check de autorização vem ANTES da busca: outro id inexistente = 403."""
    seed_user("u1", "ana@test.com")

    r = client.get("/users/nao-existe", headers=auth_headers("u1"))

    assert r.status_code == 403


def test_get_user_inexistente_como_admin_retorna_404(client, seed_user, auth_headers):
    seed_user("u-admin", "admin@test.com", role="admin")

    r = client.get("/users/nao-existe", headers=auth_headers("u-admin"))

    assert r.status_code == 404


# ─── PUT /users/{id} ────────────────────────────────────────────────

def test_update_proprio_perfil(client, seed_user, auth_headers):
    seed_user("u1", "ana@test.com")

    r = client.put("/users/u1", headers=auth_headers("u1"), json={"full_name": "Ana Clara"})

    assert r.status_code == 200
    assert r.json()["full_name"] == "Ana Clara"


def test_update_de_outro_usuario_comum_retorna_403(client, seed_user, auth_headers):
    seed_user("u1", "ana@test.com")
    seed_user("u2", "bia@test.com")

    r = client.put("/users/u2", headers=auth_headers("u1"), json={"full_name": "Invadida"})

    assert r.status_code == 403


def test_update_senha_permite_novo_login(client, seed_user, auth_headers):
    """Nível sistema: troca de senha -> novo login com a nova senha."""
    seed_user("u1", "troca@test.com")

    r = client.put("/users/u1", headers=auth_headers("u1"), json={"password": "novaSenha456"})
    assert r.status_code == 200

    r = client.post("/auth/login", data={"username": "troca@test.com", "password": "novaSenha456"})
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_update_senha_antiga_deixa_de_funcionar(client, seed_user, auth_headers):
    seed_user("u1", "troca@test.com")

    client.put("/users/u1", headers=auth_headers("u1"), json={"password": "novaSenha456"})

    r = client.post("/auth/login", data={"username": "troca@test.com", "password": "senha123"})
    assert r.status_code == 401


def test_update_senha_curta_retorna_422(client, seed_user, auth_headers):
    seed_user("u1", "ana@test.com")

    r = client.put("/users/u1", headers=auth_headers("u1"), json={"password": "123"})

    assert r.status_code == 422


# ─── DELETE /users/{id} ─────────────────────────────────────────────

def test_delete_proprio_usuario(client, seed_user, auth_headers):
    seed_user("u1", "ana@test.com")

    r = client.delete("/users/u1", headers=auth_headers("u1"))

    assert r.status_code == 204


def test_delete_de_outro_usuario_comum_retorna_403(client, seed_user, auth_headers):
    seed_user("u1", "ana@test.com")
    seed_user("u2", "bia@test.com")

    r = client.delete("/users/u2", headers=auth_headers("u1"))

    assert r.status_code == 403


def test_delete_como_admin_de_qualquer_usuario(client, seed_user, auth_headers):
    seed_user("u-admin", "admin@test.com", role="admin")
    seed_user("u2", "bia@test.com")

    r = client.delete("/users/u2", headers=auth_headers("u-admin"))

    assert r.status_code == 204


def test_delete_usuario_inexistente_como_admin_retorna_404(client, seed_user, auth_headers):
    seed_user("u-admin", "admin@test.com", role="admin")

    r = client.delete("/users/nao-existe", headers=auth_headers("u-admin"))

    assert r.status_code == 404
