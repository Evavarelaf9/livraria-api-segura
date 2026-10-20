const { Router } = require('express');
const controller = require('../controllers/AutorController');
const { autenticarToken, exigirRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../config/security');

const router = Router();

/**
 * @openapi
 * /api/v1/autores:
 *   get:
 *     tags: [Autores]
 *     summary: Lista todos os autores
 *     description: Rota **pública**. Útil para descobrir o `autor_id` antes de cadastrar um livro.
 *     security: []
 *     responses:
 *       200:
 *         description: Lista de autores.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Autor'
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 *   post:
 *     tags: [Autores]
 *     summary: Cadastra um novo autor (exclusivo ADMIN)
 *     description: |
 *       Rota **restrita ao perfil ADMIN**. Exige `Authorization: Bearer <token>`.
 *
 *       - `nome`: obrigatório, texto de 1 a 120 caracteres.
 *       - `nacionalidade`: opcional, até 60 caracteres; se omitida, assume "Não informada".
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NovoAutor'
 *     responses:
 *       201:
 *         description: Autor criado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Autor'
 *             example: { id: 1792000000000, nome: "Clarice Lispector", nacionalidade: "Brasileira" }
 *       400:
 *         description: Nome ausente, vazio ou longo demais; nacionalidade com tipo ou tamanho inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               semNome:
 *                 summary: Nome ausente
 *                 value: { erro: "O nome do autor é obrigatório." }
 *               nacionalidadeInvalida:
 *                 summary: Nacionalidade inválida
 *                 value: { erro: "O campo nacionalidade deve ser um texto de até 60 caracteres." }
 *       401:
 *         $ref: '#/components/responses/NaoAutenticado'
 *       403:
 *         $ref: '#/components/responses/ProibidoAdmin'
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 */
router.get('/', (req, res, next) => controller.index(req, res, next));
router.post('/', autenticarToken, exigirRole(ROLES.ADMIN), (req, res, next) => controller.store(req, res, next));

module.exports = router;
