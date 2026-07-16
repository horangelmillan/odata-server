# F4 — Consolidar Shared Kernel OData (escritura por dominio, DTO-validada)

> **Fase:** F4 · **Esfuerzo:** Medio · **Sesión:** 5/8
> **Depende de:** F3.
> **Actualiza:** `docs/02-patrones/05-odata-module-pattern.md`, `docs/00-indice.md`, este archivo.
> **Herramienta MCP:** `codebase-memory` (trace `CALLS` desde `main.ts`/rutas).

---

## 0. Objetivo

Unificar la escritura OData en una sola ruta de primera clase **validada por DTO por dominio**,
eliminando el cast frágil a `dataSource.sequelizerAdaptor.sequelize.models[...]` que hoy hace
`odata-write.service.ts`. El `common/service/odata/` queda como **shared kernel** (infra
transversal), y cada dominio aporta su servicio + DTO.

---

## 1. Estado actual (a refactorizar)

`src/common/service/odata/odata-write.service.ts` resuelve el modelo Sequelize así:
```ts
const sqModel = this.sequelize().models[meta.tableMetadata.tableIdentifier];
```
y `odata-write.routes.ts` llama `odataWriteService.create(model, req.body, tx)` **sin validar DTO**.
La whitelist de columnas se deriva de `model.getMetadata()` (OK), pero el body no se valida.

---

## 2. Pasos detallados

### 2.1 Validación DTO en el servicio de dominio
- `core/product/service/product.service.ts.create(dto)`:
  1. `validate(dto, ProductCreateDTO)` (helper de `class-validator`).
  2. Si falla → lanzar `HttpException(400, ...)` o devolver `oDataError(400,...)`.
  3. `odataWriteService.create(ProductODataModel, plain, tx)`.
- Igual para `category` (`CategoryCreateDTO`/`CategoryUpdateDTO`).

### 2.2 Quitar el cast a `.models[tableIdentifier]`
- El `ODataBaseModel` ya expone `getMetadata()`; en F1/F2 los servicios de dominio conocen la
  clase concreta. Pasar el **modelo Sequelize real** (obtenido tipado) en vez de buscar por
  `tableIdentifier` en el mapa. Opcional: exponer `dataSource.getSequelizeModel(Model)` tipado.
- Si se mantiene la búsqueda por `tableIdentifier`, documentar por qué (sigue siendo válido y
  evita importar Sequelize en el shared kernel).

### 2.3 Rutas de escritura directa apuntan al servicio de dominio
- `odata-write.routes.ts` → delega en `productService`/`categoryService` (no en `odataWriteService`
  genérico directo), para que la validación DTO viva en el dominio. El `odataWriteService` queda
  como utilidad interna del shared kernel (transacciones, etag, whitelist).

### 2.4 Consolidar shared kernel
- `common/service/odata/` contiene solo infra: `datasource.ts`, `odata.service.ts`,
  `odata-write.service.ts` (base), `odata-write.routes.ts`, `odata-error.ts`, `odata-etag.ts`,
  `odata-format.ts`, `odata-metadata.ts`. Sin `models/` ni `controllers/` por dominio.
- El `ExpressRouter` factory en `odata.service.ts` recibe los controladores importados desde
  `core/<dominio>/controller/`.

### 2.5 Trace de dependencias (codebase-memory)
- Confirmar que `main.ts` → `odata.service.ts` → controladores de `core/`. No queda ningún
  `import` a `core/*/route` ni a `common/service/ORM`.

### 2.6 Tests
- `POST /odata/product-odata` con body inválido → 400 con forma OData estándar
  (`{ error: { code, message, target?, details[] } }`).
- `POST /odata/category-odata` análogo.
- Suites existentes de escritura/etag/error en verde.

---

## 3. Criterios de aceptación

- [x] Escritura validada por DTO en `product.service` y `category.service`.
- [x] Sin cast frágil a `.models[tableIdentifier]` (o documentado y justificado).
- [x] `common/service/odata/` es solo infra (sin modelos/controladores de dominio).
- [x] Errores de validación → 400 OData estándar.
- [x] `pnpm test` en verde.

### 3.1 Notas de la implementación

- **Validación DTO en el dominio (2.1):** `core/product/service/product.service.ts` y
  `core/category/service/category.service.ts` validan `ProductCreateDTO`/`ProductUpdateDTO` y
  `CategoryCreateDTO`/`CategoryUpdateDTO` con `class-validator` vía `transformAndValidate`, y
  lanzan `JSONValidatorException` en fallo. `create`/`update` devuelven `WriteResult`.
- **Cast frágil (2.2):** el modelo de `@phrasecode/odata` (`getBaseModel()`) **NO** es un
  `ModelStatic` de Sequelize — solo expone `getMetadata()`. Por eso el SequelizerAdaptor define
  el modelo Sequelize por separado y lo indexa en `sequelize.models[tableIdentifier]`. El cast
  frágil `dataSource.sequelizerAdaptor.sequelize.models[tableIdentifier]` se mantiene pero
  **centralizado y tipado** en `ODataWriteService.resolveSequelizeModel(model)`, documentado en
  `odata-write.service.ts`. Alternativa considerada: exponer `dataSource.getSequelizeModel(Model)`,
  pero requeriría parchear la API de la librería; se descartó para no ampliar el parche.
- **Delegación de rutas (2.3):** `odata-write.routes.ts` ya NO importa ni valida DTOs ni llama a
  `odataWriteService.create/update` directo. Mapea `endpoint -> { productService, categoryService }`
  y delega; captura `JSONValidatorException` y responde 400 OData v4 estándar. `odataWriteService`
  queda como utilidad interna (transacciones, etag, whitelist).
- **Shared kernel (2.4):** `common/service/odata/` contiene solo infra
  (`datasource`, `odata.service`, `odata-write.service` base, `odata-write.routes`,
  `odata-error`, `odata-etag`, `odata-format`, `odata-metadata`). Los modelos/controladores de
  dominio residen en `core/<dominio>/`.
- **Trace (2.5):** `codebase-memory` confirma `main.ts -> odata.service.ts -> registerWriteRoutes`
  y controladores de `core/`. No hay imports a `core/*/route` ni a `common/service/ORM` en `src/`.
- **Tests (2.6):** `odata-write-validation.api.test.ts` (POST/PATCH inválido -> 400 OData) en
  verde, junto con las suites de escritura/etag/error/batch/count. `pnpm test`: 143 passed, 1 todo
  (mismo conteo que el baseline F3). `tsc --build` presenta los mismos errores preexistentes que
  en F3 (bcrypt types, vitest globals, IDbConfig, ExpressRouter patch) — no introducidos por F4.

---

## 4. Documentación a actualizar al cerrar

- `docs/02-patrones/05-odata-module-pattern.md`: actualizar la sección "Module Structure" para
  reflejar que modelos/controladores viven en `core/<dominio>/` y `common/service/odata/` es shared kernel.
- `docs/00-indice.md`: marcar F4 done.
- Este archivo: checklist ✅.

---

## 5. Siguiente fase

➡️ [`f5-documentacion.md`](f5-documentacion.md)
