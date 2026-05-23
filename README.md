# Vendly

Dashboard de vendas com frontend em React + Vite e backend Express servindo dados de um banco SQLite.

## Stack

- **Frontend:** React 19, Vite, React Router DOM, Recharts, CSS Modules
- **Backend:** Node.js, Express, better-sqlite3
- **Banco:** SQLite (`databases/dados.db`)

## Estrutura

```
.
├── databases/          # Banco SQLite (dados.db)
├── server/             # API Express
│   ├── index.js        # bootstrap do servidor (porta 3001)
│   ├── db.js           # conexao readonly com SQLite
│   ├── filters.js      # builder de WHERE compartilhado
│   └── routes/
│       ├── dashboard.js  # /api/dashboard/{kpis, vendas-por-grupo, ranking-vendedores, evolucao-mensal}
│       └── filters.js    # /api/filters/{filiais, vendedores}
└── src/
    ├── App.jsx         # rotas: /login, /vendas, /relatorio
    └── pages/
        ├── Login.jsx
        ├── Home.jsx        # layout com sidebar
        ├── Vendas.jsx
        └── Relatorio/      # dashboard com KPIs, evolucao mensal, ranking, filtros
```

## Como rodar

Instalar dependencias do frontend e do servidor:

```bash
npm install
npm install --prefix server
```

Subir o backend (porta 3001):

```bash
npm run server
```

Em outro terminal, subir o frontend (porta 8080, com proxy `/api` -> `localhost:3001`):

```bash
npm run dev
```

Acesse http://localhost:8080.

## Scripts

| Script | Descricao |
| --- | --- |
| `npm run dev` | inicia o Vite em modo dev |
| `npm run server` | inicia a API Express |
| `npm run build` | gera o build de producao |
| `npm run preview` | serve o build localmente |
| `npm run lint` | roda o ESLint |

## API

Base: `http://localhost:3001/api`

- `GET /health`
- `GET /filters/filiais`
- `GET /filters/vendedores`
- `GET /dashboard/kpis`
- `GET /dashboard/vendas-por-grupo`
- `GET /dashboard/ranking-vendedores?limit=20`
- `GET /dashboard/evolucao-mensal`

Todas as rotas de `/dashboard` aceitam os filtros `filial`, `vendedor`, `dataInicio` e `dataFim` via query string.
