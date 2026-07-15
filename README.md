# odata-server

Servidor backend Node.js/TypeScript que expone una API REST para operaciones CRUD y un endpoint **OData v4** para consultas, sobre PostgreSQL. Sigue una arquitectura **Modular Monolith con Shared Kernel**.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20 + TypeScript 5.9 (ESM, NodeNext) |
| Framework | Express 4 |
| ORM (REST) | Sequelize 6 |
| OData | `@phrasecode/odata` v0.3.1 |
| BD | PostgreSQL |
| Validación | `class-validator` / `class-transformer` |
| Auth | bcrypt + JWT |
| Tests | Vitest + supertest |
| Paquete | pnpm 9 |

---

## Arquitectura

```
src/
├── common/                    # Shared Kernel (infraestructura transversal)
│   ├── config/                # Configuración centralizada (env, DB, etc.)
│   ├── exception/             # Clases de error (HttpException, NotFound, etc.)
│   ├── helper/                # Utilidades (type guards, mapped-types NestJS-like)
│   ├── interface/             # Interfaces base (ApiResponse, BaseService, etc.)
│   ├── middleware/            # Middleware global (error handler, validación, seguridad)
│   ├── model/                 # Clases base
│   ├── dto/                   # Clases base
│   ├── router/                # Router global que agrega dominios
│   └── service/
│       ├── ORM/               # Singleton Sequelize
│       └── odata/             # DataSource, ExpressRouter, modelos y controladores OData
├── core/                      # Módulos de dominio
│   ├── main.ts                # Agrega routers de todos los dominios
│   └── <dominio>/             # Un módulo por dominio de negocio
│       ├── interface/         # Shape de la entidad
│       ├── model/             # Modelo Sequelize (db.define)
│       ├── dto/               # DTOs de validación (class-validator)
│       ├── service/           # Lógica de negocio
│       ├── controller/        # Handlers Express
│       ├── route/             # Definición de rutas REST
│       └── query/             # SQL nativo (opcional)
├── __tests__/
│   ├── unit/                  # Tests unitarios (reflejan estructura de src/)
│   └── integration/           # Tests de integración (API endpoints)
├── main.ts                    # Fábrica de la app Express
server.ts                      # Entry point (autentica BD, sincroniza, inicia server)
```

### Principios

- **REST para escritura** (POST/PUT/DELETE) en `/api/core/*`
- **OData para lectura** (GET) en `/odata/*` — CQRS ligero
- **Separación de modelos**: Sequelize `db.define` para REST, clases decoradas con `@Table`/`@Column` para OData
- **Singleton por módulo**: servicios y controladores son `const` exportados (cache del módulo ES)
- **Inyección de dependencias manual**: el middleware de seguridad acepta callbacks en lugar de hardcodear modelos

---

## Requisitos

- **Node.js** 20.18.0 (ver `.nvmrc`)
- **pnpm** >= 9.0.0
- **PostgreSQL** (local o Docker)

---

## Inicio rápido

```bash
# 1. Clonar
git clone <repo>
cd servidor-odata

# 2. Instalar dependencias
pnpm install

# 3. Crear base de datos en PostgreSQL
#    (usando psql, pgAdmin o el cliente que prefieras)
CREATE DATABASE odata_dev;

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env si tus credenciales son distintas

# 5. Iniciar en modo desarrollo
pnpm dev
```

El servidor arranca en `http://localhost:3000`.

---

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Desarrollo con hot-reload (`ts-node --watch`) |
| `pnpm build` | Compila TypeScript a `dist/` |
| `pnpm start` | Ejecuta la compilación de producción |
| `pnpm test` | Ejecuta todos los tests |
| `pnpm test:watch` | Tests en modo watch |
| `pnpm test:coverage` | Tests con reporte de cobertura |

---

## Variables de entorno

Ver `.env.example` para valores de referencia:

