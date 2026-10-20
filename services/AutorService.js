const repository = require('../repositories/LivrariaRepository');

const NOME_MAX = 120;
const NACIONALIDADE_MAX = 60;

class AutorService {
  listarTodos() {
    return repository.listarAutores();
  }

  criar({ nome, nacionalidade } = {}) {
    if (typeof nome !== "string" || nome.trim() === "") {
      throw { status: 400, message: "O nome do autor é obrigatório." };
    }
    if (nome.trim().length > NOME_MAX) {
      throw { status: 400, message: `O nome do autor deve ter no máximo ${NOME_MAX} caracteres.` };
    }
    if (nacionalidade !== undefined && nacionalidade !== null &&
        (typeof nacionalidade !== "string" || nacionalidade.trim().length > NACIONALIDADE_MAX)) {
      throw { status: 400, message: `O campo nacionalidade deve ser um texto de até ${NACIONALIDADE_MAX} caracteres.` };
    }

    return repository.salvarAutor({
      nome: nome.trim(),
      nacionalidade: (nacionalidade && nacionalidade.trim()) || "Não informada"
    });
  }
}

module.exports = new AutorService();
