/**
 * Valida a especificação gerada contra o padrão OpenAPI 3.0
 * (estrutura, tipos e resolução de todas as referências $ref).
 * Uso: npm run docs:validar
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(64);
const SwaggerParser = require('@apidevtools/swagger-parser');
const spec = require('../docs/openapi');

SwaggerParser.validate(JSON.parse(JSON.stringify(spec)))
  .then(api => {
    const ops = Object.values(api.paths).reduce((n, p) => n + Object.keys(p).length, 0);
    console.log(`✔ Especificação OpenAPI ${api.openapi} válida: ${Object.keys(api.paths).length} paths, ${ops} operações.`);
  })
  .catch(err => {
    console.error('✘ Especificação inválida:\n' + err.message);
    process.exit(1);
  });
