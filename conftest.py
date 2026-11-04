"""
Configuração global dos testes (conftest raiz).

Define as variáveis de ambiente antes de importar a aplicação e expõe o
cliente HTTP usado pelos testes de integração.
"""
import os

os.environ.setdefault("JWT_SECRET", "chave-de-teste-nao-usar-em-producao")
os.environ.setdefault("FIREBASE_PROJECT_ID", "pousada-recanto-dos-sabias-teste")
os.environ.setdefault("FIREBASE_CREDENTIALS_JSON_PATH", "/tmp/nao-existe.json")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    """Cliente HTTP de teste da aplicação FastAPI."""
    return TestClient(app)