| Variable | Descripción | Default |
|---|---|---|
| `NODE_ENV` | `development` o `production` | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `DEV_HOST` / `DEV_PORT` | Host/puerto BD en desarrollo | `localhost` / `5432` |
| `DEV_USERNAME` / `DEV_PASSWORD` | Credenciales BD desarrollo | `postgres` / `secret` |
| `DEV_DB` | Nombre BD desarrollo | `odata_dev` |
| `DB_HOST` / `DB_PORT` | Host/puerto BD producción | `localhost` / `5432` |
| `DB_USERNAME` / `DB_PASSWORD` | Credenciales BD producción | `postgres` / `secret` |
| `DB` | Nombre BD producción | `odata_prod` |
| `SECRET_KEY` | Clave para firmar JWT | `change-me` |

> **Nota:** En producción, `NODE_ENV=production` activa SSL para la conexión a la BD y logging combinado (morgan).

---

## API

### REST — `/api/core/products`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/core/products` | Listar todos los productos |
| `GET` | `/api/core/products/:id` | Obtener un producto por ID |
| `POST` | `/api/core/products` | Crear un producto (body JSON validado) |
| `PUT` | `/api/core/products/:id` | Actualizar un producto |
| `DELETE` | `/api/core/products/:id` | Eliminar un producto |

Ejemplo de creación:

```bash
curl -X POST http://localhost:3000/api/core/products \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Teclado","precio":200,"categoria":"Periféricos"}'
```

### OData — `/odata`

| Ruta | Descripción |
|---|---|
| `GET /odata/$metadata` | Metadatos del servicio OData v4 (CSDL+JSON) |
| `GET /odata/product-odata` | Query OData sobre productos (colección) |
| `GET /odata/product-odata/:id` | Registro individual por clave (Fase A) |
| `GET /odata/product-odata/$count` | Total de registros (`text/plain`), respeta `$filter` (Fase B) |
| `GET /odata/product-odata?$expand=category` | Expansión de navegación `product → category` (Fase D) |
| `GET /odata/category-odata?$expand=products` | Expansión de navegación `category → products` (Fase D) |
| `GET /odata/category-odata?$expand=products($select=id,nombre)` | Recorte de navegación: `$select` sobre hijos (Fase G) |
| `GET /odata/category-odata?$expand=products($filter=precio gt 100)` | Recorte de navegación: `$filter` sobre hijos (Fase G) |
| `GET /odata/category-odata?$expand=products($orderby=nombre;$top=2;$skip=1)` | Recorte de navegación: `$orderby`/`$top`/`$skip` sobre hijos (Fase G) |
| `GET /odata/product-odata?$expand=category($select=id,nombre)` | Recorte de navegación `belongsTo` (Fase G) |
| `POST /odata/$batch` | `$batch` de solo lectura (multipart/mixed) (Fase C.2) |

> **Naming de endpoints:** el nombre en `/odata/<nombre>` se genera en kebab-case a partir del nombre de la clase (p.ej. `ProductOData` → `/odata/product-odata`). El `$Endpoint` del `$metadata` usa el mismo `getEndpoint()`, por lo que ruta y metadata coinciden y SAPUI5 resuelve las URLs correctamente.

Ejemplo de consulta OData:

```bash
# OData estándar
curl "http://localhost:3000/odata/product-odata?\$top=10&\$orderby=precio desc"

# Acceso por clave + conteo + expansión de navegación
curl "http://localhost:3000/odata/product-odata/1"
curl "http://localhost:3000/odata/product-odata/\$count?\$filter=precio gt 100"
curl "http://localhost:3000/odata/product-odata?\$expand=category"

# Solo lectura permitida (GET) en las entidades; escrituras por REST o \$batch con groupId "$direct"
```

---

## Cómo agregar un nuevo módulo REST

### 1. Crear la estructura del dominio

