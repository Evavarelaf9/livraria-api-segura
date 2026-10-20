/**
 * Teste de contrato: sobe a API em um diretório temporário (banco isolado),
 * executa requisições reais e confere, para cada uma:
 *   1. se o status HTTP retornado está documentado para aquela operação;
 *   2. se o corpo da resposta respeita o schema documentado para aquele status.
 * Uso: npm test
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const SwaggerParser = require('@apidevtools/swagger-parser');

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
const JWT_SECRET = 'segredo-de-teste-'.padEnd(64, 'x');
let servidor, spec, tmpDir;
const tokens = {};

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

async function req(method, url, { token, body, rawAuth } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (rawAuth) headers.Authorization = rawAuth;
  const res = await fetch(BASE + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const texto = await res.text();
  let json; try { json = JSON.parse(texto); } catch { json = texto; }
  return { status: res.status, headers: res.headers, body: json };
}

/** Confere status e corpo contra a especificação. */
function conferirContrato(metodo, caminhoDocumentado, res) {
  const operacao = spec.paths[caminhoDocumentado]?.[metodo.toLowerCase()];
  assert.ok(operacao, `Operação ${metodo} ${caminhoDocumentado} não documentada`);
  const resposta = operacao.responses[String(res.status)];
  assert.ok(resposta, `Status ${res.status} não documentado em ${metodo} ${caminhoDocumentado}`);
  const schema = resposta.content?.['application/json']?.schema;
  if (schema) {
    const valido = ajv.validate(schema, res.body);
    assert.ok(valido, `Corpo fora do schema (${metodo} ${caminhoDocumentado} → ${res.status}): ` +
      ajv.errorsText(ajv.errors) + '\nCorpo: ' + JSON.stringify(res.body));
  }
  if (resposta.headers?.['WWW-Authenticate']) {
    assert.ok(res.headers.get('www-authenticate'), 'Cabeçalho WWW-Authenticate documentado mas ausente');
  }
}

before(async () => {
  spec = await SwaggerParser.dereference(JSON.parse(JSON.stringify(require('../docs/openapi'))));
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'livraria-'));
  servidor = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: tmpDir,
    env: { ...process.env, PORT: String(PORT), JWT_SECRET, BCRYPT_SALT_ROUNDS: '4' },
    stdio: 'ignore'
  });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`${BASE}/api/docs.json`); break; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  tokens.admin = (await req('POST', '/api/v1/auth/login', { body: { email: 'admin@livraria.com', senha: 'admin123' } })).body.token;
  tokens.user = (await req('POST', '/api/v1/auth/login', { body: { email: 'leitor@gmail.com', senha: 'leitor123' } })).body.token;
});

