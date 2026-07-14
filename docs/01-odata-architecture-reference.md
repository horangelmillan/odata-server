# 01 — Arquitectura OData de odata-server

## 1.1 Resumen del Proyecto

**odata-server** es un servidor backend Node.js/TypeScript que expone una API REST para un dominio de productos y un endpoint OData v4 de solo lectura para consultas externas. Sigue el patrón **Modular Monolith con Shared Kernel**, donde el endpoint OData se integra como parte de la infraestructura transversal.

**Stack tecnológico:**

| Componente | Versión |
|------------|---------|
| Node.js | 20.18 LTS |
| Express | 4.21.x |
| TypeScript | 5.6.x |
| Sequelize | 6.37.x |
| PostgreSQL | 16 |
| `@phrasecode/odata` | 0.3.1 |

## 1.2 Estructura del Proyecto

```
odata-server/
├── server.ts                        # Bootstrap: carga dotenv, importa reflect-metadata, arranca Express
├── src/
│   ├── main.ts                      # Fábrica Express: middlewares globales + OData + REST
│   ├── common/                      # Shared Kernel
│   │   ├── dto/                     # BaseDTO
│   │   ├── exception/               # HttpException, NotFoundException, JSONValidatorException, etc.
│   │   ├── helper/                  # Utilidades generales, customValidators, cast
│   │   │   └── nestjs/              # OmitType, PartialType, PickType, IntersectionType
│   │   ├── interface/               # BaseController, BaseService, BaseQuery, ApiResponse
│   │   ├── middleware/              # GlobalError, JSONValidator, Security, ODataContext
│   │   ├── model/                   # BaseModel
│   │   ├── router/                  # GlobalRouter (monta core)
│   │   └── service/
│   │       ├── ORM/                 # Sequelize singleton (dev/prod) + models
│   │       │   └── models/          # databaseModels.init()
│   │       └── odata/               # ★ Capa OData (vía @phrasecode/odata)
│   │           ├── datasource.ts    # Configuración DataSource PostgreSQL
│   │           ├── odata.service.ts # ExpressRouter de @phrasecode/odata
│   │           ├── models/          # Modelos OData (@Table/@Column)
│   │           │   └── product.odata.model.ts
│   │           └── controllers/     # Controladores OData (extienden ODataControler)
│   │               └── product.odata.controller.ts
│   └── core/                        # Dominios de negocio
│       ├── main.ts                  # CoreRouter (monta dominios)
│       └── product/                 # Dominio Product
│           ├── main.ts              # ProductRouter (monta rutas)
│           ├── route/               # Definición de rutas REST
│           ├── controller/          # Controlador REST (CRUD completo)
│           ├── service/             # Servicio con lógica de negocio
│           ├── model/               # Modelo Sequelize (Products)
│           ├── dto/                 # DTOs con validación (class-validator)
│           ├── interface/           # IProduct
│           └── query/               # Queries SQL personalizadas
```

## 1.3 Pipeline Express (`src/main.ts`)

La fábrica Express en `src/main.ts:15-48` construye el pipeline en este orden:

1. **helmet()** — Seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.)
2. **cors()** — CORS con exposición del header `OData-Version`
3. **Middleware OData inline** — Normaliza la URL de `$metadata` y fuerza el header `OData-Version: 4.0`
4. **`oDataExpressApp`** — Router Express de `@phrasecode/odata` montado en `/odata`
5. **express.json()** — Parseo de body JSON
6. **compression()** — Compresión gzip de respuestas
7. **morgan()** — Logging HTTP (formato `dev` en desarrollo, `combined` en producción)
8. **GlobalRouter** — API REST montada en `/api` (deriva a `CoreRouter` en `/api/core`)
9. **GlobalErrorMiddleware** — Manejador de errores global al final del pipeline

## 1.4 Integración con @phrasecode/odata

### Configuración del DataSource (`src/common/service/odata/datasource.ts`)

```typescript
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

Usa variables de entorno con prefijo `DEV_` para desarrollo y sin prefijo para producción. SSL se habilita automáticamente en producción.

### Registro del Router (`src/common/service/odata/odata.service.ts`)

```typescript
const oDataExpressApp: Router = Router();

