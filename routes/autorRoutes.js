const { Router } = require('express');
const controller = require('../controllers/AutorController');
const { autenticarToken, exigirRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../config/security');

const router = Router();

// Pública
router.get('/', (req, res, next) => controller.index(req, res, next));

// Exclusivo ADMIN -> 401 sem token | 403 se não for ADMIN
router.post('/', autenticarToken, exigirRole(ROLES.ADMIN), (req, res, next) => controller.store(req, res, next));

module.exports = router;
