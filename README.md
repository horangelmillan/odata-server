# odata-server

Servidor backend Node.js/TypeScript que expone **OData v4** como único protocolo (lectura **y** escritura) sobre PostgreSQL, siguiendo una arquitectura **Modular Monolith con Shared Kernel**. No hay capa REST: OData es el dominio único y fuente de verdad de la API.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22 + TypeScript 5.9 (ESM, NodeNext) |
| Framework | Express 4 (solo como host del router OData + middleware transversal) |
| OData | `@phrasecode/odata` v0.3.1 (fuente de verdad del contrato de API **y** del modelo/ORM) |
| BD | PostgreSQL (motor interno del `DataSource` OData, que usa Sequelize de forma transparente) |
| Validación | `class-validator` / `class-transformer` |
| Auth | bcrypt + JWT |
| Tests | Vitest + supertest |
| Paquete | pnpm 9 |

---

## Arquitectura

```
src/
├── common/                    # Shared Kernel (infraestructura transversal, 100% genérico — cero imports de core)
│   ├── config/                # Configuración centralizada (env, DB, validación prod fail-fast)
│   ├── exception/             # Clases de error (HttpException, NotFound, etc.)
│   ├── helper/                # Utilidades (type guards, mapped-types NestJS-like)
│   ├── interface/             # Interfaces base (ApiResponse, BaseService, DomainRegistration, etc.)
│   ├── middleware/            # Middleware global (error handler, auth, healthz, validación)
│   ├── model/                 # Clases base
│   ├── dto/                   # Clases base
│   └── service/
│       └── odata/             # Kernel OData transversal: DataSource factory, router, escritura, etc.
│           ├── datasource.ts        # createDataSource(models) — factory; la instancia Sequelize vive aquí
│           ├── odata-runtime.ts     # Puente CJS → build CJS de @phrasecode/odata (arranque prod, ciclo 16 F3)
│           ├── odata.service.ts     # createODataExpressApp(registrations, dataSource) — factory (ciclo 16 F1)
│           ├── odata-write.*.ts    # Escritura directa y servicios de persistencia
│           ├── odata-metadata.ts   # $metadata CSDL 4.01 (compat SAPUI5)
│           ├── odata-format.ts     # Negociación de $format
│           ├── odata-etag.ts       # @odata.etag / concurrencia optimista
│           ├── odata-error.ts      # Errores OData v4 estándar
│           └── migrations/         # 001-baseline.ts (snapshot histórico congelado, ciclo 16 F1)
├── core/                      # Módulos de dominio (demo, finance ×10, auth)
│   ├── main.ts                # domainRegistrations[]: registro de dominios (modelos + controladores + migraciones)
│   └── <dominio>/             # Un módulo por dominio de negocio
│       ├── interface/         # Shape de la entidad
│       ├── model/             # Modelo OData (clases @Table/@Column decoradas)
│       ├── dto/               # DTOs de validación (class-validator)
│       ├── service/           # Lógica de negocio (opcional)
│       ├── controller/        # Controladores OData (extienden ODataControler)
│       └── migrations/        # Migraciones del dominio (finance: 002/003; auth: 004)
├── __tests__/
│   ├── unit/                  # Tests unitarios (reflejan estructura de src/)
│   └── integration/           # Tests de integración (endpoints /odata)
├── main.ts                    # Fábrica de la app Express (composición + seguridad por entorno)
server.ts                      # Entry point (compone datasource + migraciones + inicia server)
```

### Principios