after(() => {
  servidor?.kill();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ------------------------------------------------------------------
// [método, caminho real, caminho documentado, opções, status esperado]
// ------------------------------------------------------------------
const L = '/api/v1/livros', A = '/api/v1/autores', R = '/api/v1/auth/register', LG = '/api/v1/auth/login';
const LID = '/api/v1/livros/{id}', COM = '/api/v1/livros/{id}/comentarios';
const casos = [
  ['GET',  L, L, {}, 200],
  ['GET',  `${L}/1`, LID, {}, 200],
  ['GET',  `${L}/999`, LID, {}, 404],
  ['GET',  A, A, {}, 200],

  ['POST', R, R, { body: { nome: 'Ana Souza', email: 'ana@email.com', senha: 'Senha@Forte2026' } }, 201],
  ['POST', R, R, { body: { nome: 'Mal', email: 'mal@email.com', senha: 'Senha@Forte2026', role: 'ADMIN' } }, 201],
  ['POST', R, R, { body: { nome: 'Ana' } }, 400],
  ['POST', R, R, { body: { nome: 'Ana', email: 'nao-e-email', senha: 'Senha@Forte2026' } }, 400],
  ['POST', R, R, { body: { nome: 'Ana', email: 'x@email.com', senha: '123' } }, 400],
  ['POST', R, R, { body: { nome: 'Ana', email: 'ANA@email.com', senha: 'Senha@Forte2026' } }, 409],

  ['POST', LG, LG, { body: { email: 'admin@livraria.com', senha: 'admin123' } }, 200],
  ['POST', LG, LG, { body: { email: 'admin@livraria.com' } }, 400],
  ['POST', LG, LG, { body: { email: 'admin@livraria.com', senha: { $ne: '' } } }, 400],
  ['POST', LG, LG, { body: { email: 'admin@livraria.com', senha: 'errada' } }, 401],

  ['POST', `${L}/1/comentarios`, COM, { token: 'user', body: { texto: 'Narrativa genial.' } }, 201],
  ['POST', `${L}/1/comentarios`, COM, { token: 'admin', body: { texto: 'Recomendo.' } }, 201],
  ['POST', `${L}/1/comentarios`, COM, { token: 'user', body: { texto: '   ' } }, 400],
  ['POST', `${L}/1/comentarios`, COM, { token: 'user', body: { texto: 'a'.repeat(1001) } }, 400],
  ['POST', `${L}/1/comentarios`, COM, { body: { texto: 'anônimo' } }, 401],
  ['POST', `${L}/1/comentarios`, COM, { rawAuth: 'Bearer token.adulterado.x', body: { texto: 'x' } }, 401],
  ['POST', `${L}/999/comentarios`, COM, { token: 'user', body: { texto: 'x' } }, 404],

  ['POST', A, A, { token: 'admin', body: { nome: 'Clarice Lispector', nacionalidade: 'Brasileira' } }, 201],
  ['POST', A, A, { token: 'admin', body: {} }, 400],
  ['POST', A, A, { token: 'admin', body: { nome: 'X', nacionalidade: 123 } }, 400],
  ['POST', A, A, { body: { nome: 'X' } }, 401],
  ['POST', A, A, { token: 'user', body: { nome: 'X' } }, 403],

  ['POST', L, L, { token: 'admin', body: { titulo: 'Memórias Póstumas de Brás Cubas', ano: 1881, autor_id: 1 } }, 201],
  ['POST', L, L, { token: 'admin', body: { titulo: 'Quincas Borba', ano: '1891', autor_id: '1' } }, 201],
  ['POST', L, L, { token: 'admin', body: { ano: 1881, autor_id: 1 } }, 400],
  ['POST', L, L, { token: 'admin', body: { titulo: 'X', autor_id: 'abc' } }, 400],
  ['POST', L, L, { token: 'admin', body: { titulo: 'X', autor_id: 1, ano: 3000 } }, 400],
  ['POST', L, L, { token: 'admin', body: { titulo: 'X', autor_id: 1, ano: 18.5 } }, 400],
  ['POST', L, L, { token: 'admin', body: { titulo: 'X', autor_id: 999 } }, 422],
  ['POST', L, L, { body: { titulo: 'X', autor_id: 1 } }, 401],
  ['POST', L, L, { token: 'user', body: { titulo: 'X', autor_id: 1 } }, 403]
];

for (const [metodo, url, doc, opcoes, esperado] of casos) {
  const quem = opcoes.token ? opcoes.token.toUpperCase() : (opcoes.rawAuth ? 'token adulterado' : 'anônimo');
  test(`${metodo} ${url.length > 40 ? url.slice(0, 40) + '…' : url} [${quem}] → ${esperado}`, async () => {
    const res = await req(metodo, url, { ...opcoes, token: opcoes.token && tokens[opcoes.token] });
    assert.equal(res.status, esperado, `Esperado ${esperado}, recebido ${res.status}: ${JSON.stringify(res.body)}`);
    conferirContrato(metodo, doc, res);
  });
}

test('cadastro ignora "role" enviado pelo cliente', async () => {
  const res = await req('POST', R, { body: { nome: 'Eva', email: 'eva@email.com', senha: 'Senha@Forte2026', role: 'ADMIN' } });
  assert.equal(res.body.role, 'USER');
});

test('documentação: UI em /api/docs e JSON bruto em /api/docs.json', async () => {
  const ui = await fetch(`${BASE}/api/docs/`);
  assert.equal(ui.status, 200);
  assert.match(await ui.text(), /swagger-ui/i);
  const json = await req('GET', '/api/docs.json');
  assert.equal(json.status, 200);
  assert.equal(json.body.openapi, '3.0.3');
  assert.equal(json.body.components.securitySchemes.bearerAuth.scheme, 'bearer');
  const alias = await fetch(`${BASE}/docs`, { redirect: 'manual' });
  assert.equal(alias.status, 301);
});
