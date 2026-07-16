# 05 — OData Module Pattern with @phrasecode/odata

## 5.1 Module Structure

OData is the **single domain** of this server (refactor cycle "OData as Domain"). The codebase is
split into a **domain layer** (`src/core/<dominio>/`) and a **shared kernel** (`src/common/service/odata/`).

### Domain layer — `src/core/<dominio>/`

Each entity owns its full module under `core/<dominio>/` with the standard folders:

```
src/core/product/
├── interface/product.interface.ts
├── model/product.odata.model.ts        # @phrasecode/odata decorated model (@Table/@Column)
├── dto/product.dto.ts                  # Create/Update DTOs (class-validator)
├── controller/product.odata.controller.ts  # OData controller (extends ODataControler)
├── service/product.service.ts          # Domain service: read via controller, write via shared kernel
└── main.ts                             # Barrel export (model + controller)
```

- **model/**: ORM mapping using `@Table` and `@Column` decorators from `@phrasecode/odata`. These are
  read/write projections of the database tables.
- **dto/**: `ProductCreateDTO` / `ProductUpdateDTO` (and category equivalents) validated with
  `class-validator`. **Validation lives in the domain service** — the write path rejects invalid
  bodies with a 400 OData v4 error *before* touching the database.
- **controller/**: Endpoint logic extending `ODataControler`. Overrides `get` for custom query
  behavior (e.g. max `$top`).
- **service/**: The only orchestration layer. Reads delegate to the `ODataControler`; writes
  delegate to `odataWriteService` (shared kernel) **after** DTO validation.

### Shared kernel — `src/common/service/odata/` (infra only)

```
src/common/service/odata/
├── datasource.ts          # Shared DataSource config (singleton)
├── odata.service.ts       # Controller registration + ExpressRouter at /odata
├── odata-write.service.ts # Base write service (transactions, etag, column whitelist)
├── odata-write.routes.ts  # Direct-write routes delegating to domain services
├── odata-error.ts         # OData v4 error shape
├── odata-etag.ts          # @odata.etag helpers (optimistic concurrency)
├── odata-format.ts        # $format negotiation
└── odata-metadata.ts      # $metadata CSDL 4.01 builder
```

- **datasource.ts**: Singleton `DataSource` connecting to PostgreSQL (reuses the SequelizerAdaptor
  connection pool; the write service reuses the *same* Sequelize instance — no second pool).
- **odata.service.ts**: Central registration point. Receives the controller array (imported from
  `core/<dominio>/controller/`) and `dataSource`, builds the `ExpressRouter` mounted at `/odata`
  in `src/main.ts`.
- **odata-write.service.ts**: Internal utility — atomic transactions, optimistic-concurrency etag,
  and column whitelist. It resolves the real Sequelize `ModelStatic` from the domain model's
  `tableIdentifier`; it does **not** own domain validation or DTOs.
- **odata-write.routes.ts**: Direct-write routes for SAPUI5 `$direct` mode (POST/PATCH/PUT/DELETE per
  entity). They **delegate to the domain service** (`productService` / `categoryService`) so that
  DTO validation stays in the domain; on `JSONValidatorException` they respond 400 in OData v4
  standard form `{ error: { code, message, target?, details[] } }`.

This separation keeps `common/service/odata/` purely infrastructural (no per-domain models or
controllers), while each domain owns its models, DTOs, controllers, and write/validation logic.

---

## 5.2 Step-by-Step: Creating an OData Endpoint

### Step 1: Define the OData Model (in the domain)

```typescript
// src/core/product/model/product.odata.model.ts
import { Model, Table, Column, DataTypes } from "@phrasecode/odata";

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

Each column uses the `@Column` decorator with its data type and options (primary key, auto-increment, default value). The `@Table` decorator specifies the target SQL table or view.

### Step 2: Create the OData Controller (in the domain)

```typescript
// src/core/product/controller/product.odata.controller.ts
import { ODataControler, QueryParser } from "@phrasecode/odata";
import { ProductOData } from "../model/product.odata.model.js";

export class ProductODataController extends ODataControler {
    constructor() {
        super({
            model: ProductOData,
            allowedMethod: ["get"], // Read-only
        });
    }

    public async get(query: QueryParser) {
        // Custom logic: enforce a maximum limit
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<ProductOData>(query);
        return result;
    }
}
```

The controller extends `ODataControler` and receives model config and allowed HTTP methods. The `get` method receives a `QueryParser` to inspect and modify query parameters before execution.

### Step 3: Register in odata.service.ts (shared kernel)

```typescript
// src/common/service/odata/odata.service.ts
import { Router } from "express";
import { ExpressRouter } from "@phrasecode/odata";
import { dataSource } from "./datasource.js";
import { ProductODataController } from "../../core/product/controller/product.odata.controller.js";

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

export { oDataExpressApp };
```

The `ExpressRouter` receives the Express `Router`, controllers, `dataSource`, and logger config. The exported router is mounted in `src/main.ts` at `/odata`.

---

## 5.3 Supported Data Types

`@phrasecode/odata` supports a wide range of SQL data types:

- `DataTypes.INTEGER`, `DataTypes.BIGINT`, `DataTypes.SMALLINT`
- `DataTypes.STRING`, `DataTypes.TEXT`
- `DataTypes.DECIMAL`, `DataTypes.FLOAT`, `DataTypes.DOUBLE`
- `DataTypes.BOOLEAN`
- `DataTypes.DATE`, `DataTypes.DATEONLY`
- `DataTypes.UUID`
- `DataTypes.JSON`, `DataTypes.JSONB`
- `DataTypes.ENUM(...values)`

Each maps automatically to the corresponding column type in the underlying database engine.

---

## 5.4 Entity Relationships

Relationships are defined using `@HasMany`, `@BelongsTo`, `@HasOne`, and `@BelongsToMany` decorators:

```typescript
// models/category.odata.model.ts
@Table({ tableName: "categories" })
export class CategoryOData extends Model<CategoryOData> {
    @Column({ dataType: DataTypes.INTEGER, isPrimaryKey: true, isAutoIncrement: true })
    id!: number;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    @HasMany(() => ProductOData, {
        relation: [{ foreignKey: "categoryId", sourceKey: "id" }],
    })
    products!: ProductOData[];
}
```

These relationships enable `$expand` in OData queries to fetch related data in a single request.

---

## 5.5 Supported OData Queries

```
GET /odata/Products?$select=nombre,precio
GET /odata/Products?$filter=precio gt 100
GET /odata/Products?$orderby=nombre asc
GET /odata/Products?$top=10&$skip=20
GET /odata/Products?$expand=category
GET /odata/Products?$filter=categoria eq 'Electrónica'&$count=true
GET /odata/$metadata
```

| Parameter | Description | Example |
|-----------|-------------|---------|
| `$select` | Column projection | `$select=nombre,precio` |
| `$filter` | Filtering with logical operators | `$filter=precio gt 100` |
| `$orderby` | Ascending/descending sort | `$orderby=nombre asc` |
| `$top` / `$skip` | Pagination | `$top=10&$skip=20` |
| `$expand` | Include related entities | `$expand=category` |
| `$count` | Include total record count | `$count=true` |
| `$metadata` | Schema documentation | `$metadata` |

---

## 5.6 Custom Query Pattern with @Query

For specialized read endpoints (reports, dashboards, complex queries), use the `@Query` decorator:

```typescript
import { ODataControler, Custom, QueryControllerEvent, DataTypes } from "@phrasecode/odata";

export class ProductODataController extends ODataControler {
    constructor() {
        super({ model: ProductOData, allowedMethod: ["get"] });
    }

    @Query({
        method: "get",
        endpoint: "/top-expensive",
        parameters: [{ name: "limit", type: DataTypes.INTEGER, defaultValue: 10 }],
    })
    public async getTopExpensive(event: QueryControllerEvent) {
        return this.rawQueryable(
            `SELECT * FROM products ORDER BY precio DESC LIMIT $limit`,
            { limit: event.queryParams.limit },
        );
    }
}
```

This pattern exposes custom OData routes running native SQL — ideal for aggregated reports or queries that cannot be expressed with `$filter`.
