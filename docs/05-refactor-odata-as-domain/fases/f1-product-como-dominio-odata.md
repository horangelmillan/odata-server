# F1 — `product` como dominio OData (OData-first)

> **Fase:** F1 · **Esfuerzo:** Medio · **Sesión:** 2/8
> **Depende de:** F0 (rama creada, baseline registrado).
> **Actualiza:** `docs/02-patrones/11-example-module-product.md`, `docs/00-indice.md`, este archivo.

---

## 0. Objetivo

Convertir el dominio `product` en **OData-first**: el modelo `@phrasecode/odata` se vuelve la
única fuente de verdad (se elimina el `db.define` de Sequelize), y el dominio gana `service`
(DTO-validado) y se reubica en `core/product/` con la misma estructura de carpetas que usaba
REST. La escritura OData pasa a validarse con `class-validator` (hoy acepta cuerpo sin validar).

**No se rompe nada:** `/odata/product-odata` sigue respondiendo igual (mismo kebab, `$metadata`,
`$expand`, etag). Solo se reubica código y se añade validación.

---

## 1. Análisis previo (texto actual)

- `src/common/service/odata/models/product.odata.model.ts` → modelo `@Table/@Column` (fuente de verdad).
- `src/common/service/odata/controllers/product.odata.controller.ts` → `ODataControler`, `allowedMethod: ["get"]`.
- `src/common/service/odata/datasource.ts` → importa `ProductOData` y lo registra en `models: [...]`.
- `src/common/service/odata/odata.service.ts` → `new ProductODataController()` en `odataControllers`.
- `src/core/product/model/product.model.ts` → `db.define("Product", ...)` (REDUNDANTE).
- `src/core/product/service/product.service.ts` → `implements BaseService` (Sequelize puro).
- `src/core/product/dto/product.dto.ts` → `ProductCreateDTO` / `ProductUpdateDTO` (ya existe, reutilizable).
- `src/core/product/interface/product.interface.ts` → `IProduct`.

---

## 2. Pasos detallados

### 2.1 Confirmar API de `@phrasecode/odata` (context7)
Antes de mover, verificar con context7 la firma actual de:
- Decoradores `@Table({ tableName })` / `@Column({ dataType, isPrimaryKey, isAutoIncrement })`.
- `ODataControler` → `super({ model, allowedMethod })`, método `get(query: QueryParser)`,
  `this.queryable<ProductOData>(query)`, `setMaxTop(n)`.
- `DataSource` → config (`models: [...]`) y cómo exponer `sequelizerAdaptor.sequelize` para sync.

### 2.2 Reubicar modelo OData a `core/product/model/`
- Crear `src/core/product/model/product.odata.model.ts` con el contenido actual de
  `src/common/service/odata/models/product.odata.model.ts` (incluye `createdAt`/`updatedAt`
  como `Edm.DateTimeOffset` y la navegación `@BelongsTo(() => CategoryOData, ...)`).
- **Eliminar** `src/core/product/model/product.model.ts` (el `db.define` redundante).

### 2.3 Reubicar controlador OData a `core/product/controller/`
- Crear `src/core/product/controller/product.odata.controller.ts` extendiendo `ODataControler`.
- Cambiar `allowedMethod` a `["get","post","patch","delete"]` para habilitar escritura por entidad
  (el `$batch` ya lo cubre; esto alinea con la Fase H existente de escritura directa).
- Mantener el `setMaxTop(100)` y el `get()` con `injectEtag` si aplica.

### 2.4 Crear `service/product.service.ts` (OData-first, DTO-validado)
Orquesta lectura y escritura usando la instancia Sequelize del datasource (sin duplicar pool):
- `findAll(queryParser)` → `controller.queryable(query)` (o reusar `ODataControler.get`).
- `findById(id)` → build `$filter=id eq :id`.
- `create(dto)` → validar con `ProductCreateDTO` (`class-validator`/`validate` o el
  `ValidatorMiddleware` adaptado) → escribir vía `odataWriteService.create(model, plain, tx)`.
- `update(id, dto)` → validar `ProductUpdateDTO` → `odataWriteService.update(...)`.
- `remove(id)` → `odataWriteService.remove(...)`.
- El servicio es un `const` singleton exportado (patrón del proyecto).

### 2.5 Registrar el dominio
- `src/core/product/main.ts`: exporta `ProductODataModel` y `ProductODataController` para que
  `odata.service.ts` los importe (en vez de desde `common/service/odata/models|controllers`).
- `src/common/service/odata/datasource.ts`: importar `ProductOData` desde
  `../../core/product/model/product.odata.model.js`.
- `src/common/service/odata/odata.service.ts`: importar `ProductODataController` desde
  `../../core/product/controller/product.odata.controller.js`.
- **Eliminar** `src/common/service/odata/models/product.odata.model.ts` y
  `src/common/service/odata/controllers/product.odata.controller.ts`.

### 2.6 Validación DTO en escritura (F4 hace lo genérico; aquí el caso product)
- En `odata-write.routes.ts` (o en el nuevo `product.service`), validar el body con
  `ProductCreateDTO`/`ProductUpdateDTO` antes de escribir. Reusar el helper de validación existente
  (`src/common/middleware/json-validator.middleware.ts` → `ValidatorMiddleware.validateBodyWithDTO`).
- Si la validación falla → `oDataError(400, "Validation failed", detalles)` (formato OData v4 estándar).

### 2.7 Limpiar REST de `product`
- Eliminar `src/core/product/route/product.route.ts`, `src/core/product/controller/product.controller.ts`
  (REST), `src/core/product/service/product.service.ts` (Sequelize puro, reemplazado por el OData-first).
- `src/core/main.ts`: **no** quitar aún `/products` (F3 lo hace global); pero como el route/controller
  REST desaparecen, retirar `ProductRouter` de `core/main.ts` en esta fase para no dejar import roto.
  (La eliminación total de `/api` queda en F3.)

### 2.8 Tests
- Eliminar `src/__tests__/integration/product.api.test.ts` (REST).
- Verificar que `odata.api.test.ts`, `odata-expand.integration.test.ts`, `odata-batch.api.test.ts`,
  `odata-count*.api.test.ts` siguen en verde.
- Añadir (o extender) un test de integración que valide que `POST /odata/product-odata` con body
  inválido → 400 con forma OData estándar.

---

## 3. Criterios de aceptación

- [ ] `core/product/model/product.odata.model.ts` es la única fuente de verdad (sin `db.define`).
- [ ] `core/product/controller/product.odata.controller.ts` extiende `ODataControler` con escritura.
- [ ] `core/product/service/product.service.ts` orquesta lectura+escritura con validación DTO.
- [ ] `odata.service.ts` y `datasource.ts` importan desde `core/product/`.
- [ ] `GET/POST/PATCH/DELETE /odata/product-odata` funcionan; escritura inválida → 400 OData.
- [ ] `$expand=category`, etag, `$metadata`, `$batch` intactos.
- [ ] `pnpm test` en verde; `product.api.test.ts` (REST) eliminado.

---

## 4. Documentación a actualizar al cerrar

- `docs/02-patrones/11-example-module-product.md`: reescribir el ejemplo para que muestre el
  módulo **OData-first** (model `@Table/@Column` en `core/product/model/`, service DTO-validado,
  controller `ODataControler`), no el REST+dual.
- `docs/00-indice.md`: marcar F1 en progreso/done.
- Este archivo: checklist ✅ + número de tests.

---

## 5. Siguiente fase

➡️ [`f2-category-como-dominio-odata.md`](f2-category-como-dominio-odata.md)