new ExpressRouter(oDataExpressApp, {
    controllers: [new ProductODataController()],
    dataSource,
    logger: {
        enabled: true,
        logLevel: process.env.NODE_ENV === "development" ? "INFO" : "ERROR",
        format: "JSON",
        advancedOptions: {
            logSqlQuery: process.env.NODE_ENV === "development",
            logDbExecutionTime: true,
            logDbQueryParameters: false,
        },
    },
});
```

El logging diferencia entre desarrollo (INFO, muestra SQL) y producción (ERROR, solo errores).

### Modelo OData (`src/common/service/odata/models/product.odata.model.ts`)

```typescript
@Table({ tableName: "products" })
export class ProductOData extends Model<ProductOData> {
    @Column({ dataType: DataTypes.INTEGER, isPrimaryKey: true, isAutoIncrement: true })
    id!: number;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    @Column({ dataType: DataTypes.DECIMAL })
    precio!: number;

    @Column({ dataType: DataTypes.STRING })
    categoria!: string;
}
```

El modelo se define con decoradores de `@phrasecode/odata` y la propiedad `tableName` lo mapea a la tabla `products`.

### Controlador OData (`src/common/service/odata/controllers/product.odata.controller.ts`)

```typescript
export class ProductODataController extends ODataControler {
    constructor() {
        super({
            model: ProductOData,
            allowedMethod: ["get"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<ProductOData>(query);
        return result;
    }
}
```

Características:
- `allowedMethod: ["get"]` restringe OData a solo lectura.
- `setTop(100)` establece un límite máximo de 100 registros por página.
- Usa `this.queryable()` para ejecutar la consulta traducida automáticamente a SQL.

## 1.5 Arquitectura REST + OData (Dos Canales)

| Aspecto | REST (`/api/core/products`) | OData (`/odata/Products`) |
|---------|------------------------------|---------------------------|
| **ORM** | Sequelize (modelo tipado) | `@phrasecode/odata` (query builder nativo) |
| **Operaciones** | CRUD completo | Solo GET (solo lectura) |
| **Validación** | DTOs con class-validator | Esquema del modelo OData |
| **Formato respuesta** | `ApiResponse` uniforme | JSON OData v4 (`@odata.context`, `value`, `@odata.count`) |
| **Autenticación** | JWT via `security.protectSession` | Sin autenticación (para integraciones externas) |
| **Paginación** | Offset/limit manual | `$top`, `$skip`, `$inlinecount` nativos |
| **Filtrado** | Query params manual | `$filter`, `$orderby`, `$select` |

## 1.6 Shared Kernel

El Shared Kernel (`src/common/`) contiene toda la infraestructura transversal:

| Capa | Archivos | Propósito |
|------|----------|-----------|
| **DTO** | `base.dto.ts` | Clase base para DTOs |
| **Exception** | `http.exception.ts`, `notfound.exception.ts`, `json-validator.exception.ts`, `conflict.exception.ts`, `database.exception.ts` | Jerarquía de excepciones tipadas |
| **Helper** | `cast.helper.ts`, `customValidators.helper.ts`, `useful.helper.ts` | Utilidades generales |
| **Helper NestJS** | `mapped-type.interface.ts`, `omit-type.helper.ts`, `partial-type.helper.ts`, `pick-type.helper.ts`, `intersection.helper.ts`, `types.helper.ts`, `type.interface.ts` | Reimplementación ligera de mapped types de NestJS (`OmitType`, `PartialType`, etc.) |
| **Interface** | `base-controller.interface.ts`, `base-service.interface.ts`, `base-query.interface.ts`, `api-response.interface.ts`, `error-api-response.interface.ts` | Contratos para la arquitectura Modular Monolith |
| **Middleware** | `global-error.middleware.ts`, `json-validator.middleware.ts`, `security.middleware.ts`, `odata-context.middleware.ts` | Pipeline Express transversal |
| **Model** | `base.model.ts` | Clase base para modelos |
| **ORM** | `sequelize.service.ts`, `models/main.model.ts` | Singleton Sequelize con config dev/prod |
| **OData** | `datasource.ts`, `odata.service.ts`, `models/`, `controllers/` | Integración con `@phrasecode/odata` |

## 1.7 Patrones Arquitectónicos

| ID | Patrón | Implementación |
|----|--------|----------------|
| **P1** | Modular Monolith | Cada dominio en `src/core/<domain>/` con su propio controller, service, model, dto, route |
| **P2** | Shared Kernel | Infraestructura transversal en `src/common/` sin dependencias hacia `core/` |
| **P3** | CQRS ligero | REST para escritura/lectura completa; OData solo para consultas externas |
| **P4** | Solo lectura OData | `allowedMethod: ["get"]` en el controlador OData |
| **P5** | Fábrica Express | `src/main.ts` como función factory que monta el pipeline completo |
| **P6** | DTO con validación | class-validator decorators en DTOs, validados por `ValidatorMiddleware` |
| **P7** | ApiResponse uniforme | Respuestas REST envueltas en `{ statusCode, message, result/results }` |
