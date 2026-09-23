# RehabDATA — frontend evolutivo

SPA React + TypeScript + Vite, com React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS e Vitest. O guia técnico e de contratos é [FRONTEND_CONTEXT.md](../FRONTEND_CONTEXT.md). O backend não foi modificado.

## Executar

Requisitos: Node.js >= 22.12 e pnpm (lockfile gerado com pnpm 11).

```sh
cd frontend
pnpm install
pnpm dev
```

Abra o endereço informado pelo Vite (normalmente http://localhost:5173). Inicie separadamente o backend conforme o README da raiz, com MySQL e suas variáveis de ambiente configurados. É necessária uma conta ativa; cadastros novos aguardam aprovação administrativa. Não existe login de demonstração na aplicação.

O proxy de desenvolvimento encaminha `/api` para `http://localhost:3000`. Para outro endereço, crie `frontend/.env.local` usando `.env.example` como referência:

```dotenv
VITE_API_URL=/api
API_PROXY_TARGET=http://localhost:3000
```

Nunca coloque `JWT_SECRET`, `DATABASE_URL` ou outras credenciais em variáveis `VITE_*`: elas ficam públicas no bundle.

## Verificações

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Os testes usam respostas HTTP simuladas e cobrem contratos de dados, erros, sessão, cadastro/login, criação de estudo e coleta. Não substituem testes ponta a ponta com Express/MySQL. Para formatar, use `pnpm format`.

## Organização

- `src/features/`: autenticação, estudos, participantes, coleta e administração.
- `src/components/`: formulários, tabelas CRUD, modais e feedback reutilizável.
- `src/domain/`: tipos, validação e conversão dos valores de coleta.
- `src/lib/`: cliente HTTP, sessão, cache e download CSV.
- `src/test/`: configuração e testes dos fluxos renderizados.

O estado remoto fica no TanStack Query; mutações invalidam as consultas da API. Filtros/modais são locais. A sessão fica no Context e em `sessionStorage`, é revalidada por `/auth/me` e removida em logout/401. Esse armazenamento é acessível a JavaScript: não equivale à proteção de cookie HttpOnly. A API não oferece refresh token.

## Escopo e limites

Inclui cadastro/login, estudos e status, estrutura do estudo, participantes globais e vínculos, visitas e medições por tipo, exclusão/restauração, permissões, pendentes e exportação CSV. Interface responsiva, com carregamento, erros, estados vazios e confirmação de ações destrutivas.

- Sem dados de exemplo, métricas inventadas, atividades recentes, configurações ou busca global no produto.
- A API não informa o papel do usuário comum. Owner é identificado pela consulta de permissões; collector e viewer não podem ser diferenciados. Ações de coleta podem aparecer para viewer e resultar em 403. O servidor continua sendo a autoridade de acesso.
- Permissões exigem ID manual do usuário porque não existe busca de usuários ativos.
- Apenas CSV está funcional no backend. O exportador atual deriva colunas da primeira linha; confira a integridade antes de usar o arquivo para análise científica (detalhes no contexto).
- Não há paginação no servidor: pesquisa e filtros são locais.
- Nome de participante limitado a 30 caracteres e unidade de variável a 20 para respeitar o banco. Siglas novas não aceitam hífen devido ao gerador de códigos do backend.

## Build e publicação futura

`pnpm build` gera `dist/`. O servidor de produção deve servir esses arquivos, redirecionar rotas da SPA para `index.html` e encaminhar `/api` ao backend. O proxy do Vite é de desenvolvimento, não de produção. Alternativamente, defina `VITE_API_URL=https://sua-api/api` antes do build e configure CORS/HTTPS no ambiente. Nenhuma publicação foi realizada.
