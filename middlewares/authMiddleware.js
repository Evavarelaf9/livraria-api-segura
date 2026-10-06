const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, JWT_ALGORITHM } = require('../config/security');

/**
 * AUTENTICAÇÃO (quem é você?) -> falha = 401 Unauthorized
 * Valida o header "Authorization: Bearer <token>" e popula req.usuario.
 */
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ erro: "Token de autenticação não fornecido." });
  }

  const [esquema, token, ...resto] = authHeader.split(' ');
  if (esquema !== 'Bearer' || !token || resto.length > 0) {
    res.set('WWW-Authenticate', 'Bearer error="invalid_request"');
    return res.status(401).json({ erro: "Formato inválido. Use: Authorization: Bearer <token>." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      // Fixar o algoritmo bloqueia ataques de "alg: none" e confusão de algoritmos.
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    req.usuario = { id: Number(payload.sub), nome: payload.nome, role: payload.role };
    return next();
  } catch (err) {
    const expirado = err.name === 'TokenExpiredError';
    res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
    return res.status(401).json({
      erro: expirado ? "Token expirado. Faça login novamente." : "Token inválido."
    });
  }
}

/**
 * AUTORIZAÇÃO / RBAC (o que você pode fazer?) -> falha = 403 Forbidden
 * Deve ser usado SEMPRE depois de autenticarToken.
 * Aceita um ou mais perfis: exigirRole('ADMIN') ou exigirRole('ADMIN', 'USER').
 */
function exigirRole(...rolesPermitidas) {
  return (req, res, next) => {
    if (!req.usuario) {
      // Defesa em profundidade: rota mal configurada sem autenticarToken antes.
      return res.status(401).json({ erro: "Autenticação necessária." });
    }
    if (!rolesPermitidas.includes(req.usuario.role)) {
      return res.status(403).json({
        erro: `Acesso proibido: privilégio de ${rolesPermitidas.join(' ou ')} exigido.`
      });
    }
    return next();
  };
}

module.exports = { autenticarToken, exigirRole };
