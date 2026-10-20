# Livraria API — Segurança e Documentação OpenAPI

BCrypt (salt + work factor) · JWT stateless (`Authorization: Bearer <token>`) · RBAC por middleware · OpenAPI 3.0 com Swagger UI.

## Como rodar

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run gerar-segredo         # cole o valor em JWT_SECRET no .env
npm start
```

> **Importante:** se você tem um `database.txt` antigo, **apague-o** antes de iniciar.
> Os hashes do seed original eram placeholders inválidos (nenhuma senha batia com eles).
> O arquivo é recriado com hashes BCrypt reais.

Front-end de teste: abra `public/index.html` no navegador.

| Usuário | E-mail | Senha | Perfil |
|---|---|---|---|
| Admin | admin@livraria.com | admin123 | ADMIN |
| Leitor | leitor@gmail.com | leitor123 | USER |

## Documentação da API (OpenAPI 3.0)

Com o servidor rodando:

| O quê | URL |
|---|---|
| Interface interativa (Swagger UI) | http://localhost:3000/api/docs |
| Especificação bruta (JSON) | http://localhost:3000/api/docs.json |
| Atalhos (redirecionam) | `/docs`, `/docs/api`, `/api-docs.json`, `/docs/api.json` |

Cópia estática da especificação: `docs/openapi.json` (gerada com `npm run docs:exportar`).

### Testando rotas protegidas pelo navegador

1. Abra `POST /api/v1/auth/login` → **Try it out** → escolha o exemplo *admin* ou *leitor* → **Execute**.
2. O token é aplicado automaticamente ao botão **Authorize** (cadeado fica fechado).
   Para fazer manualmente: copie o `token`, clique em **Authorize**, cole **sem** o prefixo `Bearer` e confirme.
3. Teste `POST /autores`, `POST /livros` ou `POST /livros/{id}/comentarios`.
4. Para trocar de perfil: **Authorize → Logout** e faça login com a outra conta.

### Onde fica o contrato

- `docs/openapi.js` — metadados, esquema de segurança `bearerAuth` e componentes reutilizáveis (schemas, respostas 401/403/404/500, parâmetros).
- `routes/*.js` — anotações `@openapi` de cada rota, ao lado do código que a implementa.

### Verificação automática

```bash
npm run docs:validar   # valida a especificação contra o padrão OpenAPI 3.0
npm test               # 37 testes de contrato: requisições reais conferidas contra os schemas documentados
```

O teste de contrato falha se a API devolver um status não documentado
ou um corpo que não respeite o schema declarado para aquele status.

### Convenção 400 × 422

- **400 Bad Request** — estrutura ou tipo inválido (campo ausente, `autor_id: "abc"`, `ano: 18.5`).
- **422 Unprocessable Entity** — dados bem formados, porém semanticamente inválidos (`autor_id` que não existe).

## Matriz de permissões

| Método | Rota | Acesso | Sucesso | Falhas documentadas |
|---|---|---|---|---|
| GET | /api/v1/livros | Público | 200 | 500 |
| GET | /api/v1/livros/{id} | Público | 200 | 404, 500 |
| GET | /api/v1/autores | Público | 200 | 500 |
| POST | /api/v1/auth/register | Público | 201 | 400, 409, 500 |
| POST | /api/v1/auth/login | Público | 200 | 400, 401, 500 |
| POST | /api/v1/livros/{id}/comentarios | USER ou ADMIN | 201 | 400, 401, 404, 500 |
| POST | /api/v1/autores | ADMIN | 201 | 400, 401, 403, 500 |
| POST | /api/v1/livros | ADMIN | 201 | 400, 401, 403, 422, 500 |

**401** = não sei quem você é (sem token, token inválido/expirado/adulterado).
**403** = sei quem você é, mas seu perfil não tem permissão.

## Onde está cada peça

| Arquivo | Responsabilidade |
|---|---|
| `config/security.js` | Lê `.env`, valida `JWT_SECRET` (fail-fast), constantes de JWT/BCrypt/roles |
| `services/AuthService.js` | `bcrypt.hash` no cadastro, `bcrypt.compare` + `jwt.sign` no login |
| `middlewares/authMiddleware.js` | `autenticarToken` (`jwt.verify` → 401) e `exigirRole(...roles)` (→ 403) |
| `routes/*.js` | Encadeamento `autenticarToken → exigirRole → controller` + anotações `@openapi` |
| `docs/openapi.js` | Definição-base da especificação OpenAPI e componentes reutilizáveis |
| `test/contrato.test.js` | Testes de contrato (respostas reais × especificação) |

## Decisões de segurança

- **Role nunca vem do cliente.** O `register` original aceitava `role` no corpo — qualquer anônimo podia se cadastrar como ADMIN. Agora todo cadastro é `USER`.
- **Algoritmo do JWT fixado (HS256)**, com `issuer`, `audience` e expiração (`1h`). Bloqueia `alg: none`, tokens forjados e payload adulterado.
- **Login com tempo constante:** quando o e-mail não existe, compara contra um hash fantasma, evitando enumeração de usuários por tempo de resposta. Mensagem sempre genérica ("Credenciais inválidas").
- **Validação de senha:** mínimo 8 caracteres, máximo 72 bytes (limite do BCrypt, que trunca silenciosamente o excedente).
- **Identidade do comentário vem do token** (`usuario_id`, `autor_nome`), não do corpo.
- **Erros 500 não vazam detalhes internos**; `x-powered-by` desligado; corpo JSON limitado a 10 kB.
- **Front-end:** escape de HTML contra XSS armazenado (um comentário malicioso roubaria o JWT do `localStorage`).

## Dependências

A Swagger UI vem do pacote `swagger-ui-dist`, instalado indiretamente pelo `swagger-ui-express`.
O campo `overrides` do `package.json` fixa a versão `5.33.1`, porque a versão mais recente
havia sido publicada no mesmo dia da entrega. Versões recém-lançadas ainda não passaram pelo
escrutínio da comunidade e já foram usadas em ataques à cadeia de suprimentos do npm.

## Próximos passos (fora do escopo)

Rate limiting no login (`express-rate-limit`), refresh tokens / revogação, CORS restrito à origem do front, e token em cookie `HttpOnly` em vez de `localStorage`.
