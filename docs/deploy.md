# Deploy — Render + Vercel

Guia para publicar o backend no Render e o frontend na Vercel.

## 0. Pré-requisitos

- Repositório público no GitHub: `https://github.com/GabrielSup2/PousadaRecantoDosSabias`
- Conta no [Render](https://render.com)
- Conta na [Vercel](https://vercel.com)
- Arquivo `firebase-service-account.json` em mãos (não commitar)
- Projeto Firebase `pousada-recanto-dos-sabias` com o Firestore já populado

O seed já foi executado no Firestore local:

- admin: `admin@pousadarecanto.com` / `Recanto@2026`
- 8 quartos

Se for usar outro projeto Firebase, rode o seed apontando para ele antes do deploy.

---

## 1. Backend no Render

### Opção A — Blueprint (usa o `render.yaml`)

1. No Render, clique em **New → Blueprint**.
2. Conecte o repositório `GabrielSup2/PousadaRecantoDosSabias`.
3. O Render lê o `render.yaml` e mostra o serviço `pousada-recanto-dos-sabias-api`.
4. Preencha as variáveis que ele pedir:
   - `FIREBASE_CREDENTIALS_JSON`: cole o JSON inteiro da service account.
   - `CORS_ORIGINS`: coloque `*` por enquanto; depois troque pela URL da Vercel.
5. Clique em **Apply**.

### Opção B — Manual

1. **New → Web Service**.
2. Conecte o repositório.
3. Configuração:
   - **Name:** `pousada-recanto-dos-sabias-api`
   - **Branch:** `main`
   - **Runtime:** Docker
   - **Plan:** Free
   - **Health Check Path:** `/health`
4. Em **Environment**, adicione:

| Variável | Valor |
|---|---|
| `JWT_SECRET` | uma chave longa e aleatória |
| `FIREBASE_PROJECT_ID` | `pousada-recanto-dos-sabias` |
| `FIREBASE_CREDENTIALS_JSON` | o JSON inteiro da service account |
| `CORS_ORIGINS` | `*` por enquanto; depois a URL da Vercel |

Para gerar o `JWT_SECRET`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

> Não reutilize o `JWT_SECRET` do seu `.env` local.

### Credenciais do Firebase

O código aceita duas formas:

1. **Variável de ambiente** `FIREBASE_CREDENTIALS_JSON` com o JSON inteiro.
2. **Secret File** no Render:
   - Environment → Secret Files → Add Secret File
   - Nome: `firebase-service-account.json`
   - Conteúdo: o JSON da service account
   - Variável: `FIREBASE_CREDENTIALS_JSON_PATH=/etc/secrets/firebase-service-account.json`

Use uma das duas; a variável `FIREBASE_CREDENTIALS_JSON` tem prioridade.

### Porta

O `Dockerfile` já usa a porta que o Render define:

```text
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Não precisa configurar porta manualmente.

### Depois do deploy

Teste:

```bash
curl https://SUA-API.onrender.com/health
curl https://SUA-API.onrender.com/rooms
```

O primeiro deve devolver `{"status":"ok"}`. O segundo deve devolver os 8 quartos.

> No plano free, o Render hiberna por inatividade. A primeira requisição pode demorar 30–60 segundos.

---

## 2. Frontend na Vercel

1. Na Vercel, clique em **Add New → Project**.
2. Importe o repositório `GabrielSup2/PousadaRecantoDosSabias`.
3. Configuração:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Em **Environment Variables**, adicione:
   - `VITE_API_URL` = `https://SUA-API.onrender.com` (sem barra no final)
5. Clique em **Deploy**.

O arquivo `frontend/vercel.json` já configura o fallback para as rotas do React Router (`/dashboard`, `/rooms`, `/reservations` etc.).

> `VITE_API_URL` entra no build. Se mudar a URL da API, faça um novo deploy na Vercel.

---

## 3. Ajustar o CORS

Depois que a Vercel gerar a URL do frontend:

1. Volte ao Render → serviço da API → Environment.
2. Troque `CORS_ORIGINS` para a URL exata da Vercel:

```text
https://SEU-PROJETO.vercel.app
```

3. Salve; o Render faz o redeploy.

Se quiser testar o frontend local contra a API publicada, use:

```text
https://SEU-PROJETO.vercel.app,http://localhost:5173
```

Não inclua barra no final nem espaço.

---

## 4. Testes pós-deploy

1. Abra a URL da Vercel.
2. Clique em **Entrar**.
3. Use `admin@pousadarecanto.com` / `Recanto@2026`.
4. Confira:
   - Dashboard com os cards;
   - **Quartos** com os 8 quartos;
   - criação/edição de quarto como admin;
   - **Reservas** com criação, cancelamento e bloqueio de sobreposição;
   - recarregar a página em `/rooms` e `/reservations` sem dar 404.

---

## 5. Links para o README e o PDF

Depois do deploy, atualize:

- README: link do repositório e link da aplicação.
- PDF, seção 2: os dois links.
- PDF, seção 7: links para os arquivos de rota no GitHub.

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| 500 no login ou nas rotas | Credencial do Firebase inválida | Confira o JSON ou use o Secret File |
| Erro de CORS no navegador | `CORS_ORIGINS` diferente da URL da Vercel | Use a origem exata, sem barra no final |
| 401 no login | Admin não existe no Firestore usado | Rode o seed no projeto correto |
| Frontend chama `localhost:8000` em produção | `VITE_API_URL` não definida | Defina e faça novo deploy |
| 404 ao atualizar `/rooms` | Falta o rewrite | Confirme `frontend/vercel.json` e o Root Directory |
| Primeira requisição lenta | Render free hibernou | Aguarde; é normal no plano free |
| Mudou variável e não refletiu | Render/Vercel precisam de redeploy | Faça redeploy do serviço |

---

## Checklist

- [ ] Backend no Render com `/health` respondendo.
- [ ] `FIREBASE_CREDENTIALS_JSON` ou Secret File configurado.
- [ ] `JWT_SECRET` novo, diferente do local.
- [ ] Frontend na Vercel com `VITE_API_URL` correta.
- [ ] Build da Vercel passou.
- [ ] `CORS_ORIGINS` com a URL da Vercel.
- [ ] Login admin funcionando.
- [ ] Quartos e reservas funcionando na aplicação publicada.
- [ ] Repositório público até 27/11.
- [ ] Links no README e no PDF.
