# 05 — Patrón de Módulo OData con @phrasecode/odata

## 5.1 Estructura de un Módulo OData

Cada entidad que se expone mediante OData se organiza en tres artefactos dentro de una estructura de directorios predecible:

```
src/common/service/odata/
├── models/
│   └── <entidad>.odata.model.ts       # Modelo decorado @Table/@Column
├── controllers/
│   └── <entidad>.odata.controller.ts  # Controlador OData
└── odata.service.ts                   # Registro de controladores + ExpressRouter
```

- **models/**: Define el mapeo ORM con decoradores `@Table` y `@Column`. Equivale al modelo Sequelize del lado REST, pero está diseñado exclusivamente para consultas OData.
- **controllers/**: Implementa la lógica de cada endpoint expuesto. Hereda de `ODataControler` y puede sobrescribir los métodos `get`, `create`, `update`, `delete`.
- **odata.service.ts**: Punto único de registro. Recibe un arreglo de controladores y un `dataSource`, y construye el `ExpressRouter` que se monta en `/odata`.

Esta separación permite que los modelos OData sean más ligeros que los modelos Sequelize de escritura, enfocados únicamente en la proyección y filtrado que necesita el cliente.

---

## 5.2 Paso a Paso: Crear un Endpoint OData

### Paso 1: Definir el modelo OData

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

Cada columna se decora con `@Column` indicando su tipo de dato y opciones adicionales como clave primaria, auto-incremento, o valor por defecto. El decorador `@Table` especifica la tabla o vista SQL a la que apunta.

### Paso 2: Crear el controlador OData

```typescript
// src/common/service/odata/controllers/product.odata.controller.ts
import { ODataControler, QueryParser } from "@phrasecode/odata";
import { ProductOData } from "../models/product.odata.model.js";

export class ProductODataController extends ODataControler {
    constructor() {
        super({
            model: ProductOData,
            allowedMethod: ["get"], // Solo lectura
        });
    }

    public async get(query: QueryParser) {
        // Custom logic: forzar límite máximo
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<ProductOData>(query);
        return result;
    }
}
```

El controlador extiende `ODataControler` y recibe en el constructor la configuración del modelo y los métodos HTTP permitidos. El método `get` recibe un `QueryParser` que permite inspeccionar y modificar los parámetros de la consulta antes de ejecutarla.

### Paso 3: Registrar en odata.service.ts

```typescript
// src/common/service/odata/odata.service.ts
import { ExpressRouter } from "@phrasecode/odata";
import { ProductODataController } from "./controllers/product.odata.controller.js";
import { dataSource } from "./datasource.js"; // Configuración compartida

const controllers = [new ProductODataController()];

const app = express();
const oDataExpressApp = express.Router();
new ExpressRouter(oDataExpressApp, {
    controllers,
    dataSource,
    logger: {
        enabled: true,
        logLevel: "INFO",
        format: "JSON",
        advancedOptions: {
            logSqlQuery: true,
            logDbExecutionTime: true,
        },
    },
});
```

El `ExpressRouter` recibe el router de Express, los controladores, la fuente de datos y la configuración de logging. Una vez construido, el router se monta en la aplicación principal en la ruta `/odata`.

---

## 5.3 Tipos de Datos Soportados

`@phrasecode/odata` soporta una amplia variedad de tipos de datos SQL:

- `DataTypes.INTEGER`, `DataTypes.BIGINT`, `DataTypes.SMALLINT`
- `DataTypes.STRING`, `DataTypes.TEXT`
- `DataTypes.DECIMAL`, `DataTypes.FLOAT`, `DataTypes.DOUBLE`
- `DataTypes.BOOLEAN`
- `DataTypes.DATE`, `DataTypes.DATEONLY`
- `DataTypes.UUID`
- `DataTypes.JSON`, `DataTypes.JSONB`
- `DataTypes.ENUM(...values)`

Cada tipo se traduce automáticamente al tipo de columna correspondiente en el motor de base de datos subyacente.

---

## 5.4 Relaciones entre Entidades

Las relaciones se definen mediante decoradores `@HasMany`, `@BelongsTo`, `@HasOne` y `@BelongsToMany`, similares a los de Sequelize:

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

Estas relaciones habilitan el uso de `$expand` en las consultas OData para obtener datos relacionados en una sola petición.

---

## 5.5 Consultas OData Soportadas

```
# OData query examples
GET /odata/Products?$select=nombre,precio
GET /odata/Products?$filter=precio gt 100
GET /odata/Products?$orderby=nombre asc
GET /odata/Products?$top=10&$skip=20
GET /odata/Products?$expand=category
GET /odata/Products?$filter=categoria eq 'Electrónica'&$count=true
GET /odata/$metadata
```

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `$select` | Proyección de columnas | `$select=nombre,precio` |
| `$filter` | Filtrado con operadores lógicos | `$filter=precio gt 100` |
| `$orderby` | Ordenación ascendente/descendente | `$orderby=nombre asc` |
| `$top` / `$skip` | Paginación | `$top=10&$skip=20` |
| `$expand` | Incluir relaciones | `$expand=category` |
| `$count` | Incluir total de registros | `$count=true` |
| `$metadata` | Documentación del esquema | `$metadata` |

---

## 5.6 Patrón Custom Query con @Query

Para endpoints de lectura especializados (reportes, dashboards, consultas complejas), se utiliza el decorador `@Query`:

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

Este patrón permite exponer rutas OData personalizadas que ejecutan SQL nativo, ideal para reportes agregados o consultas que no se pueden expresar con `$filter`.
