# Livraria API — Camada de Segurança

BCrypt (salt + work factor) · JWT stateless (`Authorization: Bearer <token>`) · RBAC por middleware.

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

## Matriz de permissões

| Método | Rota | Acesso | Sucesso | Falha |
|---|---|---|---|---|
| GET | /api/v1/livros | Público | 200 | — |
| GET | /api/v1/livros/:id | Público | 200 | — |
| POST | /api/v1/auth/register | Público | 201 | — |
| POST | /api/v1/auth/login | Público | 200 | 401 |
| POST | /api/v1/livros/:id/comentarios | USER ou ADMIN | 201 | 401 |
| POST | /api/v1/autores | ADMIN | 201 | 401 / 403 |
| POST | /api/v1/livros | ADMIN | 201 | 401 / 403 |

**401** = não sei quem você é (sem token, token inválido/expirado/adulterado).
**403** = sei quem você é, mas seu perfil não tem permissão.

## Onde está cada peça

| Arquivo | Responsabilidade |
|---|---|
| `config/security.js` | Lê `.env`, valida `JWT_SECRET` (fail-fast), constantes de JWT/BCrypt/roles |
| `services/AuthService.js` | `bcrypt.hash` no cadastro, `bcrypt.compare` + `jwt.sign` no login |
| `middlewares/authMiddleware.js` | `autenticarToken` (`jwt.verify` → 401) e `exigirRole(...roles)` (→ 403) |
| `routes/*.js` | Encadeamento `autenticarToken → exigirRole → controller` |

## Decisões de segurança

- **Role nunca vem do cliente.** O `register` original aceitava `role` no corpo — qualquer anônimo podia se cadastrar como ADMIN. Agora todo cadastro é `USER`.
- **Algoritmo do JWT fixado (HS256)**, com `issuer`, `audience` e expiração (`1h`). Bloqueia `alg: none`, tokens forjados e payload adulterado.
- **Login com tempo constante:** quando o e-mail não existe, compara contra um hash fantasma, evitando enumeração de usuários por tempo de resposta. Mensagem sempre genérica ("Credenciais inválidas").
- **Validação de senha:** mínimo 8 caracteres, máximo 72 bytes (limite do BCrypt, que trunca silenciosamente o excedente).
- **Identidade do comentário vem do token** (`usuario_id`, `autor_nome`), não do corpo.
- **Erros 500 não vazam detalhes internos**; `x-powered-by` desligado; corpo JSON limitado a 10 kB.
- **Front-end:** escape de HTML contra XSS armazenado (um comentário malicioso roubaria o JWT do `localStorage`).

## Próximos passos (fora do escopo)

Rate limiting no login (`express-rate-limit`), refresh tokens / revogação, CORS restrito à origem do front, e token em cookie `HttpOnly` em vez de `localStorage`.
