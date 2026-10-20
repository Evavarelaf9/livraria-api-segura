/**
 * Gera docs/openapi.json, uma cópia estática da especificação
 * (útil para importar no Postman/Insomnia sem subir o servidor).
 * Uso: npm run docs:exportar
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(64);
const fs = require('fs');
const path = require('path');
const spec = require('../docs/openapi');
const destino = path.join(__dirname, '..', 'docs', 'openapi.json');
fs.writeFileSync(destino, JSON.stringify(spec, null, 2) + '\n');
console.log(`✔ Especificação exportada para ${path.relative(process.cwd(), destino)}`);
