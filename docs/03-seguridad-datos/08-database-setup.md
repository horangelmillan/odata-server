# 08 — Database Setup (Sequelize + PostgreSQL)

## 8.1 Sequelize Configuration

The project uses Sequelize as the primary ORM for REST operations and as the underlying layer for OData integration. Configuration is centralized in a singleton service that exports the `Sequelize` instance and `DataTypes` object, reused by all models in the system.

```typescript
// src/common/service/ORM/sequelize.service.ts
import { Sequelize, DataTypes, Options } from "sequelize";
import { config } from "dotenv";
config();

const paramsDev: Options = {
    dialect: "postgres",
    host: process.env.DEV_HOST || "localhost",
    port: Number(process.env.DEV_PORT) || 5432,
    username: process.env.DEV_USERNAME || "postgres",
    password: process.env.DEV_PASSWORD || "secret",
    database: process.env.DEV_DB || "odata_dev",
    logging: false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
};

const paramsProd: Options = {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB,
    logging: false,
    pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
    dialectOptions: {
        ssl: { required: true, rejectUnauthorized: false },
    },
};

const params = process.env.NODE_ENV === "production" ? paramsProd : paramsDev;
const db: Sequelize = new Sequelize(params);

export { db, DataTypes };
```

Two environments are differentiated via `NODE_ENV`. Development uses defaults (localhost, postgres user, `odata_dev` database). Production requires explicit `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB` variables. The connection pool in development is 10 max / 2 min; production scales to 20 max / 5 min with mandatory SSL.

---

## 8.2 @phrasecode/odata DataSource

The `@phrasecode/odata` library requires its own `DataSource` pointing to the same PostgreSQL database but with an independent connection pool. This keeps OData and REST pools isolated.

```typescript
// src/common/service/odata/datasource.ts
import { DataSource } from "@phrasecode/odata";
import { ProductOData } from "./models/product.odata.model.js";

export const dataSource = new DataSource({
    dialect: "postgres",
    database: process.env.NODE_ENV === "production" ? process.env.DB : process.env.DEV_DB,
    username: process.env.NODE_ENV === "production" ? process.env.DB_USERNAME : process.env.DEV_USERNAME,
    password: process.env.NODE_ENV === "production" ? process.env.DB_PASSWORD : process.env.DEV_PASSWORD,
    host: process.env.NODE_ENV === "production" ? process.env.DB_HOST : process.env.DEV_HOST,
    port: Number(process.env.NODE_ENV === "production" ? process.env.DB_PORT : process.env.DEV_PORT),
    pool: { max: 10, min: 2, idle: 10000, acquire: 30000 },
    models: [ProductOData],
    ssl: process.env.NODE_ENV === "production",
});
```

The `models` array registers OData models that the library uses to generate the schema and process queries. The `ssl` flag is enabled automatically in production.

---

## 8.3 Sequelize Models (for REST)

REST models use the modern Sequelize pattern with `InferAttributes` and `InferCreationAttributes` generics for strict typing without duplicating column definitions.

```typescript
// src/core/product/model/product.model.ts
import { Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { db, DataTypes } from "../../../common/service/ORM/sequelize.service.js";

interface ProductModel extends Model<InferAttributes<ProductModel>, InferCreationAttributes<ProductModel>> {
    id: CreationOptional<number>;
    nombre: string;
    precio: number;
    categoria: string;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}

const ProductModel = db.define<ProductModel>("Product", {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre:       { type: DataTypes.STRING(255), allowNull: false },
    precio:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    categoria:    { type: DataTypes.STRING(100), allowNull: false },
    createdAt:    { type: DataTypes.DATE, allowNull: true },
    updatedAt:    { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: "products",
    timestamps: true,
});

export { ProductModel };
```

Models are defined per core module (`src/core/*/model/`), each importing the shared `db` instance from `sequelize.service.ts`.

---

## 8.4 Migrations vs Sync

| Method | When to use |
|--------|------------|
| `db.sync()` | Development, prototyping |
| `umzug` migrations | Production |
| `drizzle-kit` | If migrating to Drizzle ORM |

In development, `db.sync({ alter: true })` allows fast iteration — each time the server starts, Sequelize adjusts existing tables to the current schema. In production this is dangerous as it can cause data loss or locks. The recommended approach for production is manual SQL migrations or Sequelize Migrations via `umzug`, executed programmatically at application startup.

---

## 8.5 Connection Pools

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Express    │────→│  Sequelize   │────→│  PostgreSQL   │
│  App        │     │  (pool 10)   │     │  (max 100)    │
└─────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    │ (independent pools)
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│ @phrasecode │────→│  DataSource  │
│ /odata      │     │  (pool 10)   │
└─────────────┘     └──────────────┘
```

**Important**: `@phrasecode/odata` manages its own connection pool through `DataSource` — it does not reuse the Sequelize pool. This means the application maintains two simultaneous pools toward the same database. In production, factor this into PostgreSQL's `max_connections` setting (default 100). If Sequelize uses max 20 and OData uses max 10, that consumes 30 of the 100 available connections.

For environments with connection constraints, reduce the pool minimum to 1 and maximum to 5 on each side, or consolidate both access paths through an external pooler like PgBouncer.