```
src/core/<dominio>/
├── interface/<entidad>.interface.ts
├── model/<entidad>.model.ts
├── dto/<entidad>.dto.ts
├── service/<entidad>.service.ts
├── controller/<entidad>.controller.ts
├── route/<entidad>.route.ts
└── main.ts
```

### 2. Definir la entidad

```typescript
// interface/product.interface.ts
export interface IProduct {
    id?: number;
    nombre: string;
    precio: number;
    categoria: string;
}
```

### 3. Definir el modelo Sequelize

```typescript
// model/product.model.ts
import { Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { db, DataTypes } from "../../../common/service/ORM/sequelize.service.js";
import { IProduct } from "../interface/product.interface.js";

interface ProductModel extends Model<InferAttributes<ProductModel>, InferCreationAttributes<ProductModel>>, IProduct {
    id: CreationOptional<number>;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}

export const ProductModel = db.define<ProductModel>("Product", {
    id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre:   { type: DataTypes.STRING, allowNull: false },
    precio:   { type: DataTypes.DECIMAL, allowNull: false },
    categoria:{ type: DataTypes.STRING, allowNull: false },
}, { tableName: "products", timestamps: true });
```

### 4. Crear DTOs de validación

```typescript
// dto/product.dto.ts
import { IsString, IsNumber, Min } from "class-validator";
import { IProduct } from "../interface/product.interface.js";

export class ProductCreateDTO implements IProduct {
    @IsString() nombre!: string;
    @IsNumber() @Min(0) precio!: number;
    @IsString() categoria!: string;
    id?: number;
}
```

### 5. Servicio, controlador, rutas

Sigue el patrón de `src/core/product/` como referencia: el servicio implementa `BaseService`, el controlador delega en el servicio y usa `next(error)` para errores, las rutas usan `ValidatorMiddleware.validateBodyWithDTO`.

### 6. Registrar en core/main.ts

```typescript
import { Router } from "express";
import { productRouter } from "./product/route/product.route.js";

export const CoreRouter = Router();
CoreRouter.use("/products", productRouter);
```

Luego en `src/core/main.ts` se monta `CoreRouter` con los demás dominios.

---

## Cómo agregar una entidad OData

### 1. Crear el modelo OData

```typescript
// src/common/service/odata/models/<entidad>.odata.model.ts
import { Model, Table, Column, DataTypes } from "@phrasecode/odata";

@Table({ tableName: "productos" })
export class MiEntidadOData extends Model<MiEntidadOData> {
    @Column({ dataType: DataTypes.INTEGER, isPrimaryKey: true, isAutoIncrement: true })
    id!: number;
    @Column({ dataType: DataTypes.STRING })
    nombre!: string;
    // ... más columnas
}
```

### 2. Crear el controlador OData

```typescript
// src/common/service/odata/controllers/<entidad>.odata.controller.ts
import { ODataControler } from "@phrasecode/odata";
import { MiEntidadOData } from "../models/<entidad>.odata.model.js";

export class MiEntidadODataController extends ODataControler {
    constructor() {
        super({ model: MiEntidadOData, allowedMethod: ["get"] });
        this.setMaxTop(100);
    }
}
```

### 3. Registrar en odata.service.ts

```typescript
import { MiEntidadODataController } from "./controllers/<entidad>.odata.controller.js";
// ...
const oDataExpressApp = ExpressRouter.create({
    dataSource,
    controllers: [ProductODataController, MiEntidadODataController],
    // ...
});
```

> El nombre del endpoint en `/odata/<nombre>` se genera automáticamente a partir del nombre de la clase en kebab-case. Por ejemplo, `ProductOData` → `/odata/product-odata`.

---

## Testing

```bash
pnpm test                    # Todos los tests
pnpm test:watch              # Modo watch
pnpm test:coverage           # Con cobertura
```

- **Unitarios**: en `src/__tests__/unit/`, reflejan la estructura de `src/`. Mockean dependencias.
- **Integración**: en `src/__tests__/integration/`, ejercitan la API real con supertest.
- **Setup global**: `src/__tests__/setup.ts` carga variables de entorno y `reflect-metadata`.

