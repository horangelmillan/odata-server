# F2 — `category` como dominio OData (OData-first)

> **Fase:** F2 · **Esfuerzo:** Medio · **Sesión:** 3/8
> **Depende de:** F1.
> **Actualiza:** `docs/00-indice.md`, este archivo.

---

## 0. Objetivo

Aplicar a `category` exactamente lo hecho en F1: modelo OData como fuente de verdad, controlador
`ODataControler` con escritura, `service` DTO-validado, reubicación a `core/category/`, y validación
en escritura. Preservar la navegación `$expand` en ambas direcciones (`product → category`,
`category → products`).

---

## 1. Pasos detallados

### 1.1 Reubicar modelo OData
- `src/core/category/model/category.odata.model.ts` ← contenido de
  `src/common/service/odata/models/category.odata.model.ts` (incluye `@HasMany(() => ProductOData, ...)`
  y `createdAt`/`updatedAt` como fuente de etag).
- **Eliminar** `src/core/category/model/category.model.ts` (`db.define` redundante).

### 1.2 Reubicar controlador OData
- `src/core/category/controller/category.odata.controller.ts` extendiendo `ODataControler`,
  `allowedMethod: ["get","post","patch","delete"]`, `setMaxTop(100)`.

### 1.3 Crear `service/category.service.ts` (OData-first, DTO-validado)
- `findAll` / `findById` / `create` (valida `CategoryCreateDTO`) / `update` (valida `CategoryUpdateDTO`)
  / `remove`, usando `odataWriteService` y la instancia Sequelize del datasource.

### 1.4 Registrar el dominio
- `src/core/category/main.ts` exporta `CategoryODataModel` + `CategoryODataController`.
- `src/common/service/odata/datasource.ts`: importar `CategoryOData` desde
  `../../core/category/model/category.odata.model.js`.
- `src/common/service/odata/odata.service.ts`: importar `CategoryODataController` desde
  `../../core/category/controller/category.odata.controller.js`.
- **Eliminar** `src/common/service/odata/models/category.odata.model.ts` y
  `src/common/service/odata/controllers/category.odata.controller.ts`.

### 1.5 Validación DTO en escritura
- Igual que F1: validar body con `CategoryCreateDTO`/`CategoryUpdateDTO` antes de escribir;
  400 OData en fallo.

### 1.6 Limpiar REST de `category`
- Eliminar `route/category.route.ts`, `controller/category.controller.ts` (REST),
  `service/category.service.ts` (Sequelize puro).
- Retirar `CategoryRouter` de `src/core/main.ts` (la eliminación total de `/api` queda en F3).

### 1.7 Navegación `$expand` (crítico)
- Verificar que `ProductOData.category` (`@BelongsTo`) y `CategoryOData.products` (`@HasMany`)
  siguen apuntando a las clases reubicadas (`core/...`). Ajustar los `import` de los decoradores
  de navegación en ambos modelos.
- Tests de `odata-expand.integration.test.ts` deben seguir en verde (ambas direcciones + recorte).

### 1.8 Tests
- Eliminar `src/__tests__/integration/category.api.test.ts` si existe (REST).
- Verificar suites OData de category en verde.
- Añadir test de `POST /odata/category-odata` con body inválido → 400 OData.

---

## 2. Criterios de aceptación

- [ ] `core/category/model/category.odata.model.ts` es única fuente de verdad.
- [ ] `core/category/controller/category.odata.controller.ts` con escritura.
- [ ] `core/category/service/category.service.ts` DTO-validado.
- [ ] `odata.service.ts`/`datasource.ts` importan desde `core/category/`.
- [ ] `$expand` en ambas direcciones intacto (tests verdes).
- [ ] `pnpm test` en verde.

---

## 3. Documentación a actualizar al cerrar

- `docs/00-indice.md`: marcar F2 done.
- Este archivo: checklist ✅ + tests.

---

## 4. Siguiente fase

➡️ [`f3-eliminar-capa-rest.md`](f3-eliminar-capa-rest.md)
