# 06 — REST vs OData Separation (Lightweight CQRS)

## 6.1 Separation Philosophy

This project implements a lightweight variant of CQRS (Command Query Responsibility Segregation) where commands (writes) and queries (reads) travel through distinct HTTP channels:

- **REST** (`/api/core/*`): Write operations (Create, Update, Delete) plus reads that require business logic, DTO validation, or transactional behavior.
- **OData** (`/odata/*`): Read-only queries with advanced filtering, projection, sorting, and relationship expansion. No business logic — optimized for performance.

Key principles:

- Writes **always** pass through DTO validation and service-layer logic. OData models are never exposed for writes if business rule validation is required.
- OData reads **may bypass** service-layer logic and query the database or SQL views directly, yielding higher performance.
- The Sequelize domain models are the single source of truth. OData models are projections, not independent definitions.
- Transactional operations involving multiple entities or side effects belong exclusively to REST.

This separation prevents OData's flexibility from introducing unintended side effects or incomplete validation on write operations.

---

## 6.2 When to Use Each Channel

| Scenario | REST | OData |
|-----------|------|-------|
| Create a resource | ✅ POST | ❌ |
| Update a resource | ✅ PUT/PATCH | ❌ |
| Delete a resource | ✅ DELETE | ❌ |
| List with simple filters | ✅ | ✅ |
| List with complex filters | ❌ (requires custom endpoint) | ✅ ($filter) |
| List with deep relationships | ❌ (N+1 problem) | ✅ ($expand) |
| Dashboards / Reports | ❌ | ✅ (custom @Query) |
| Authentication | ✅ | ✅ (via middleware) |
| Transactional operations | ✅ (db.transaction) | ❌ |

**Rule of thumb**: If the operation modifies state, use REST. If it only reads data, evaluate whether filters are complex enough to justify OData. For simple reads (list all, get by ID), REST remains a valid and simpler option.

---

## 6.3 Actual Route Structure

### REST Routes (`/api/core`)

The route chain in `src/main.ts` mounts `GlobalRouter` at `/api`:

```
src/main.ts                    → app.use("/api", GlobalRouter)
src/common/router/global.router.ts  → GlobalRouter.use("/core", CoreRouter)
src/core/main.ts                    → CoreRouter.use("/products", ProductRouter)
src/core/product/main.ts            → ProductRouter.use("/", productRouter)
```

This produces these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/core/products` | List all products |
| GET | `/api/core/products/:id` | Get product by ID |
| POST | `/api/core/products` | Create product (validated with `ProductCreateDTO`) |
| PUT | `/api/core/products/:id` | Update product (validated with `ProductUpdateDTO`) |
| DELETE | `/api/core/products/:id` | Delete product |

### OData Routes (`/odata`)

```
src/main.ts                                   → app.use("/odata", ..., oDataExpressApp)
src/common/service/odata/odata.service.ts     → ExpressRouter with controllers
```

This produces:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/odata/Products` | Query products with OData parameters |
| GET | `/odata/Products/$count` | Count products matching filter |
| GET | `/odata/$metadata` | OData schema document |

The OData router exposes the `Product` entity set with support for `$filter`, `$select`, `$orderby`, `$top`, `$skip`, `$expand`, and `$count`.

---

## 6.4 Schema Synchronization

To maintain consistency between both channels:

1. **Source of truth**: Sequelize models in each core module define the database structure. Migrations are generated from these models.
2. **OData models**: Point to the same tables or optimized SQL views. They do not run migrations — they are read-only projections.
3. **SQL views**: Create dedicated views for OData that pre-process joins, compute derived columns, and rename fields to the format expected by clients.

```sql
-- Example SQL view for OData
CREATE VIEW VIEW_PRODUCT_LIST AS
SELECT
    p.id,
    p.nombre,
    p.precio,
    c.nombre AS categoria_nombre,
    p.created_at
FROM products p
LEFT JOIN categories c ON c.id = p.category_id;
```

Views optimize performance because joins are pre-defined and execution plans are cached. They also reduce OData query complexity.

---

## 6.5 Naming Conventions

| Element | Style | Example |
|----------|-------|---------|
| REST endpoint | kebab-case, plural | `/api/core/products` |
| OData EntitySet | PascalCase, singular | `/odata/Products` |
| SQL views | SCREAMING_SNAKE_CASE | `VIEW_PRODUCT_LIST` |
| Tables | snake_case, plural | `products`, `categories` |
| Sequelize models | PascalCase | `Product`, `ProductModel` |
| OData models | PascalCase + `OData` suffix | `ProductOData` |

---

## 6.6 Security Across Both Channels

Security applies to both channels but with different strategies:

- **REST**: Middleware at the route level in `src/core/*/route/` — DTO validation via `ValidatorMiddleware`, error handling via `GlobalErrorMiddleware`.
- **OData**: Express global middleware mounted before `ExpressRouter` in `src/main.ts`. JWT or session tokens are validated, and row-level access control is delegated to the `QueryParser` if needed.

```typescript
// src/main.ts — OData with contextual middleware
app.use(
    "/odata",
    (req, res, next) => {
        if (req.path.includes("$metadata")) req.url = "/$metadata";
        res.set("OData-Version", "4.0");
        next();
    },
    oDataExpressApp,
);
```

Both channels share the same CORS, helmet, and compression configuration defined at the application level in `src/main.ts`.

For scenarios where certain data must not be exposed via OData:

- **Restricted SQL view**: The view excludes sensitive columns (e.g., `salario`, `email`).
- **Custom controller**: Override `get` in the OData controller to filter rows based on the authenticated user.
- **Redundancy**: Maintain both REST list + OData for the same resource when maximum client flexibility is needed without compromising security.
