const { Router } = require('express');
const controller = require('../controllers/AuthController');

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Autenticação]
 *     summary: Cadastra um novo usuário leitor
 *     description: |
 *       Rota **pública**. Cria uma conta com perfil `USER`.
 *
 *       - A senha é armazenada como hash **BCrypt** (salt aleatório + work factor 12); nunca em texto puro.
 *       - O e-mail é normalizado para minúsculas antes da verificação de duplicidade.
 *       - Um campo `role` enviado no corpo é **ignorado**: não é possível se cadastrar como ADMIN.
 *       - A resposta nunca inclui a senha nem o hash.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistroRequest'
 *     responses:
 *       201:
 *         description: Usuário criado com perfil USER.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Dados inválidos (campo ausente, tipo incorreto, e-mail malformado ou senha fora do tamanho).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               camposAusentes:
 *                 summary: Campo obrigatório ausente
 *                 value: { erro: "Campos obrigatórios ausentes: nome, email ou senha." }
 *               emailInvalido:
 *                 summary: E-mail malformado
 *                 value: { erro: "E-mail em formato inválido." }
 *               senhaCurta:
 *                 summary: Senha com menos de 8 caracteres
 *                 value: { erro: "A senha deve ter no mínimo 8 caracteres." }
 *       409:
 *         description: E-mail já cadastrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             example: { erro: "E-mail já cadastrado no sistema." }
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 */
router.post('/register', (req, res, next) => controller.register(req, res, next));

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Autenticação]
 *     summary: Autentica o usuário e emite um token JWT
 *     description: |
 *       Rota **pública**. Confere a senha com `bcrypt.compare` e, se válida, devolve um **JWT**
 *       (HS256, validade de 1 hora) contendo o id (`sub`), o nome e o perfil (`role`).
 *
 *       Use o `token` retornado no botão **Authorize** para testar as rotas protegidas.
 *
 *       Por segurança, a mensagem de falha é a mesma para e-mail inexistente e senha incorreta,
 *       e o tempo de resposta é equivalente nos dois casos (evita enumeração de usuários).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             admin:
 *               summary: Administrador (pode cadastrar autores e livros)
 *               value: { email: "admin@livraria.com", senha: "admin123" }
 *             leitor:
 *               summary: Leitor (pode apenas comentar)
 *               value: { email: "leitor@gmail.com", senha: "leitor123" }
 *     responses:
 *       200:
 *         description: Credenciais válidas; token emitido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: E-mail ou senha ausentes, ou enviados com tipo diferente de string.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             example: { erro: "E-mail e senha são obrigatórios." }
 *       401:
 *         description: E-mail inexistente ou senha incorreta (mensagem propositalmente genérica).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             example: { erro: "Credenciais inválidas." }
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 */
router.post('/login', (req, res, next) => controller.login(req, res, next));

module.exports = router;
