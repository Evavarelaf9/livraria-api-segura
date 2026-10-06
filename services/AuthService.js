const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const repository = require('../repositories/LivrariaRepository');
const {
  JWT_SECRET, JWT_EXPIRES_IN, JWT_ISSUER, JWT_AUDIENCE, JWT_ALGORITHM,
  BCRYPT_SALT_ROUNDS, ROLES
} = require('../config/security');

// Hash "fantasma" usado quando o e-mail não existe. Assim o login gasta o mesmo
// tempo de CPU nos dois casos, impedindo enumeração de usuários por timing.
const HASH_FANTASMA = '$2b$12$oI5JiFewWomOLCmGJ97Gk.HvVxmmGiTk.bW0G5IKU08jZebK7T5.m';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MIN = 8;
const SENHA_MAX_BYTES = 72; // BCrypt ignora silenciosamente tudo após 72 bytes

class AuthService {
  async registrar({ nome, email, senha } = {}) {
    if (!nome || !email || !senha) {
      throw { status: 400, message: "Campos obrigatórios ausentes: nome, email ou senha." };
    }
    if (typeof nome !== 'string' || typeof email !== 'string' || typeof senha !== 'string') {
      throw { status: 400, message: "Formato de dados inválido." };
    }

    const emailNormalizado = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailNormalizado)) {
      throw { status: 400, message: "E-mail em formato inválido." };
    }
    if (senha.length < SENHA_MIN) {
      throw { status: 400, message: `A senha deve ter no mínimo ${SENHA_MIN} caracteres.` };
    }
    if (Buffer.byteLength(senha, 'utf8') > SENHA_MAX_BYTES) {
      throw { status: 400, message: `A senha deve ter no máximo ${SENHA_MAX_BYTES} bytes.` };
    }

    if (repository.buscarUsuarioPorEmail(emailNormalizado)) {
      throw { status: 409, message: "E-mail já cadastrado no sistema." };
    }

    // BCrypt gera um salt aleatório por senha e o embute no próprio hash
    // ($2b$<cost>$<salt 22 chars><hash 31 chars>).
    const senha_hash = await bcrypt.hash(senha, BCRYPT_SALT_ROUNDS);

    const novoUsuario = repository.salvarUsuario({
      nome: nome.trim(),
      email: emailNormalizado,
      senha_hash,
      // SEGURANÇA: o perfil NUNCA vem do cliente. Aceitar "role" do corpo da
      // requisição permitiria que qualquer anônimo se cadastrasse como ADMIN.
      role: ROLES.USER
    });

    const { senha_hash: _, ...usuarioRetorno } = novoUsuario;
    return usuarioRetorno;
  }

  async login({ email, senha } = {}) {
    if (!email || !senha || typeof email !== 'string' || typeof senha !== 'string') {
      throw { status: 400, message: "E-mail e senha são obrigatórios." };
    }

    const usuario = repository.buscarUsuarioPorEmail(email.trim().toLowerCase());

    // Compara sempre (mesmo sem usuário) para tempo de resposta constante.
    const senhaValida = await bcrypt.compare(senha, usuario ? usuario.senha_hash : HASH_FANTASMA);

    if (!usuario || !senhaValida) {
      // Mensagem genérica: não revela se o erro foi no e-mail ou na senha.
      throw { status: 401, message: "Credenciais inválidas." };
    }

    const token = jwt.sign(
      { nome: usuario.nome, role: usuario.role },
      JWT_SECRET,
      {
        subject: String(usuario.id),
        expiresIn: JWT_EXPIRES_IN,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        algorithm: JWT_ALGORITHM
      }
    );

    return {
      usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role },
      token,
      tipo: 'Bearer',
      expira_em: JWT_EXPIRES_IN
    };
  }
}

module.exports = new AuthService();