- **OData-as-domain**: un solo protocolo expuesto en `/odata/*` cubre lectura (GET) y escritura (POST/PATCH/PUT/DELETE vía `$batch` y modo `$direct`).
- **Fuente de verdad única**: los modelos OData (`@Table`/`@Column`) son los únicos modelos. La instancia Sequelize vive dentro del `dataSource` (`dataSource.sequelizerAdaptor.sequelize`) y es la única usada para persistencia.
- **Modularidad estricta (ciclo 16 F1)**: `common/` es 100% genérico — **cero imports de `core/`** (gate estructural en CI). La composición de dominios (modelos, controladores, migraciones) ocurre únicamente en el bootstrap (`server.ts` + `main.ts`) a partir de `domainRegistrations[]`. Eliminar/cambiar un dominio no rompe `common`.
- **Migraciones por dominio (ciclo 16 F1)**: cada registro de dominio entrega sus migraciones; el migrator usa una lista explícita `KernelMigration[]` (sin glob ni `file://`) que funciona igual en dev (`.ts`) y dist (`.js`).
- **Seguridad por entorno (ciclo 16 F2)**: `development`/`test` → modo abierto (sin auth, cero fricción); `production` → modo estricto (fail-fast de entorno, JWT Bearer en `/odata`, CORS por `CORS_ORIGIN`, rate-limit en escrituras).
- **Sin capa REST**: no hay routers, controladores ni modelos `db.define` REST; `core/main.ts` solo registra los dominios OData.
- **Singleton por módulo**: servicios y controladores son `const` exportados (cache del módulo ES).
- **Inyección de dependencias manual**: el datasource se registra en bootstrap (`registerDataSource`) y los write services lo consumen vía `getDataSource()` (error claro si no se enlazó).

---

## Requisitos

- **Node.js** 22.20.0 (ver `.nvmrc`)
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
| `pnpm seed` | Seed idempotente del ecosistema financiero |
| `pnpm seed:demo` | Seed del dominio demo (5 categorías, 20 productos) |
| `pnpm seed:auth` | Usuario admin de prueba dev (`AUTH_DEV_USERNAME`/`AUTH_DEV_PASSWORD`, default `admin`/`admin1234`) |
| `pnpm auth:create-user` | Crea/actualiza un usuario (password desde `AUTH_PASSWORD`/prompt, nunca en código) |
| `pnpm db:reset` | DROP + CREATE + sync + seed financiero + seed auth |
| `pnpm build` | Compila TypeScript a `dist/` |
| `pnpm start` | Ejecuta la compilación de producción (`node dist/server.js`) |
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
| `SECRET_KEY` | Clave para firmar JWT | **sin default** (prod fail-fast: ≥32 chars) |
| `CORS_ORIGIN` | Origen permitido en producción | **sin default** (prod fail-fast) |
| `DB_SSL` | Habilita SSL en la conexión a BD (prod) | `true` (desactívalo en stacks locales) |

> **Modo abierto vs estricto (ciclo 16 F2):** con `NODE_ENV=development|test` el
> servidor arranca abierto (sin auth ni rate-limit). Con `NODE_ENV=production`
> **aborta al arrancar** si falta `SECRET_KEY` (≥32 chars) o `CORS_ORIGIN`; exige
> `Authorization: Bearer <jwt>` en `/odata` (salvo `$metadata`), restringe CORS a
> `CORS_ORIGIN` y limita las escrituras a 100/15min por IP. En producción `DB_SSL`
> activa SSL para la BD (p.ej. `DB_SSL=false` en el compose local).
> Usuarios: `pnpm auth:create-user` (password desde entorno) + `POST /auth/login`.

---

## API

### OData — `/odata` (único protocolo expuesto)

