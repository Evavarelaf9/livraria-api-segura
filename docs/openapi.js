const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Definição-base da especificação OpenAPI 3.0.
 * Os paths (rotas) são lidos das anotações @openapi nos arquivos de routes/,
 * mantendo o contrato ao lado do código que o implementa.
 */
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Livraria API',
    version: '1.0.0',
    description: [
      'API RESTful de Livros e Autores protegida por **BCrypt**, **JWT** e **RBAC**.',
      '',
      '## Como testar as rotas protegidas',
      '1. Abra `POST /api/v1/auth/login`, clique em **Try it out** e envie as credenciais de um dos perfis abaixo.',
      '2. Copie o valor do campo `token` da resposta.',
      '3. Clique no botão **Authorize** (cadeado no topo), cole o token **sem** o prefixo `Bearer` e confirme.',
      '4. A partir daí, toda requisição envia `Authorization: Bearer <token>` automaticamente.',
      '',
      '> Atalho: nesta interface, um login bem-sucedido já preenche o **Authorize** sozinho.',
      '> Para trocar de perfil, use **Authorize → Logout** e faça login com a outra conta.',
      '',
      '| Perfil | E-mail | Senha |',
      '|---|---|---|',
      '| ADMIN | `admin@livraria.com` | `admin123` |',
      '| USER | `leitor@gmail.com` | `leitor123` |',
      '',
      '## Matriz de permissões',
      '| Rota | Acesso |',
      '|---|---|',
      '| `GET /livros`, `GET /livros/{id}`, `GET /autores` | Público |',
      '| `POST /auth/register`, `POST /auth/login` | Público |',
      '| `POST /livros/{id}/comentarios` | Autenticado (USER ou ADMIN) |',
      '| `POST /autores`, `POST /livros` | Exclusivo ADMIN |',
      '',
      '## Convenção de erros',
      'Toda resposta de erro tem o formato `{ "erro": "mensagem" }`.',
      '- **400** — corpo malformado, campo obrigatório ausente ou tipo inválido.',
      '- **401** — token ausente, malformado, adulterado ou expirado (*não sei quem você é*).',
      '- **403** — token válido, mas o perfil não tem permissão (*sei quem você é, mas não pode*).',
      '- **404** — recurso indicado na URL não existe.',
      '- **409** — conflito com dado existente (e-mail já cadastrado).',
      '- **422** — dados bem formados, porém semanticamente inválidos (ex.: `autor_id` inexistente).'
    ].join('\n')
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Autenticação', description: 'Cadastro de usuários e emissão de tokens JWT' },
    { name: 'Livros', description: 'Catálogo público, cadastro (ADMIN) e comentários (autenticados)' },
    { name: 'Autores', description: 'Consulta pública e cadastro de autores (ADMIN)' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token JWT obtido em `POST /api/v1/auth/login`. Cole apenas o token; ' +
          'o prefixo `Bearer` é adicionado automaticamente. Validade padrão: 1 hora.'
      }
    },

    parameters: {
      LivroId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identificador numérico do livro.',
        schema: { type: 'integer', format: 'int64', minimum: 1 },
        example: 1
      }
    },

    schemas: {
      Erro: {
        type: 'object',
        required: ['erro'],
        properties: {
          erro: { type: 'string', description: 'Mensagem legível descrevendo a falha.', example: 'Livro não localizado.' }
        }
      },

      // ---------- Autenticação ----------
      RegistroRequest: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        properties: {
          nome: { type: 'string', minLength: 1, example: 'Ana Souza' },
          email: { type: 'string', format: 'email', description: 'Normalizado para minúsculas.', example: 'ana.souza@email.com' },
          senha: { type: 'string', format: 'password', minLength: 8, maxLength: 72, description: 'Mínimo de 8 caracteres e máximo de 72 bytes (limite do BCrypt).', example: 'Senha@Forte2026' }
        }
      },
      Usuario: {
        type: 'object',
        required: ['id', 'nome', 'email', 'role'],
        properties: {
          id: { type: 'integer', format: 'int64', example: 1792000000000 },
          nome: { type: 'string', example: 'Ana Souza' },
          email: { type: 'string', format: 'email', example: 'ana.souza@email.com' },
          role: { type: 'string', enum: ['USER', 'ADMIN'], description: 'Todo cadastro público recebe USER.', example: 'USER' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@livraria.com' },
          senha: { type: 'string', format: 'password', example: 'admin123' }
        }
      },
      LoginResponse: {
        type: 'object',
        required: ['usuario', 'token', 'tipo', 'expira_em'],
        properties: {
          usuario: {
            type: 'object',
            required: ['id', 'nome', 'role'],
            properties: {
              id: { type: 'integer', format: 'int64', example: 1 },
              nome: { type: 'string', example: 'Admin' },
              role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'ADMIN' }
            }
          },
          token: {
            type: 'string',
            description: 'JWT assinado com HS256. Enviar em `Authorization: Bearer <token>`.',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub21lIjoiQWRtaW4iLCJyb2xlIjoiQURNSU4ifQ.assinatura'
          },
          tipo: { type: 'string', enum: ['Bearer'], example: 'Bearer' },
          expira_em: { type: 'string', description: 'Validade do token.', example: '1h' }
        }
      },

      // ---------- Autores ----------
      NovoAutor: {
        type: 'object',
        required: ['nome'],
        properties: {
          nome: { type: 'string', minLength: 1, maxLength: 120, example: 'Clarice Lispector' },
          nacionalidade: { type: 'string', maxLength: 60, description: 'Opcional. Padrão: "Não informada".', example: 'Brasileira' }
        }
      },
      Autor: {
        type: 'object',
        required: ['id', 'nome', 'nacionalidade'],
        properties: {
          id: { type: 'integer', format: 'int64', example: 1 },
          nome: { type: 'string', example: 'Machado de Assis' },
          nacionalidade: { type: 'string', example: 'Brasileiro' }
        }
      },

      // ---------- Livros ----------
      NovoLivro: {
        type: 'object',
        required: ['titulo', 'autor_id'],
        properties: {
          titulo: { type: 'string', minLength: 1, maxLength: 200, example: 'Memórias Póstumas de Brás Cubas' },
          ano: { type: 'integer', minimum: 1, description: 'Opcional; não pode ser futuro. Padrão: ano corrente.', example: 1881 },
          autor_id: { type: 'integer', format: 'int64', minimum: 1, description: 'Deve referenciar um autor existente.', example: 1 }
        }
      },
      Comentario: {
        type: 'object',
        required: ['id', 'usuario_id', 'autor_nome', 'texto'],
        properties: {
          id: { type: 'integer', format: 'int64', example: 1792000000000 },
          usuario_id: { type: 'integer', format: 'int64', description: 'Extraído do token, nunca do corpo.', example: 2 },
          autor_nome: { type: 'string', description: 'Nome do usuário autenticado.', example: 'Leitor' },
          texto: { type: 'string', example: 'Narrativa ambígua e genial. Capitu traiu ou não traiu?' }
        }
      },
      LivroCriado: {
        type: 'object',
        required: ['id', 'titulo', 'ano', 'autor_id', 'comentarios'],
        properties: {
          id: { type: 'integer', format: 'int64', example: 1792000000000 },
          titulo: { type: 'string', example: 'Memórias Póstumas de Brás Cubas' },
          ano: { type: 'integer', example: 1881 },
          autor_id: { type: 'integer', format: 'int64', example: 1 },
          comentarios: { type: 'array', maxItems: 0, items: { $ref: '#/components/schemas/Comentario' }, example: [] }
        }
      },
      Livro: {
        type: 'object',
        required: ['id', 'titulo', 'ano', 'autor_id', 'autor_nome', 'comentarios'],
        properties: {
          id: { type: 'integer', format: 'int64', example: 1 },
          titulo: { type: 'string', example: 'Dom Casmurro' },
          ano: { type: 'integer', example: 1899 },
          autor_id: { type: 'integer', format: 'int64', example: 1 },
          autor_nome: { type: 'string', description: '"Autor Desconhecido" se o autor não existir mais.', example: 'Machado de Assis' },
          comentarios: { type: 'array', items: { $ref: '#/components/schemas/Comentario' } }
        }
      },
      NovoComentario: {
        type: 'object',
        required: ['texto'],
        properties: {
          texto: { type: 'string', minLength: 1, maxLength: 1000, example: 'Narrativa ambígua e genial. Capitu traiu ou não traiu?' }
        }
      }
    },

    responses: {
      NaoAutenticado: {
        description: 'Token ausente, malformado, adulterado ou expirado.',
        headers: {
          'WWW-Authenticate': {
            description: 'Desafio de autenticação (RFC 6750).',
            schema: { type: 'string', example: 'Bearer error="invalid_token"' }
          }
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Erro' },
            examples: {
              ausente: { summary: 'Sem cabeçalho Authorization', value: { erro: 'Token de autenticação não fornecido.' } },
              formato: { summary: 'Cabeçalho sem o prefixo Bearer', value: { erro: 'Formato inválido. Use: Authorization: Bearer <token>.' } },
              invalido: { summary: 'Assinatura inválida ou token adulterado', value: { erro: 'Token inválido.' } },
              expirado: { summary: 'Token expirado', value: { erro: 'Token expirado. Faça login novamente.' } }
            }
          }
        }
      },
      ProibidoAdmin: {
        description: 'Token válido, mas o perfil do usuário não é ADMIN.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Erro' },
            example: { erro: 'Acesso proibido: privilégio de ADMIN exigido.' }
          }
        }
      },
      LivroNaoEncontrado: {
        description: 'Não existe livro com o id informado.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Erro' },
            example: { erro: 'Livro não localizado.' }
          }
        }
      },
      ErroInterno: {
        description: 'Falha inesperada no servidor. Detalhes internos não são expostos.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Erro' },
            example: { erro: 'Ocorreu um erro interno no servidor.' }
          }
        }
      }
    }
  }
};

const openapiSpec = swaggerJsdoc({
  definition,
  apis: [path.join(__dirname, '..', 'routes', '*.js')]
});

module.exports = openapiSpec;
