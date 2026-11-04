# Pousada Recanto dos Sábias

Sistema Web para cadastrar os quartos e controlar as reservas da Pousada Recanto dos Sábias.

## Visão geral

O sistema centraliza os quartos e as reservas em uma aplicação Web, com validação de datas, capacidade e sobreposição.

## Funcionalidades

- Cadastro, edição, listagem e exclusão de quartos.
- Cadastro, edição, listagem e exclusão de reservas.
- Reservas vinculadas a um quarto, com data de entrada e saída.
- Validação de campos obrigatórios, capacidade e sobreposição de datas.

## Stack

- Backend: FastAPI + Firebase Firestore
- Frontend: React + Vite + Tailwind CSS
- Testes: Pytest
- Deploy: Render + Vercel

## Status

Em desenvolvimento.

## Como rodar o backend

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

A API fica em `http://localhost:8000`, o health check em `/health` e a documentação em `/docs`.

## Requisitos

- Python 3.12+
- Node.js 20+

## Testes

```bash
pytest -v
```

## Contribuição

Leia o [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir um pull request.

## Licença

MIT — veja [LICENSE](LICENSE).
