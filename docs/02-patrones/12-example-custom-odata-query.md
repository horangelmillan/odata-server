# 12 — Consultas OData Personalizadas con @Query

## 12.1 Endpoints Custom con @Query

El decorador `@Query` permite crear endpoints OData con SQL nativo:

```typescript
import { ODataControler, Custom, QueryControllerEvent, DataTypes } from "@phrasecode/odata";

export class ProductODataController extends ODataControler {
    constructor() {
        super({ model: ProductOData, allowedMethod: ["get"] });
    }

    @Query({
        method: "get",
        endpoint: "/top-expensive",
        parameters: [
            { name: "limit", type: DataTypes.INTEGER, defaultValue: 10 },
        ],
    })
    public async getTopExpensive(event: QueryControllerEvent) {
        return this.rawQueryable(
            `SELECT id, nombre, precio, categoria
             FROM products
             ORDER BY precio DESC
             LIMIT $limit`,
            { limit: event.queryParams.limit },
        );
    }

    @Query({
        method: "get",
        endpoint: "/by-category/:category",
        parameters: [
            { name: "category", type: DataTypes.STRING, required: true },
        ],
    })
    public async getByCategory(event: QueryControllerEvent) {
        return this.rawQueryable(
            `SELECT * FROM products WHERE categoria = $category`,
            { category: event.queryParams.category },
        );
    }
}
```

## 12.2 Consultas sobre Vistas SQL

```typescript
// Vista SQL para reporting
// CREATE VIEW VIEW_PRODUCT_SUMMARY AS
// SELECT
//     p.id,
//     p.nombre,
//     p.precio,
//     c.nombre_categoria,
//     (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) as total_orders
// FROM products p
// LEFT JOIN categories c ON c.id = p.category_id;

@Query({
    method: "get",
    endpoint: "/summary",
})
public async getSummary(event: QueryControllerEvent) {
    return this.rawQueryable(
        `SELECT * FROM VIEW_PRODUCT_SUMMARY
         ORDER BY total_orders DESC`,
    );
}
```

## 12.3 Parámetros Tipados

```typescript
@Query({
    method: "get",
    endpoint: "/search",
    parameters: [
        { name: "q", type: DataTypes.STRING, required: true },
        { name: "minPrice", type: DataTypes.DECIMAL, defaultValue: 0 },
        { name: "maxPrice", type: DataTypes.DECIMAL },
        { name: "sortBy", type: DataTypes.STRING, defaultValue: "nombre" },
    ],
})
public async search(event: QueryControllerEvent) {
    const { q, minPrice, maxPrice, sortBy } = event.queryParams;
    let sql = `SELECT * FROM products WHERE nombre ILIKE $q`;
    const params: any = { q: `%${q}%` };

    if (minPrice !== undefined) {
        sql += ` AND precio >= $minPrice`;
        params.minPrice = minPrice;
    }
    if (maxPrice !== undefined) {
        sql += ` AND precio <= $maxPrice`;
        params.maxPrice = maxPrice;
    }

    sql += ` ORDER BY ${sortBy} DESC LIMIT 50`;
    return this.rawQueryable(sql, params);
}
```

## 12.4 Paginación Manual

```typescript
@Query({
    method: "get",
    endpoint: "/paginated",
    parameters: [
        { name: "page", type: DataTypes.INTEGER, defaultValue: 1 },
        { name: "pageSize", type: DataTypes.INTEGER, defaultValue: 20 },
    ],
})
public async getPaginated(event: QueryControllerEvent) {
    const { page, pageSize } = event.queryParams;
    const offset = (page - 1) * pageSize;

    const [results, countResult] = await Promise.all([
        this.rawQueryable(
            `SELECT * FROM products ORDER BY id LIMIT $limit OFFSET $offset`,
            { limit: pageSize, offset },
        ),
        this.rawQueryable(`SELECT COUNT(*) as total FROM products`),
    ]);

    return {
        value: results,
        "@odata.count": countResult[0]?.total || 0,
    };
}
```

## 12.5 Mezcla con Parámetros OData

```typescript
@Query({
    method: "get",
    endpoint: "/advanced",
    parameters: [
        { name: "category", type: DataTypes.STRING },
    ],
})
public async advancedQuery(event: QueryControllerEvent) {
    // Los parámetros OData ($filter, $select, etc.) también están disponibles
    const oDataQuery = event.query; // QueryParser original
    const params = oDataQuery.getParams();

    let sql = `SELECT * FROM products WHERE 1=1`;
    const sqlParams: any = {};

    if (event.queryParams.category) {
        sql += ` AND categoria = $category`;
        sqlParams.category = event.queryParams.category;
    }

    if (params.filter) {
        // Aplicar filtro OData manualmente si es necesario
        // o delegar a query.getFilter()
    }

    sql += ` ORDER BY id LIMIT 100`;
    return this.rawQueryable(sql, sqlParams);
}
```