| Ruta | Descripción |
|---|---|
| `GET /healthz` | Liveness público (todos los entornos): ping BD + uptime → `200 {status:"ok",db:"up"}` o `503` (ciclo 16 F2) |
| `POST /auth/login` | `{ username, password }` → `{ token }` JWT (bcrypt; público; 401 genérico si credenciales inválidas) (ciclo 16 F2) |
| `GET /odata/$metadata` | Metadatos del servicio OData v4 (CSDL+JSON) — público también en prod |
| `GET /odata/product-odata` | Query OData sobre productos (colección) |
| `GET /odata/product-odata/:id` | Registro individual por clave (Fase A) |
| `GET /odata/product-odata/$count` | Total de registros (`text/plain`), respeta `$filter` (Fase B) |
| `GET /odata/product-odata?$expand=category` | Expansión de navegación `product → category` (Fase D) |
| `GET /odata/category-odata?$expand=products` | Expansión de navegación `category → products` (Fase D) |
| `GET /odata/category-odata?$expand=products($select=id,nombre)` | Recorte de navegación: `$select` sobre hijos (Fase G) |
| `GET /odata/category-odata?$expand=products($filter=precio gt 100)` | Recorte de navegación: `$filter` sobre hijos (Fase G) |
| `GET /odata/category-odata?$expand=products($orderby=nombre;$top=2;$skip=1)` | Recorte de navegación: `$orderby`/`$top`/`$skip` sobre hijos (Fase G) |
| `GET /odata/product-odata?$expand=category($select=id,nombre)` | Recorte de navegación `belongsTo` (Fase G) |
| `POST /odata/$batch` | `$batch` lectura y escritura (multipart/mixed); changesets atómicos con `Content-ID` (Fases C.2 + H) |
| `POST /odata/product-odata` | Alta directa de entidad (modo `$direct` de SAPUI5) → `201` + `Location` (Fase H) |
| `PATCH/PUT /odata/product-odata/:id` | Modificación directa por clave → `200` (Fase H) |
| `DELETE /odata/product-odata/:id` | Baja directa por clave → `204` (Fase H) |
| `GET /odata/product-odata?$format=json` | Negociación de `$format`: JSON se acepta; otro formato → `415` (Fase I) |
| `GET /odata/*` (lecturas) | Inyecta `@odata.etag` (ISO 8601 desde `updatedAt`) en cada entidad y navegación para concurrencia optimista de SAPUI5 (Fase X) |
| `PATCH/PUT/DELETE /odata/*` (escritura directa y `$batch`) | Valida `If-Match`; desajuste → `412 Precondition Failed`; el etag rota en cada update (Fase X) |
| Errores OData (escritura directa, `$batch` y lectura) | Formato OData v4 estándar `{ error: { code, message, target?, details[] } }` que SAPUI5 `MessageManager` parsea (Fase G2) |

> **Tipos EDM y `$format` (Fase I):** el `$metadata` tipa `precio` como `Edm.Decimal` (pg lo devuelve como
> string, compat `IEEE754Compatible`) y las fechas de auditoría (`createdAt`/`updatedAt`) como
> `Edm.DateTimeOffset`, serializadas en **ISO 8601** (compat con ODataModel v4). `$format=json`
> (o `application/json`) se acepta —se ignora, ya que la respuesta es JSON por defecto— y cualquier otro
> formato responde `415 Unsupported Media Type`, tanto en peticiones directas como dentro de `$batch`.

> **Escritura OData (Fase H):** el `$batch` procesa **changesets atómicos** (`multipart/mixed`): todo el
> changeset se ejecuta en una transacción (`db.transaction()`) y hace rollback completo ante cualquier
> fallo. Soporta referencias `Content-ID` (`$1`) para deep-create y devuelve `Location` en el `201`.
> Los `GET` envueltos en un changeset (como los emite SAPUI5) se resuelven como lectura. La escritura
> reutiliza la misma instancia Sequelize del datasource; no delega en los servicios REST.

> **Naming de endpoints:** el nombre en `/odata/<nombre>` se genera en kebab-case a partir del nombre de la clase (p.ej. `ProductOData` → `/odata/product-odata`). El `$Endpoint` del `$metadata` usa el mismo `getEndpoint()`, por lo que ruta y metadata coinciden y SAPUI5 resuelve las URLs correctamente.

Ejemplo de consulta OData:

```bash
# OData estándar
curl "http://localhost:3000/odata/product-odata?\$top=10&\$orderby=precio desc"

# Acceso por clave + conteo + expansión de navegación
curl "http://localhost:3000/odata/product-odata/1"
curl "http://localhost:3000/odata/product-odata/\$count?\$filter=precio gt 100"
curl "http://localhost:3000/odata/product-odata?\$expand=category"

# Escritura OData: changeset atómico vía $batch, o escritura directa por entidad (groupId "$direct")
curl -X POST "http://localhost:3000/odata/category-odata" -H "Content-Type: application/json" -d '{"nombre":"Nueva"}'
```

---

---

## Ecosistema financiero simulado (S/4HANA)

El proyecto incluye 8 dominios financieros en `src/core/finance/` expuestos bajo `/odata/finance/`:

