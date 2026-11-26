# Pousada Recanto dos Sabiás

Sistema Web para cadastrar os quartos e controlar as reservas da Pousada Recanto dos Sabiás.

[![CI](https://github.com/GabrielSup2/PousadaRecantoDosSabias/actions/workflows/main.yml/badge.svg)](https://github.com/GabrielSup2/PousadaRecantoDosSabias/actions)

## Links

- Aplicação publicada: https://pousada-recanto-dos-sabias.vercel.app
- API: https://pousadarecantodossabias.onrender.com
- Documentação da API: https://pousadarecantodossabias.onrender.com/docs

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

## Como rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend fica em `http://localhost:5173`. Para apontar para outra API, defina `VITE_API_URL`.

## Dados iniciais

```bash
python scripts/seed.py
```

O script cria o usuário administrador e os 8 quartos da pousada, sem duplicar o que já existe.

Credenciais de demonstração:

```text
admin@pousadarecanto.com
Recanto@2026
```

## Deploy

O passo a passo está em [docs/deploy.md](docs/deploy.md). Os links da aplicação e da API estão no topo deste README.

## Persistência

Os dados são armazenados no Firebase Firestore, nas coleções `rooms`, `reservations` e `users`. A conexão é feita pelo backend com uma conta de serviço; nenhuma credencial é versionada.

## Segurança

As senhas são armazenadas com hash bcrypt. A autenticação usa JWT com expiração configurável, e as rotas são protegidas por papéis (`admin` e `user`).

## Autenticação

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria uma conta de usuário |
| POST | `/auth/login` | Autentica e devolve um token JWT |
| GET | `/auth/me` | Retorna os dados do usuário autenticado |

As rotas de `/users` permitem consultar, atualizar e excluir usuários, com permissões de administrador.

## Requisitos

- Python 3.12+
- Node.js 20+

## Testes

```bash
pytest -v
```

## CI

O pipeline em `.github/workflows/main.yml` instala as dependências e executa `pytest` a cada push na `main` e nas branches `feat/**`.

## Contribuição

Leia o [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir um pull request.

## Licença

MIT — veja [LICENSE](LICENSE).
