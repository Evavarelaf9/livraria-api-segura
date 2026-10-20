const repository = require('../repositories/LivrariaRepository');

const TITULO_MAX = 200;
const COMENTARIO_MAX = 1000;

/**
 * Converte para inteiro apenas números inteiros ou strings estritamente numéricas.
 * Qualquer outra coisa (booleano, objeto, "12abc", 3.5) resulta em NaN.
 * A tolerância a strings existe porque formulários HTML enviam números como texto.
 */
function paraInteiro(valor) {
  if (typeof valor === 'number') return Number.isInteger(valor) ? valor : NaN;
  if (typeof valor === 'string' && /^-?\d+$/.test(valor.trim())) return Number(valor.trim());
  return NaN;
}

const ausente = v => v === undefined || v === null || v === '';

class LivroService {
  listarTodos() {
    const livros = repository.listarLivros();
    const autores = repository.listarAutores();

    return livros.map(livro => {
      const autor = autores.find(a => a.id === livro.autor_id);
      return {
        ...livro,
        autor_nome: autor ? autor.nome : "Autor Desconhecido"
      };
    });
  }

  buscarPorId(id) {
    const livro = repository.buscarLivroPorId(id);
    if (!livro) {
      throw { status: 404, message: "Livro não localizado." };
    }

    const autor = repository.buscarAutorPorId(livro.autor_id);
    return {
      ...livro,
      autor_nome: autor ? autor.nome : "Autor Desconhecido"
    };
  }

  criar({ titulo, ano, autor_id } = {}) {
    // 400 Bad Request: estrutura ou tipo inválido
    if (typeof titulo !== "string" || !titulo.trim()) {
      throw { status: 400, message: "O campo titulo é obrigatório e deve ser um texto não vazio." };
    }
    if (titulo.trim().length > TITULO_MAX) {
      throw { status: 400, message: `O campo titulo deve ter no máximo ${TITULO_MAX} caracteres.` };
    }

    const autorId = paraInteiro(autor_id);
    if (ausente(autor_id) || !Number.isInteger(autorId) || autorId < 1) {
      throw { status: 400, message: "O campo autor_id é obrigatório e deve ser um inteiro positivo." };
    }

    const anoAtual = new Date().getFullYear();
    let anoFinal = anoAtual;
    if (!ausente(ano)) {
      anoFinal = paraInteiro(ano);
      if (!Number.isInteger(anoFinal) || anoFinal < 1 || anoFinal > anoAtual) {
        throw { status: 400, message: `O campo ano deve ser um inteiro entre 1 e ${anoAtual}.` };
      }
    }

    // 422 Unprocessable Entity: dados bem formados, mas referência inexistente
    const autor = repository.buscarAutorPorId(autorId);
    if (!autor) {
      throw { status: 422, message: "O autor informado (autor_id) não existe." };
    }

    return repository.salvarLivro({
      titulo: titulo.trim(),
      ano: anoFinal,
      autor_id: autorId
    });
  }

  adicionarComentario(livroId, { texto, usuario }) {
    if (!usuario) {
      throw { status: 401, message: "Autenticação necessária." };
    }
    if (typeof texto !== 'string' || texto.trim() === "") {
      throw { status: 400, message: "O texto do comentário não pode estar vazio." };
    }
    if (texto.trim().length > COMENTARIO_MAX) {
      throw { status: 400, message: `O comentário deve ter no máximo ${COMENTARIO_MAX} caracteres.` };
    }

    this.buscarPorId(livroId);

    return repository.adicionarComentario(livroId, {
      // A identidade vem do JWT validado (req.usuario), nunca do corpo da requisição.
      usuario_id: usuario.id,
      autor_nome: usuario.nome,
      texto: texto.trim()
    });
  }
}

module.exports = new LivroService();
