require("./config/security"); // carrega .env e valida o segredo JWT antes de tudo
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/authRoutes');
const livroRoutes = require('./routes/livroRoutes');
const autorRoutes = require('./routes/autorRoutes');
const errorHandler = require('./middlewares/errorMiddleware');
const openapiSpec = require('./docs/openapi');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by'); // não anuncia a tecnologia do servidor

app.use(cors({
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST']
}));
app.use(express.json({ limit: '10kb' })); // limita payloads para evitar abuso

// ---------- Documentação (OpenAPI 3.0 + Swagger UI) ----------
// Especificação bruta, para importar em Postman, Insomnia, geradores de cliente etc.
app.get('/api/docs.json', (req, res) => res.json(openapiSpec));

// Interface interativa
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'Livraria API — Documentação',
  swaggerOptions: {
    persistAuthorization: true,   // mantém o token após recarregar a página
    displayRequestDuration: true,
    tryItOutEnabled: true,        // campos de teste já abertos
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    // Conveniência: após um login bem-sucedido feito pela própria interface,
    // o token é aplicado ao botão "Authorize" automaticamente.
    responseInterceptor: function (res) {
      try {
        if (res.status === 200 && /\/api\/v1\/auth\/login$/.test(res.url)) {
          var corpo = res.body && typeof res.body === 'object' ? res.body : JSON.parse(res.text);
          if (corpo && corpo.token && window.ui) {
            window.ui.preauthorizeApiKey('bearerAuth', corpo.token);
            window.ui.authActions.persistAuthorizationIfNeeded(); // sobrevive a recarregar a página
          }
        }
      } catch (e) { /* falha silenciosa: o Authorize manual continua disponível */ }
      return res;
    }
  }
}));

// Atalhos para as URLs alternativas citadas no enunciado
app.get(['/docs', '/docs/api'], (req, res) => res.redirect(301, '/api/docs'));
app.get(['/api-docs.json', '/docs/api.json'], (req, res) => res.redirect(301, '/api/docs.json'));

// ---------- Rotas da API (RESTful /api/v1) ----------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/livros', livroRoutes);
app.use('/api/v1/autores', autorRoutes);

// 404 padronizado
app.use((req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

// Middleware Global de Tratamento de Erros
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Livraria API rodando em http://localhost:${PORT}`);
  console.log(`Documentação interativa em http://localhost:${PORT}/api/docs`);
});
