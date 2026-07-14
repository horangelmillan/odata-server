# 05 — OData Module Pattern with @phrasecode/odata

## 5.1 Module Structure

Each entity exposed via OData follows a three-artifact structure under `src/common/service/odata/`:

```
src/common/service/odata/
├── models/
│   └── product.odata.model.ts          # Decorated model (@Table/@Column)
├── controllers/
│   └── product.odata.controller.ts     # OData controller
├── datasource.ts                       # Shared DataSource config
└── odata.service.ts                    # Controller registration + ExpressRouter
```

- **models/**: ORM mapping using `@Table` and `@Column` decorators from `@phrasecode/odata`. These are read-only projections of the database tables, optimized for OData querying.
- **controllers/**: Endpoint logic extending `ODataControler`. Can override `get`, `create`, `update`, `delete` methods for custom behavior.
- **datasource.ts**: Singleton `DataSource` that connects to PostgreSQL with its own connection pool.
- **odata.service.ts**: Central registration point. Receives the controller array and `dataSource`, builds the `ExpressRouter` mounted at `/odata` in `src/main.ts`.

This separation keeps OData models lightweight compared to Sequelize write models, focusing purely on the projection and filtering the client needs.

---

## 5.2 Step-by-Step: Creating an OData Endpoint

### Step 1: Define the OData Model

```typescript
// src/common/service/odata/models/product.odata.model.ts
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

### Step 2: Create the OData Controller

```typescript
// src/common/service/odata/controllers/product.odata.controller.ts
import { ODataControler, QueryParser } from "@phrasecode/odata";
import { ProductOData } from "../models/product.odata.model.js";

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

### Step 3: Register in odata.service.ts

```typescript
// src/common/service/odata/odata.service.ts
import { Router } from "express";
import { ExpressRouter } from "@phrasecode/odata";
import { dataSource } from "./datasource.js";
import { ProductODataController } from "./controllers/product.odata.controller.js";

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
