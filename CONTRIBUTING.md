# Guia de contribuição — Pousada Recanto dos Sábios

Este documento define como a equipe trabalha. Seguir estas regras mantém o histórico do Git limpo e o projeto fácil de avaliar.

---

## 1. Antes de começar

1. Tenha Git, Python 3.12 e Node.js 20+ instalados.
2. Aceite o convite de colaborador no GitHub.
3. Clone o repositório:

```bash
git clone https://github.com/GabrielSup2/PousadaRecantoDosSabias.git
cd PousadaRecantoDosSabios
```

4. Configure seu nome e e-mail **iguais aos do GitHub**:

```bash
git config user.name "Nome Completo"
git config user.email "email-do-github"
```

5. Prepare o ambiente:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

cd frontend
npm install
cd ..
```

6. Leia o guia da sua fase em `fases/`.

---

## 2. Estratégia de branches

A branch `main` é a versão estável. Ninguém commita direto nela.

| Tipo | Padrão | Exemplo |
|---|---|---|
| Funcionalidade | `feat/<tema>-<nome>` | `feat/schemas-karol` |
| Correção | `fix/<tema>-<nome>` | `fix/validacao-matheus` |
| Documentação | `docs/<tema>-<nome>` | `docs/api-guilherme` |
| Testes | `test/<tema>-<nome>` | `test/api-pereira` |
| Manutenção | `chore/<tema>-<nome>` | `chore/ci-gabriel` |

Fluxo:

```bash
git pull origin main
git checkout -b feat/schemas-karol
# ... faz as alterações ...
git add <arquivos>
git commit -m "feat(quarto): cria schema Pydantic de Quarto"
git push origin feat/schemas-karol
```

Depois, abra um Pull Request para a `main` e peça revisão ao Gabriel.

---

## 3. Padrão de commits (Conventional Commits)

Formato:

```text
tipo(escopo): descrição curta no imperativo
```

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `test` | Testes |
| `docs` | Documentação |
| `refactor` | Mudança interna sem alterar comportamento |
| `chore` | Configuração, dependências, CI |
| `style` | Formatação, sem mudança de lógica |
| `perf` | Melhoria de desempenho |

Exemplos bons:

- `feat(reserva): valida capacidade do quarto`
- `fix(api): corrige status 409 em reserva sobreposta`
- `test(repositorios): cobre consulta por quarto`
- `docs(api): documenta endpoints de reservas`

Evite:

- `update`
- `ajustes`
- `correções`
- `commit`
- `agora vai`

**Regra:** um commit = uma mudança coerente. Se a mensagem precisar de “e”, provavelmente são dois commits.

---

## 4. Pull Requests

Todo PR deve:

1. Ter um título no mesmo padrão dos commits.
2. Preencher o template em `.github/pull_request_template.md`.
3. Explicar **o que** mudou, **por que** e **como testar**.
4. Ter CI verde.
5. Ser revisado por pelo menos uma pessoa.
6. Não conter segredos.

---

## 5. Estilo de código

### Python

- Seguir PEP 8.
- Nomes significativos: `create_reservation`, não `cr`.
- Funções curtas, com uma responsabilidade.
- Type hints nas funções.
- Camadas separadas: rota → serviço → repositório.
- Não duplicar validação: schema valida formato; service valida regra de negócio.

### React

- Componentes funcionais e hooks.
- Um componente por arquivo.
- Nomes em PascalCase para componentes e camelCase para funções.
- Não duplicar chamadas de API: usar `src/services/`.
- Formulários com validação e mensagem de erro clara.

---

## 6. Testes

Antes de abrir PR:

```bash
pytest -v
```

Regras:

- Toda funcionalidade nova precisa de teste.
- Toda correção de bug precisa de um teste que reproduza o bug.
- Os testes não podem depender de credenciais reais.
- Não remover teste para “fazer o CI passar”.

---

## 7. Segredos e arquivos proibidos

**Nunca** commitar:

- `.env` ou qualquer arquivo com senha;
- JSON de credenciais do Firebase;
- `.claude/`;
- `.venv/`, `node_modules/`, `dist/`, `__pycache__/`, `.pytest_cache/`;
- arquivos de cobertura (`htmlcov/`, `.coverage`).

Use `.env.example` para documentar as variáveis.

Se um segredo vazar no histórico, avise o Gabriel imediatamente e rotacione a chave.

---

## 8. Definição de pronto (Definition of Done)

Uma tarefa só está pronta quando:

- [ ] O código funciona localmente.
- [ ] Os testes passam (`pytest -v`).
- [ ] A documentação foi atualizada.
- [ ] Não há segredos no diff.
- [ ] As mensagens de commit seguem o padrão.
- [ ] O PR foi revisado e aprovado.
- [ ] A funcionalidade foi testada na aplicação (quando aplicável).

---

## 9. Dúvidas

Cada fase tem um guia detalhado em `fases/`. Se algo não estiver claro, pergunte ao Gabriel antes de commitar.
