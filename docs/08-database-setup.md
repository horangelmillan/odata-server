# 08 — Configuración de Base de Datos (Sequelize + PostgreSQL)

## 8.1 Configuración de Sequelize

El proyecto utiliza Sequelize como ORM principal para las operaciones REST y como base subyacente para la integración con OData. La configuración se encuentra centralizada en un servicio singleton que exporta la instancia `Sequelize` y el objeto `DataTypes` para ser reutilizados por todos los modelos del sistema.

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
    pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
    },
};

const paramsProd: Options = {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB,
    logging: false,
    pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000,
    },
    dialectOptions: {
        ssl: {
            required: true,
            rejectUnauthorized: false,
        },
    },
};

const params = process.env.NODE_ENV === "production" ? paramsProd : paramsDev;
const db: Sequelize = new Sequelize(params);

export { db, DataTypes };
```

La configuración diferencia dos entornos mediante `NODE_ENV`. En desarrollo se usan valores por defecto (localhost, usuario postgres, base odata_dev) mientras que producción requiere variables explícitas `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` y `DB`. El pool de conexiones en desarrollo es de 10 conexiones máximas con 2 mínimas; en producción se escala a 20 máximas y 5 mínimas, con SSL obligatorio mediante `dialectOptions.ssl`.

El `logging: false` evita que Sequelize imprima todas las sentencias SQL en consola. Para depuración puntual puede cambiarse a `logging: console.log`.

## 8.2 Configuración DataSource @phrasecode/odata

La librería `@phrasecode/odata` requiere su propia fuente de datos independiente. Aunque apunta a la misma base de datos PostgreSQL, maneja su propio pool de conexiones interno. Esto permite que OData y REST operen de forma aislada sin compartir el pool de Sequelize.

```typescript
// src/common/service/odata/datasource.ts
import { DataSource } from "@phrasecode/odata";
import { ProductOData } from "./models/product.odata.model.js";

export const dataSource = new DataSource({
    dialect: process.env.NODE_ENV === "production" ? "postgres" : "postgres",
    database: process.env.NODE_ENV === "production" ? process.env.DB : process.env.DEV_DB,
    username: process.env.NODE_ENV === "production" ? process.env.DB_USERNAME : process.env.DEV_USERNAME,
    password: process.env.NODE_ENV === "production" ? process.env.DB_PASSWORD : process.env.DEV_PASSWORD,
    host: process.env.NODE_ENV === "production" ? process.env.DB_HOST : process.env.DEV_HOST,
    port: Number(process.env.NODE_ENV === "production" ? process.env.DB_PORT : process.env.DEV_PORT),
    pool: {
        max: 10,
        min: 2,
        idle: 10000,
        acquire: 30000,
    },
    models: [ProductOData],
    ssl: process.env.NODE_ENV === "production",
});
```

El DataSource recibe las credenciales directamente desde variables de entorno. La propiedad `models` registra los modelos OData que la librería usará para generar el esquema y procesar las consultas. El flag `ssl` se habilita automáticamente en producción.

## 8.3 Modelos Sequelize (para REST)

Los modelos para REST se definen con el patrón moderno de Sequelize usando genéricos `InferAttributes` e `InferCreationAttributes`. Esto proporciona tipado estricto sin duplicar definiciones de columnas.

```typescript
// src/core/product/model/product.model.ts
import { Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { db, DataTypes } from "../../../common/service/ORM/sequelize.service.js";

interface IProductAttributes {
    id?: number;
    nombre: string;
    precio: number;
    categoria: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ProductModel extends Model<InferAttributes<ProductModel>, InferCreationAttributes<ProductModel>> {
    id: CreationOptional<number>;
    nombre: string;
    precio: number;
    categoria: string;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}

const ProductModel = db.define<ProductModel>("Product", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    categoria: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: "products",
    timestamps: true,
});

export { ProductModel, IProductAttributes };
```

La interface `IProductAttributes` se exporta para ser usada por DTOs y servicios sin depender del modelo directamente. El modelo define `tableName: "products"` y `timestamps: true` para que Sequelize maneje automáticamente `createdAt` y `updatedAt`.

## 8.4 Migraciones vs Sync

| Método | Cuándo usar |
|--------|------------|
| `db.sync()` | Desarrollo, prototipado |
| `umzug` migrations | Producción |
| `drizzle-kit` | Si se migra a Drizzle ORM |

En desarrollo, `db.sync({ alter: true })` permite iterar rápido: cada vez que se inicia el servidor, Sequelize ajusta las tablas existentes al esquema actual. En producción esto es peligroso porque puede causar pérdida de datos o bloqueos. La recomendación es usar migraciones SQL manuales o Sequelize Migrations mediante la librería `umzug`, que permite ejecutar migraciones programáticamente al arrancar la aplicación.

## 8.5 Conexiones Pool

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Express    │────→│  Sequelize   │────→│  PostgreSQL   │
│  App        │     │  (pool 10)   │     │  (max 100)    │
└─────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    │ (comparten pool)
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│ @phrasecode │────→│  Sequelize   │
│ /odata      │     │  (pool 10)   │
└─────────────┘     └──────────────┘
```

**Importante**: `@phrasecode/odata` maneja su propio pool de conexiones a través del DataSource, no reutiliza el pool de Sequelize. Esto significa que la aplicación mantiene dos pools simultáneos hacia la misma base de datos. En producción esto debe considerarse al dimensionar `max_connections` en PostgreSQL (por defecto 100). Si Sequelize usa max 20 y OData usa max 10, se consumen 30 conexiones de las 100 disponibles.

Para entornos con restricciones de conexiones, se puede reducir el pool mínimo a 1 y máximo a 5 en cada lado, o consolidar ambos accesos a través de un pooler externo como PgBouncer.
