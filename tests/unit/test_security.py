"""Testes unitários do módulo de segurança (app/core/security.py).

Cobertura das decisões de criação/validação de tokens JWT e do
hash/verificação de senhas com bcrypt.
"""
import base64
import json
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.config import get_settings
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)

SECRET = get_settings().jwt_secret


def _decodifica(token):
    return jwt.decode(token, SECRET, algorithms=["HS256"])


# ─── hash de senha ──────────────────────────────────────────────────

def test_hash_password_nao_guarda_a_senha_em_texto_puro():
    hashed = hash_password("senha123")
    assert hashed != "senha123"
    assert hashed.startswith("$2")


def test_verify_password_senha_correta():
    hashed = hash_password("senhaSegura123")
    assert verify_password("senhaSegura123", hashed) is True


def test_verify_password_senha_incorreta():
    hashed = hash_password("senhaSegura123")
    assert verify_password("senhaErrada", hashed) is False


def test_hash_usa_sal_diferente_por_geracao():
    """Mesma senha gera hashes diferentes (sal aleatório) — requisito de segurança."""
    assert hash_password("senha123") != hash_password("senha123")


# ─── criação de token ───────────────────────────────────────────────

def test_create_access_token_contem_subject_e_expiracao():
    payload = _decodifica(create_access_token(subject="user-1"))
    assert payload["sub"] == "user-1"
    assert payload["exp"] > datetime.now(timezone.utc).timestamp()


def test_create_access_token_expiracao_personalizada():
    payload = _decodifica(create_access_token(subject="user-1", expires_minutes=5))
    expira_em = payload["exp"] - datetime.now(timezone.utc).timestamp()
    assert 0 < expira_em <= 5 * 60


# ─── decodificação de token ─────────────────────────────────────────

def test_decode_token_valido_retorna_subject():
    token = create_access_token(subject="user-1")
    assert decode_token(token) == "user-1"


def test_decode_token_invalido_retorna_none():
    assert decode_token("token.invalido.qualquer") is None


def test_decode_token_expirado_retorna_none():
    token = create_access_token(subject="user-1", expires_minutes=-1)
    assert decode_token(token) is None


def test_decode_token_assinado_com_outra_chave_retorna_none():
    token = jwt.encode({"sub": "user-1"}, "outra-chave-secreta", algorithm="HS256")
    assert decode_token(token) is None


def test_senha_com_caracteres_unicode():
    """Senhas com acentos e emojis são verificadas corretamente
    (codificação UTF-8 consistente entre hash e verificação)."""
    senha = "Sênh@123🔒"
    hashed = hash_password(senha)
    assert verify_password(senha, hashed) is True


def test_jwt_alg_none_rejeitado():
    """Ataque clássico 'alg=none': token sem assinatura deve ser rejeitado —
    o decode exige o algoritmo configurado (HS256)."""
    header = base64.urlsafe_b64encode(
        json.dumps({"alg": "none", "typ": "JWT"}).encode()
    ).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": "usuario-qualquer"}).encode()
    ).decode().rstrip("=")

    assert decode_token(f"{header}.{payload}.") is None


def test_senha_maior_que_72_bytes_deve_ser_rejeitada():
    """REGRA DE NEGÓCIO DESEJADA (não implementada — o teste FALHA de
    propósito): senhas com mais de 72 bytes (limite do bcrypt) devem ser
    REJEITADAS com mensagem clara. Hoje o hash trunca SILENCIOSAMENTE:
    duas senhas diferentes que compartilham os primeiros 72 bytes geram o
    MESMO hash — verificado que verify_password aceita 'x'*72+'y'*28
    contra o hash de 'x'*100. Correção recomendada: validar o tamanho
    máximo da senha no schema. Enquanto não corrigida, este teste falha —
    evidência e guarda."""
    with pytest.raises(ValueError):
        hash_password("x" * 100)
    # Se o hash for aceito (sem exceção), a regra não existe — o teste
    # falha com DID NOT RAISE, documentando o truncamento silencioso.
