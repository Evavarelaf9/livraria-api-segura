const { Router } = require('express');
const controller = require('../controllers/LivroController');
const { autenticarToken, exigirRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../config/security');

const router = Router();

/**
 * @openapi
 * /api/v1/livros:
 *   get:
 *     tags: [Livros]
 *     summary: Lista todos os livros do catálogo
 *     description: |
 *       Rota **pública**. Retorna todos os livros com o nome do autor (`autor_nome`)
 *       e os comentários já publicados. Não exige token.
 *     security: []
 *     responses:
 *       200:
 *         description: Catálogo completo (pode ser uma lista vazia).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Livro'
 *             example:
 *               - id: 1
 *                 titulo: Dom Casmurro
 *                 ano: 1899
 *                 autor_id: 1
 *                 autor_nome: Machado de Assis
 *                 comentarios:
 *                   - id: 1
 *                     usuario_id: 2
 *                     autor_nome: Leitor
 *                     texto: Clássico indispensável.
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 *   post:
 *     tags: [Livros]
 *     summary: Cadastra um novo livro (exclusivo ADMIN)
 *     description: |
 *       Rota **restrita ao perfil ADMIN**. Exige `Authorization: Bearer <token>`.
 *
 *       Regras de validação:
 *       - `titulo`: obrigatório, texto de 1 a 200 caracteres.
 *       - `autor_id`: obrigatório, inteiro positivo que referencie um autor existente.
 *       - `ano`: opcional, inteiro entre 1 e o ano corrente; se omitido, assume o ano corrente.
 *
 *       Strings numéricas (`"1881"`) são aceitas em `ano` e `autor_id` por compatibilidade com formulários HTML.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NovoLivro'
 *     responses:
 *       201:
 *         description: Livro criado; nasce sem comentários.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LivroCriado'
 *       400:
 *         description: Corpo malformado, campo obrigatório ausente ou tipo inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               semTitulo:
 *                 summary: Título ausente ou vazio
 *                 value: { erro: "O campo titulo é obrigatório e deve ser um texto não vazio." }
 *               autorIdInvalido:
 *                 summary: autor_id ausente ou não inteiro
 *                 value: { erro: "O campo autor_id é obrigatório e deve ser um inteiro positivo." }
 *               anoInvalido:
 *                 summary: Ano não inteiro ou no futuro
 *                 value: { erro: "O campo ano deve ser um inteiro entre 1 e 2026." }
 *       401:
 *         $ref: '#/components/responses/NaoAutenticado'
 *       403:
 *         $ref: '#/components/responses/ProibidoAdmin'
 *       422:
 *         description: Dados bem formados, mas o `autor_id` não corresponde a nenhum autor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             example: { erro: "O autor informado (autor_id) não existe." }
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 */
router.get('/', (req, res, next) => controller.index(req, res, next));
router.post('/', autenticarToken, exigirRole(ROLES.ADMIN), (req, res, next) => controller.store(req, res, next));

/**
 * @openapi
 * /api/v1/livros/{id}:
 *   get:
 *     tags: [Livros]
 *     summary: Detalha um livro pelo identificador
 *     description: Rota **pública**. Retorna o livro, o nome do autor e seus comentários.
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/LivroId'
 *     responses:
 *       200:
 *         description: Livro encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Livro'
 *       404:
 *         $ref: '#/components/responses/LivroNaoEncontrado'
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 */
router.get('/:id', (req, res, next) => controller.show(req, res, next));

/**
 * @openapi
 * /api/v1/livros/{id}/comentarios:
 *   post:
 *     tags: [Livros]
 *     summary: Publica um comentário em um livro (USER ou ADMIN)
 *     description: |
 *       Rota **restrita a usuários autenticados**, de qualquer perfil. Exige `Authorization: Bearer <token>`.
 *
 *       A autoria (`usuario_id` e `autor_nome`) é extraída do token validado; o cliente não consegue
 *       comentar em nome de outra pessoa. O texto deve ter entre 1 e 1000 caracteres.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LivroId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NovoComentario'
 *     responses:
 *       201:
 *         description: Comentário publicado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comentario'
 *       400:
 *         description: Texto ausente, vazio, não textual ou acima de 1000 caracteres.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               vazio:
 *                 summary: Texto ausente ou vazio
 *                 value: { erro: "O texto do comentário não pode estar vazio." }
 *               longo:
 *                 summary: Texto acima do limite
 *                 value: { erro: "O comentário deve ter no máximo 1000 caracteres." }
 *       401:
 *         $ref: '#/components/responses/NaoAutenticado'
 *       404:
 *         $ref: '#/components/responses/LivroNaoEncontrado'
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 */
router.post(
  '/:id/comentarios',
  autenticarToken,
  exigirRole(ROLES.USER, ROLES.ADMIN),
  (req, res, next) => controller.storeComment(req, res, next)
);

module.exports = router;
