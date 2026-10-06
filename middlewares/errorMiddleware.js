function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;

  // Erros 5xx não expõem detalhes internos (stack, caminhos, mensagens de libs).
  if (statusCode >= 500) {
    console.error(err);
    return res.status(statusCode).json({ erro: "Ocorreu um erro interno no servidor." });
  }

  // JSON malformado no corpo da requisição (body-parser)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: "JSON inválido no corpo da requisição." });
  }

  return res.status(statusCode).json({ erro: err.message || "Requisição inválida." });
}

module.exports = errorHandler;