| Entidad | Endpoint OData | Navegaciones `$expand` |
|---------|---------------|----------------------|
| Company | `/odata/finance/company-odata` | customers, invoices |
| Customer | `/odata/finance/customer-odata` | company, invoices |
| Supplier | `/odata/finance/supplier-odata` | supplierInvoices |
| GlAccount | `/odata/finance/glaccount-odata` | items |
| Invoice | `/odata/finance/invoice-odata` | customer, company, items |
| SupplierInvoice | `/odata/finance/supplierinvoice-odata` | supplier |
| InvoiceItem | `/odata/finance/invoiceitem-odata` | invoice, glAccount |
| Payment | `/odata/finance/payment-odata` | invoice |

Estados de factura: `PENDIENTE`, `PAGADA`, `VENCIDA` (vencimiento = `fecha + 30 días`).

Seed determinista: `pnpm seed` o `pnpm db:reset` recrea exactamente el mismo dataset
(PRNG sembrado + fecha de referencia fija `2026-07-15`; ver `docs/02-patrones/16-financial-module.md` §16.5):
1 sociedad, 12 clientes, 6 proveedores, 10 cuentas, 150 facturas (90/37/23
PAGADA/PENDIENTE/VENCIDA), 20 facturas de proveedor, ~387 líneas y ~104 pagos.

---

## Cómo agregar un nuevo dominio OData

> La capa REST fue eliminada en la Fase F3 del refactor `docs/05-refactor-odata-as-domain`. No hay `route/`, `controller/` REST ni modelos `db.define`. Todo el dominio se modela como OData.

### 1. Crear la estructura del dominio

```
src/core/<dominio>/
├── interface/<entidad>.interface.ts
├── model/<entidad>.odata.model.ts
├── dto/<entidad>.dto.ts
├── service/<entidad>.service.ts   # opcional (lógica de negocio)
├── controller/<entidad>.odata.controller.ts
└── main.ts
```

### 2. Definir la entidad

```typescript
// interface/<entidad>.interface.ts
export interface IMiEntidad {
    id?: number;
    nombre: string;
}
```

### 3. Definir el modelo OData (única fuente de verdad)

```typescript
// model/<entidad>.odata.model.ts
import { Model, Table, Column, DataTypes } from "@phrasecode/odata";

@Table({ tableName: "mi_entidad" })
export class MiEntidadOData extends Model<MiEntidadOData> {
    @Column({ dataType: DataTypes.INTEGER, isPrimaryKey: true, isAutoIncrement: true })
    id!: number;
    @Column({ dataType: DataTypes.STRING })
    nombre!: string;
}
```

### 4. Crear DTOs de validación (escritura)

```typescript
// dto/<entidad>.dto.ts
import { IsString } from "class-validator";
import { IMiEntidad } from "../interface/<entidad>.interface.js";

export class MiEntidadCreateDTO implements IMiEntidad {
    @IsString() nombre!: string;
    id?: number;
}
```

### 5. Crear el controlador OData y registrar en `core/main.ts`

```typescript
// controller/<entidad>.odata.controller.ts
import { ODataControler } from "@phrasecode/odata";
import { MiEntidadOData } from "../model/<entidad>.odata.model.js";

export class MiEntidadODataController extends ODataControler {
    constructor() {
        super({ model: MiEntidadOData, allowedMethod: ["get"] });
        this.setMaxTop(100);
    }
}
```

```typescript
// core/main.ts — domainRegistrations[]: registra el dominio (modelo + controlador + migraciones)
import { MiEntidadOData, MiEntidadODataController } from "./<dominio>/main.js";
export { MiEntidadOData, MiEntidadODataController };
```

El dominio se declara en el registro de `core/main.ts` (`domainRegistrations[]`), y el
**bootstrap** (`server.ts`) compone: `createDataSource(registrations.map(r => r.model))` +
`createODataExpressApp(registrations, dataSource)` (ciclo 16 F1). El modelo/controlador
jamás se importa desde `common/`.

---

## Cómo agregar una entidad OData (OData-first)

> Todo el dominio vive en `src/core/<dominio>/`. `common/service/odata/` es shared kernel
> (infraestructura OData transversal: `DataSource`, factory `ExpressRouter`, escritura base,
> etag, errores, metadata, formato). Nunca coloques modelos o controladores de dominio ahí.

### 1. Crear el modelo OData (fuente de verdad, en el dominio)

