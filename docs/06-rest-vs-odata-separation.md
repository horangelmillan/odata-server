# 06 — Separación REST vs OData (CQRS Ligero)

## 6.1 Filosofía de Separación

Este patrón implementa una variante ligera de CQRS (Command Query Responsibility Segregation) donde los comandos (escritura) y las consultas (lectura) transitan por canales HTTP distintos:

- **REST** (`/api/core/*`): Operaciones de escritura (Create, Update, Delete) + lecturas que requieren lógica de negocio, validación con DTOs, o comportamiento transaccional.
- **OData** (`/odata/*`): Consultas de solo lectura con capacidades avanzadas de filtrado, proyección, ordenación y expansión de relaciones. Sin lógica de negocio, optimizado para rendimiento.

Principios fundamentales:

- Las escrituras **siempre** pasan por validación de DTOs y lógica de servicio. Nunca se expone un modelo OData para escritura si requiere validación de reglas de negocio.
- Las lecturas OData **pueden saltarse** la lógica de servicio y acceder directamente a la base de datos o a vistas SQL, obteniendo mayor rendimiento.
- El modelo de dominio (entidades Sequelize) es la fuente de verdad única. Los modelos OData son proyecciones de ese modelo, no definiciones independientes.
- Las operaciones transaccionales que involucran múltiples entidades o efectos secundarios pertenecen exclusivamente a REST.

Esta separación evita que la flexibilidad de OData introduzca efectos secundarios no deseados o validaciones incompletas en operaciones de escritura.

---

## 6.2 Cuándo usar cada vía

| Escenario | REST | OData |
|-----------|------|-------|
| Crear un recurso | ✅ POST | ❌ |
| Actualizar un recurso | ✅ PUT/PATCH | ❌ |
| Eliminar un recurso | ✅ DELETE | ❌ |
| Listar con filtros simples | ✅ | ✅ |
| Listar con filtros complejos | ❌ (requiere endpoint custom) | ✅ ($filter) |
| Listar con relaciones profundas | ❌ (N+1 problem) | ✅ ($expand) |
| Dashboard / Reportes | ❌ | ✅ (custom @Query) |
| Autenticación | ✅ | ✅ (vía middleware) |
| Operaciones transaccionales | ✅ (db.transaction) | ❌ |

**Regla general**: Si la operación modifica estado, usa REST. Si solo lee datos, evalúa si los filtros son lo suficientemente complejos como para justificar OData. Para lecturas simples (listar todos, obtener por ID), REST sigue siendo una opción válida y más simple.

---

## 6.3 Sincronización de Esquemas

Para mantener coherencia entre ambos canales:

1. **Fuente de verdad**: Los modelos Sequelize del módulo REST definen la estructura de la base de datos. Las migraciones se generan a partir de estos modelos.
2. **Modelos OData**: Apuntan a las mismas tablas o a vistas SQL optimizadas. No ejecutan migraciones; son solo de lectura.
3. **Vistas SQL**: Se recomienda crear vistas específicas para OData que pre-procesen joins, calculen columnas derivadas, y renombren campos al formato esperado por el cliente.

```sql
-- Ejemplo de vista SQL para OData
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

Las vistas optimizan el rendimiento porque los joins ya están pre-definidos y el plan de ejecución se cachea. Además, alivian la carga del motor OData al reducir la complejidad del mapeo.

---

## 6.4 Convención de Nombrado

| Elemento | Estilo | Ejemplo |
|----------|-------|---------|
| REST endpoint | kebab-case, plural | `/api/core/products` |
| OData EntitySet | PascalCase, singular | `/odata/Products` |
| Vistas SQL | SCREAMING_SNAKE_CASE | `VIEW_PRODUCT_LIST` |
| Tablas | snake_case, plural | `products`, `categories` |
| Modelos Sequelize | PascalCase | `Product`, `Category` |
| Modelos OData | PascalCase + `OData` suffix | `ProductOData` |

---

## 6.5 Seguridad en Ambos Canales

La seguridad se aplica en ambos canales, pero con estrategias diferentes:

- **REST**: Middleware `security.protectSession` en rutas sensibles, verificación de roles y permisos por endpoint.
- **OData**: Middleware Express global montado antes de `ExpressRouter`. Se valida el JWT o token de sesión, pero el control de acceso a nivel de fila se delega al QueryParser si es necesario.

```typescript
// src/main.ts - OData con autenticación opcional
app.use("/odata", authenticateMiddleware, oDataExpressApp);
```

Ambos canales comparten la misma configuración de CORS, helmet, y rate limiting, definida a nivel de aplicación.

Para escenarios donde ciertos datos no deben exponerse vía OData, se usa una de estas estrategias:

- **Vista SQL restringida**: La vista excluye columnas sensibles (ej: `salario`, `email`).
- **Controlador custom**: Se sobrescribe `get` en el controlador OData para filtrar filas según el usuario autenticado.
- **Redundancia**: Se mantienen ambos caminos (REST list + OData) para el mismo recurso cuando se necesita ofrecer la máxima flexibilidad al cliente sin comprometer la seguridad.
