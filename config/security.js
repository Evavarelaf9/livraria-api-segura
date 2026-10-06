require('dotenv').config({ quiet: true });

/**
 * Configuração centralizada de segurança.
 * Segredos NUNCA ficam no código-fonte: vêm de variáveis de ambiente (.env).
 */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  // Fail-fast: subir a API com segredo fraco/ausente seria uma falha silenciosa grave.
  console.error(
    '[FATAL] JWT_SECRET ausente ou com menos de 32 caracteres. ' +
    'Copie .env.example para .env e defina um segredo forte.'
  );
  process.exit(1);
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_ISSUER: 'livraria-api',
  JWT_AUDIENCE: 'livraria-clientes',
  JWT_ALGORITHM: 'HS256',
  // Work factor do BCrypt: custo 2^N iterações. 12 é um bom equilíbrio atual.
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  ROLES: Object.freeze({ ADMIN: 'ADMIN', USER: 'USER' })
};