```typescript
// src/core/<dominio>/model/<entidad>.odata.model.ts
import { Model, Table, Column, DataTypes } from "@phrasecode/odata";

@Table({ tableName: "mi_entidad" })
export class MiEntidadOData extends Model<MiEntidadOData> {
    @Column({ dataType: DataTypes.INTEGER, isPrimaryKey: true, isAutoIncrement: true })
    id!: number;
    @Column({ dataType: DataTypes.STRING })
    nombre!: string;
    // ... más columnas
}
```

### 2. Crear el DTO y el controlador OData (en el dominio)

```typescript
// src/core/<dominio>/dto/<entidad>.dto.ts
import { IsString } from "class-validator";
export class MiEntidadCreateDTO {
    @IsString() nombre!: string;
}
```

```typescript
// src/core/<dominio>/controller/<entidad>.odata.controller.ts
import { ODataControler } from "@phrasecode/odata";
import { MiEntidadOData } from "../model/<entidad>.odata.model.js";

export class MiEntidadODataController extends ODataControler {
    constructor() {
        super({ model: MiEntidadOData, allowedMethod: ["get", "post", "put", "delete"] });
        this.setMaxTop(100);
    }
}
```

### 3. Exportar en `src/core/<dominio>/main.ts` y declararlo en el registro de dominios

```typescript
// src/core/<dominio>/main.ts
import { MiEntidadOData } from "./model/<entidad>.odata.model.js";
import { MiEntidadODataController } from "./controller/<entidad>.odata.controller.js";
export { MiEntidadOData, MiEntidadODataController };
```

```typescript
// core/main.ts — se añade el dominio a domainRegistrations[]
{
    name: "miEntidad",
    model: MiEntidadOData,
    controller: MiEntidadODataController,
    migrations: [], // o las migraciones del dominio (ver ciclo 16 F1)
}
```

> El bootstrap (`server.ts` + `main.ts`) compone el datasource y el router OData desde
> `domainRegistrations[]` (ciclo 16 F1): `createDataSource(registrations.map(r => r.model))`
> y `createODataExpressApp(registrations, dataSource)`. `common/` no importa el dominio.
> El nombre del endpoint en `/odata/<nombre>` se genera automáticamente a partir del nombre de la
> clase en kebab-case. Por ejemplo, `MiEntidadOData` → `/odata/mi-entidad-odata`.

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

> `docker-compose.yml` es el entorno de **desarrollo**. Para producción usa
> `docker-compose.prod.yml` (stage `production` del Dockerfile, sin pgAdmin ni montaje de código):
>
> ```bash
> docker compose -f docker-compose.prod.yml up -d --build
> ```

---

## Issues conocidos

### `@phrasecode/odata` v0.3.1 — parches aplicados

La librería se parchea en runtime/build vía `scripts/patch-odata.mjs` (idempotente, se aplica en `postinstall` y al iniciar `pnpm dev`). Los parches cubren:

1. **SSL en desarrollo**: el `SequelizerAdaptor` siempre creaba `dialectOptions.ssl`, forzando SSL incluso contra PostgreSQL local. Se cambió a `ssl` solo si `dbConfig.ssl` está presente (producción; toggle `DB_SSL`, ciclo 16 F2).
2. **Rutas OData**: `ExpressRouter.setUpODataRouters` se reemplaza para añadir `GET /:id` (Fase A) y `GET /$count` (Fase B), con decodificación correcta del query string (`decodeURIComponent`). Marcador `// PATCHED-COUNT-v4`.
3. **EDM DateTimeOffset**: `mapToEdmType` distingue `DATEONLY` (→ `Edm.Date`) de `DATE`/`DATETIME`/`TIMESTAMP` (→ `Edm.DateTimeOffset`, ISO 8601 para SAPUI5). Marcador `// PATCHED-EDMDATE-v1`.

Además, el arranque productivo usa el **puente CJS** `src/common/service/odata/odata-runtime.ts` (ciclo 16 F3): `createRequire` fuerza la condición `require` del `exports` del paquete → build CJS (`dist/index.js`, donde viven los parches), evitando la build ESM rota (`ERR_UNSUPPORTED_DIR_IMPORT`). `pnpm start` (dist) verificado en CI con smoke de producción.