---

## Docker

El proyecto incluye `docker-compose.yml` para levantar el stack completo con un solo comando:

```bash
docker compose up -d
```

Esto inicia:
- **`db`**: PostgreSQL
- **`api`**: El servidor odata-server
- **`pgadmin`**: Interfaz gráfica para administrar la BD en `http://localhost:5050`

Ver la sección [Docker](docs/14-docker-guide.md) para más detalles.

---

## Issues conocidos

### `@phrasecode/odata` v0.3.1 — parches aplicados

La librería se parchea en runtime/build vía `scripts/patch-odata.mjs` (idempotente, se aplica en `postinstall` y al iniciar `pnpm dev`). Los parches cubren:

1. **SSL en desarrollo**: el `SequelizerAdaptor` siempre creaba `dialectOptions.ssl`, forzando SSL incluso contra PostgreSQL local. Se cambió a `ssl` solo si `dbConfig.ssl` está presente (producción).
2. **Rutas OData**: `ExpressRouter.setUpODataRouters` se reemplaza para añadir `GET /:id` (Fase A) y `GET /$count` (Fase B), con decodificación correcta del query string (`decodeURIComponent`).

Si actualizas la librería, verifica que los parches sigan siendo necesarios (marcador `// PATCHED-COUNT-v3`).

### Compatibilidad SAPUI5/OpenUI5 (v1.1.0)

Las fases A–D del plan `docs/14-sapui5-compatibility-plan.md` añaden las features que SAPUI5/OpenUI5 OData v4 espera y que la librería no trae de serie:

- Acceso por clave, `/$count`, `/$batch` de lectura (Fases A–C).
- Navigation properties (`$expand`) vía decoradores `@BelongsTo`/`@HasMany` (Fase D).

**Pendientes investigados antes del merge (resueltos como no-bloqueantes):**

- **Naming en `$metadata`**: se verificó empíricamente que el `$Endpoint` emitido (`/product-odata`, `/category-odata`) coincide con la ruta kebab registrada por el router. No hay discrepancia que afecte a SAPUI5.
- **`$count` + `$expand` combinados**: la combinación que SAPUI5 emite (`?$expand=category&$count=true`) funciona correctamente (devuelve `@odata.count` + la expansión anidada). El error `Unsupported relation type for $count` de `adaptors/sequelizer.js` es inalcanzable con las relaciones definidas; solo fallan usos avanzados no emitidos por SAPUI5 (p.ej. `$filter=category/$count gt 0`), fuera de alcance para v1.1.0.

### `pg` v16 no existe

En `package.json` se usa `pg@^8.22.0`. La versión `16.x` no existe en el registro npm.

---

## Documentación adicional

La carpeta `docs/` contiene guías detalladas sobre decisiones técnicas y procedimientos:

| Documento | Contenido |
|---|---|
| `01-odata-architecture-reference.md` | Arquitectura OData del proyecto |
| `02-dependency-research.md` | Investigación de librerías OData |
| `03-orm-analysis.md` | Análisis de ORMs (Sequelize vs otros) |
| `04-architecture-adaptation.md` | Adaptación Modular Monolith + OData |
| `05-odata-module-pattern.md` | Patrón para módulos OData |
| `06-rest-vs-odata-separation.md` | CQRS ligero REST/OData |
| `07-security-middleware-setup.md` | Configuración de seguridad (Helmet, CORS, JWT) |
| `08-database-setup.md` | Configuración de Sequelize + PostgreSQL |
| `10-best-practices-checklist.md` | Checklist de mejores prácticas |
| `11-example-module-product.md` | Ejemplo completo del módulo Product |
| `12-example-custom-odata-query.md` | Consultas OData personalizadas |
| `13-sapui5-integration-guide.md` | Guía de integración con SAPUI5/OpenUI5 |
