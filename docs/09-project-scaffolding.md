# 09 — Andamiaje del Proyecto (odata-server)

## 9.1 Creación del Proyecto

El proyecto `odata-server` se inicializa desde cero con npm:

```bash
mkdir servidor-odata
cd servidor-odata
npm init -y
# Editar package.json: name → "odata-server", type → "module"
npm install @phrasecode/odata express sequelize pg pg-hstore helmet morgan compression cors dotenv reflect-metadata http-status-codes class-validator class-transformer class-transformer-validator bcrypt jsonwebtoken
npm install -D typescript ts-node @types/node @types/express @types/compression @types/cors @types/morgan @types/jsonwebtoken
```

Dependencias clave:
- **Express** — framework HTTP
- **Sequelize + pg** — ORM con PostgreSQL
- **@phrasecode/odata** — middleware OData v4
- **helmet + cors** — seguridad
- **class-validator / class-transformer** — validación de DTOs
- **jsonwebtoken + bcrypt** — autenticación

## 9.2 Scripts (package.json)

```json
"scripts": {
    "dev":   "node --watch --watch-path ./src --loader ts-node --loader ts-node/esm --no-warnings ./server.ts",
    "build": "tsc --build",
    "start": "node ./dist/server.js",
    "clean": "tsc --build --clean"
}
```

| Script | Uso |
|--------|-----|
| `npm run dev` | Desarrollo con hot reload (Node 18+ `--watch` + `ts-node/esm`) |
| `npm run build` | Compilar TypeScript a JS |
| `npm start` | Producción sobre JS compilado |
| `npm run clean` | Limpiar artefactos de compilación |

## 9.3 TypeScript (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "NodeNext",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "strictPropertyInitialization": false,
    "outDir": "./dist",
    "baseUrl": "./",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "declaration": true
  },
  "include": ["./src/", "./server.ts"],
  "exclude": ["./node_modules", "**/*.spec.ts", "./dist"]
}
```

## 9.4 Variables de Entorno (.env)

```
NODE_ENV=development
PORT=3000

# Dev DB (PostgreSQL — usada cuando NODE_ENV != "production")
DEV_DIALECT=postgres
DEV_HOST=localhost
DEV_PORT=5432
DEV_USERNAME=postgres
DEV_PASSWORD=secret
DEV_DB=odata_dev

# Prod DB
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secret
DB=odata_prod

# JWT Secret
SECRET_KEY=your-secret-key-here
```

Las variables con prefijo `DEV_` se usan en desarrollo; las prefijadas con `DB_` en producción. El archivo `.env` no se versiona; en su lugar se provee `.env.example`.

## 9.5 Estructura Completa de Carpetas

```
servidor-odata/
├── docs/                          # Documentación
├── src/
│   ├── main.ts                    # Express app factory
│   ├── common/                    # Shared Kernel
│   │   ├── dto/
│   │   │   └── base.dto.ts
│   │   ├── exception/
│   │   │   ├── http.exception.ts
│   │   │   ├── notfound.exception.ts
│   │   │   ├── conflict.exception.ts
│   │   │   ├── database.exception.ts
│   │   │   └── json-validator.exception.ts
│   │   ├── helper/
│   │   │   ├── nestjs/            # mapped-types (OmitType, PartialType, PickType, IntersectionType)
│   │   │   ├── cast.helper.ts
│   │   │   ├── customValidators.helper.ts
│   │   │   └── useful.helper.ts
│   │   ├── interface/
│   │   │   ├── api-response.interface.ts
│   │   │   ├── base-controller.interface.ts
│   │   │   ├── base-query.interface.ts
│   │   │   ├── base-service.interface.ts
│   │   │   └── error-api-response.interface.ts
│   │   ├── middleware/
│   │   │   ├── global-error.middleware.ts
│   │   │   ├── json-validator.middleware.ts
│   │   │   ├── odata-context.middleware.ts
│   │   │   └── security.middleware.ts
│   │   ├── model/
│   │   │   └── base.model.ts
│   │   ├── router/
│   │   │   └── global.router.ts
│   │   ├── service/
│   │   │   ├── ORM/
│   │   │   │   ├── sequelize.service.ts
│   │   │   │   └── models/
│   │   │   │       └── main.model.ts
│   │   │   └── odata/
│   │   │       ├── datasource.ts
│   │   │       ├── odata.service.ts
│   │   │       ├── models/
│   │   │       │   └── product.odata.model.ts
│   │   │       └── controllers/
│   │   │           └── product.odata.controller.ts
│   │   └── type/
│   │       └── express.d.ts
│   ├── core/                       # Módulos de dominio
│   │   └── product/
│   │       ├── main.ts
│   │       ├── route/
│   │       ├── controller/
│   │       ├── service/
│   │       ├── model/
│   │       ├── dto/
│   │       ├── interface/
│   │       └── query/
│   └── main.ts
├── server.ts                       # Punto de entrada
├── tsconfig.json
├── package.json
└── .env.example
```

## 9.6 Bootstrap (server.ts → src/main.ts)

### server.ts — Punto de entrada

```typescript
import http from "node:http";
import { Express } from "express";
import expressApp from "./src/main.js";
import { db } from "./src/common/service/ORM/sequelize.service.js";

const PORT: number = Number(process.env.PORT) || 3000;
const server: http.Server = http.createServer();
const app: Express = expressApp();

const initServer = async () => {
    try {
        await db.authenticate()
            .then(() => console.log("database is authenticated"));
        await db.sync({ alter: true })
            .then(() => console.log("database is synced"));
    } catch (err) {
        return console.log(err, "database connection failed — server will not start.");
    }
    server.on("request", app);
    server.listen(PORT, () => {
        console.log("Server listening on port %d", PORT);
    });
};

initServer();
```

### src/main.ts — Fábrica Express

```typescript
import morgan from "morgan";
import express, { Express } from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import { config } from "dotenv";

config();
import "reflect-metadata";

import { GlobalRouter } from "./common/router/global.router.js";
import { GlobalErrorMiddleware } from "./common/middleware/global-error.middleware.js";
import { oDataExpressApp } from "./common/service/odata/odata.service.js";

export default function () {
    const app: Express = express();

    const corsOptions = {
        exposedHeaders: ["OData-Version"],
    };

    app.use(helmet());
    app.use(cors(corsOptions));

    app.use(
        "/odata",
        (req, res, next) => {
            if (req.path.includes("$metadata")) req.url = "/$metadata";
            res.set("OData-Version", "4.0");
            next();
        },
        oDataExpressApp,
    );

    app.use(express.json());
    app.use(compression());

    if (process.env.NODE_ENV === "development") {
        app.use(morgan("dev"));
    } else {
        app.use(morgan("combined"));
    }

    app.use("/api", GlobalRouter);
    app.use(GlobalErrorMiddleware.globalErrorHandler());

    return app;
}
```

### Flujo de inicialización

1. `dotenv.config()` carga variables de entorno
2. `db.authenticate()` verifica la conexión a PostgreSQL
3. `db.sync({ alter: true })` sincroniza modelos (solo desarrollo)
4. Se configura middleware global: `helmet`, `cors`, `compression`, `morgan`, parseo JSON
5. Se monta OData v4 en `/odata` con header `OData-Version: 4.0`
6. Se registran las rutas REST de los dominios bajo `/api`
7. Se registra el manejador global de errores
8. `server.listen(PORT)` inicia el servidor HTTP