Si actualizas la librería, verifica que los parches sigan siendo necesarios (marcadores `// PATCHED-…`).

### Compatibilidad SAPUI5/OpenUI5 (v1.1.0)

Las fases A–I del plan `docs/04-sapui5-compat/14-sapui5-compatibility-plan.md` añaden las features que SAPUI5/OpenUI5 OData v4 espera y que la librería no trae de serie:

- Acceso por clave, `/$count`, `/$batch` de lectura (Fases A–C).
- Navigation properties (`$expand`) vía decoradores `@BelongsTo`/`@HasMany` (Fase D).
- Recorte de navegación (`$select`/`$filter`/`$orderby`/`$top`/`$skip` en `$expand`) (Fase G).
- Escritura OData: `$batch` con changesets atómicos (transacción + `Content-ID`) y escritura directa por entidad (Fase H).
- Tipos EDM (`Edm.Decimal`, `Edm.DateTimeOffset` en ISO 8601) y negociación de `$format` (Fase I).

> **Nota:** la Fase P (gate de rendimiento) **superada** — `feat/odata-sapui5-compat` es
> equivalente a `v1.1.0` (0 regresión >10% en p95/throughput, 0 errores; ver `docs/04-sapui5-compat/14-sapui5-compatibility-plan.md` Sesión 13).
> El merge a `master` y el tag `v1.1.0` están desbloqueados (acción manual consciente).

**Pendientes investigados antes del merge (resueltos como no-bloqueantes):**

- **Naming en `$metadata`**: se verificó empíricamente que el `$Endpoint` emitido (`/product-odata`, `/category-odata`) coincide con la ruta kebab registrada por el router. No hay discrepancia que afecte a SAPUI5.
- **`$count` + `$expand` combinados**: la combinación que SAPUI5 emite (`?$expand=category&$count=true`) funciona correctamente (devuelve `@odata.count` + la expansión anidada). El error `Unsupported relation type for $count` de `adaptors/sequelizer.js` es inalcanzable con las relaciones definidas; solo fallan usos avanzados no emitidos por SAPUI5 (p.ej. `$filter=category/$count gt 0`), fuera de alcance para v1.1.0.

### `pg` v16 no existe

En `package.json` se usa `pg@^8.22.0`. La versión `16.x` no existe en el registro npm.

---

## Benchmark de rendimiento (gate de merge)

`scripts/bench/` mide la regresión de rendimiento vs el release `v1.1.0` con `autocannon`
(devDependency). El gate de aceptación es **≤10% de regresión en p95 y en throughput, 0 errores**
(ver `docs/04-sapui5-compat/14-sapui5-compatibility-plan.md`, Sesión 13).

```bash
# 1) Baseline: checkout del tag v1.1.0 en un worktree con su propio node_modules
git worktree add ../worktree-v1.1.0 v1.1.0
cd ../worktree-v1.1.0 && pnpm install && cd ../servidor-odata

# 2) Arrancar CADA server por separado (NO a la vez: compiten por CPU y sesgan la métrica)
#    feature en :3002  |  baseline en :3003   (PORT env)
TARGET_URL=http://localhost:3002 OUT_FILE=/tmp/bench-feature.json  node scripts/bench/bench-single.mjs
TARGET_URL=http://localhost:3003 OUT_FILE=/tmp/bench-baseline.json node scripts/bench/bench-single.mjs

# 3) Comparar con el gate de 10%
FEATURE_FILE=/tmp/bench-feature.json BASELINE_FILE=/tmp/bench-baseline.json node scripts/bench/bench-compare.mjs
```

Notas: `bench-single.mjs` hace warmup + 3 rondas por endpoint y usa la mediana; usa `p97_5`
como proxy de p95 (autocannon 8 no expone `p95` directo). Para resultados estables, reinicia
Postgres antes del baseline y mide el baseline **primero** (evita sesgo de cache de buffers).

---

## Documentación adicional

La carpeta `docs/` contiene guías detalladas sobre decisiones técnicas y procedimientos,
organizada semánticamente por ciclos de evolución del proyecto (fundamentos, patrones,
seguridad, compatibilidad SAPUI5, refactors y ecosistema financiero). El punto de entrada es
[`docs/00-indice.md`](docs/00-indice.md).
