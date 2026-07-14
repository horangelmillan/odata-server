# Plan de compatibilidad SAPUI5/OpenUI5 — odata-server

> Branch: `feat/odata-sapui5-compat`  
> Tag final: `v1.1.0`  
> Inicio: 2026-07-14

## Objetivo

Lograr compatibilidad 100% con SAPUI5/OpenUI5 OData v4, parcheando `@phrasecode/odata` v0.3.1 para cubrir las features que la librería no implementa de serie.

---

## Checklist de fases

| # | Fase | Descripción | Estado |
|---|---|---|---|
| A | Ruta por key | `GET /entityset/:id` para acceso a registro individual | ✅ |
| B | Endpoint `/$count` | `GET /entityset/$count` que devuelve el número total | ✅ |
| C.1 | Bypass SAPUI5 `$batch` | Documentar `groupId: "$direct"` como solución temporal | ✅ |
| C.2 | Endpoint `/$batch` | Middleware propio para `POST /$batch` multipart (solo lectura/GET) | ✅ |
| C.3 | Robustez `/$count` codificado | Middleware de normalización `%24`→`$` en `odata.service.ts` (mitiga bug de path encoding) | ✅ |
| D | Navigation properties | Decoradores `@BelongsTo`/`@HasMany` en modelos OData | ✅ |
| E | Tests | Tests unitarios + integración de todas las fases | ✅ |
| F | Documentación + merge | `docs/14-*.md`, README, merge a master, tag `v1.1.0` | 📝 docs ✅ · merge/tag pendiente |

---

## Resumen de sesiones

### Sesión 1 — Fase A: Ruta por key (2026-07-14)

**Qué se hizo:**
- Se creó el branch `feat/odata-sapui5-compat`
- Se parcheó `ExpressRouter.setUpODataRouters()` para registrar `router.get('/:id', ...)`
- La ruta extrae el `:id` de la URL, lo convierte en `$filter=id eq :id` y lo pasa al `QueryParser`
- El `scripts/patch-odata.mjs` se actualizó para aplicar el parche automáticamente vía postinstall

**Decisiones técnicas:**
- Se usó el patrón `/:id` (no `(/:id)`) porque Express no maneja paréntesis en rutas de forma natural
- La conversión a `$filter` se hace inyectando el parámetro en el query string original
- Si el usuario ya incluye `$filter` junto con `:id`, se rechaza con 400 (no mezclar key access con filter)
- El `@odata.context` se ajusta a `/$metadata#EntitySet/$entity` para que SAPUI5 reconozca la respuesta como entidad individual

**Próxima sesión:** Fase B — Endpoint `/$count`

### Sesión 2 — Fase B: Endpoint `/$count` (2026-07-14)

**Qué se hizo:**
- Se parcheó `ExpressRouter.setUpODataRouters()` para registrar `router.get('/\\$count', ...)`
- La ruta reutiliza el soporte nativo de `$count=true` de la librería: construye una URL con `$count=true` más los query params originales (incluido `$filter`), la pasa al `QueryParser` y llama a `controller.get()`
- Devuelve el valor de `@odata.count` como texto plano (`Content-Type: text/plain`), según el estándar OData v4
- La librería resuelve el count con un `SELECT COUNT(*)` separado (`model.count()`) usando el mismo `where`/`include` pero sin `limit`/`offset`, así que el filtro se aplica correctamente y la paginación (`$top`/`$skip`) no afecta el total

**Decisiones técnicas:**
- **El `$` debe escaparse en la ruta:** Express/`path-to-regexp` interpreta `$` como el ancla de fin-de-cadena. `router.get('/$count')` compila a `/^\/$count\/?$/i`, que nunca hace match. La solución es `router.get('/\\$count')` (en el archivo generado quedan dos `\` → la cadena JS es `/\$count` → `path-to-regexp` trata `$` como literal). Esto requiere `\\\\$count` en el template literal de `patch-odata.mjs`
- **Orden de rutas importa:** `/$count` se registra **antes** de `/:id`, porque `/:id` haría match de `$count` como valor del parámetro `id` (Express evalúa las rutas en orden de registro)
- Se verificó manualmente contra el servidor real: `/$count` → total; `/$count?$filter=precio gt 100` → filtrado; `/$count?$filter=precio gt 9999` → `0`; la ruta por key `/1` (Fase A) sigue funcionando

**Verificación:** `pnpm test` → 88 tests OK (en su momento). Tras las Fases A/B/C.1/C.2 el total es 116 tests OK. Pruebas manuales de `/$count` (con y sin `$filter`) correctas.

**Próxima sesión:** Fase C.1 — Bypass SAPUI5 `$batch` (documentar `groupId: "$direct"`)

### Sesión 3 — Fase C.1: Bypass SAPUI5 `$batch` (2026-07-14)

**Qué se hizo:**
- Se documenta la solución temporal para que SAPUI5 **no** envíe las mutaciones (POST/PUT/DELETE) por `$batch`: configurar el `groupId` del modelo en `"$direct"`.
- Con `"$direct"`, cada request se manda de forma independiente al endpoint REST/OData correspondiente, evitando depender de un `$batch` completo (con changesets atómicos) que aún no se implementa para escrituras.

**Cuándo aplica:** mientras la Fase C.2 solo cubre `$batch` de **lectura** (GET). Las escrituras siguen yendo por `$direct`.

**Próxima sesión:** Fase C.2 — Endpoint `/$batch` (lectura).

### Sesión 4 — Fase C.2: Endpoint `/$batch` (2026-07-14)

**Qué se hizo:**
- Se creó `src/common/middleware/batch.middleware.ts`: middleware Express que parsea `POST /odata/$batch` (`multipart/mixed`) y responde con el mismo `multipart/mixed` que espera SAPUI5.
- Se registró la ruta en `src/common/service/odata/odata.service.ts` montando `oDataExpressApp.post("/\\$batch", BatchMiddleware.handler(batchRegistry))`, construyendo un `batchRegistry` (`Map<entitySet, controller>`) a partir de los controladores OData.
- El dispatch **reusa los controladores OData directamente**: para cada sub-request se construye `new QueryParser(queryString, controller.getBaseModel())` y se llama `controller.get(queryParser)` — el mismo camino que las rutas parcheadas de las Fases A/B. No se re-dispatcha por HTTP.
- Soporta: GET de colección, GET con `$filter`/`$top`/`$skip`, acceso por key (`/entitySet(key)`) y changesets anidados (`multipart/mixed` dentro de `multipart/mixed`) con GETs.
- Errores por sub-request: `404` (entity set desconocido), `405` (método no GET), `415` (Content-Type de parte no soportado), `400` (Content-Type del `$batch` inválido).

**Decisiones técnicas:**
- **`busboy` se descartó.** La librería solo soporta `multipart/form-data`, no `multipart/mixed` (que es lo que usa OData `$batch`); lanza `Unsupported content type: multipart/mixed`. Se implementó un parser `multipart/mixed` enfocado y **sin dependencia externa** (el body de `$batch` es texto, no binario).
- **Codificación:** el parser de `@phrasecode/odata` espera el `$filter` **URL-encodeado** (`%20`/`+`), no con espacios literales. El middleware normaliza el query con `URLSearchParams` antes de construir el `QueryParser` (el KNOWN ISSUE §5 de `docs/pruebas-odata-product.md` se verificó contra BD real: la colección `$filter` **sí funciona**; el bug real documentado allí es el `$count` codificado, mitigado en la Sesión 6).
- **Límites de seguridad (rules/02-security.md + 03-development.md):** `MAX_PARTS = 100` (cap de sub-requests), `MAX_DEPTH = 5` (cap de anidamiento de changesets), Content-Type del `$batch` validado (debe ser `multipart/mixed` con boundary). No se deshabilita TLS ni se loguean tokens.
- **robustez del request line:** la URL del sub-request se reconstruye uniendo los tokens entre el método y `HTTP/x.x`, para tolerar URLs no encodeadas (un espacio cortaría el token).

**Verificación:** `pnpm test` → 116 tests OK (7 nuevos en `odata-batch.api.test.ts`, con `dataSource` mockeado, igual que las pruebas de Fase A/B). Tests de: GET de colección, `$filter`, key-access, changeset anidado, 404, 405 y Content-Type inválido.

**Notas / pendientes:**
- Alcance v1.1.0: `$batch` **solo lectura (GET)**. Las escrituras las cubre el bypass `$direct` de la Fase C.1.
- El KNOWN ISSUE §5 (verificado 2026-07-14 contra Postgres real): la colección `$filter` **funciona**, no crashea. El bug real es `/$count` con `$` codificado (`%24count`), mitigado en la Sesión 6. Las pruebas de `$batch` usan `dataSource` mockeado (aislan el parseo del middleware).
- `pnpm build` (`tsc --build`) tiene errores de tipos **preexistentes** en otros archivos (`bcrypt`, `datasource`, `product.controller`); el proyecto corre con `ts-node` en modo `transpileOnly`, por eso los tests pasan. No es regresión de esta fase.

**Próxima sesión:** Sesión 5 — Verificación contra BD real + bug de `/$count` codificado.

### Sesión 5 — Verificación contra BD real (2026-07-14)

**Contexto:** se levantó Postgres (Docker `servidor-odata-db-1`) y el app (`pnpm dev`) para validar el comportamiento de las Fases A/B/C.2 contra una BD real, no solo con `dataSource` mockeado.

**Qué se verificó:**
- **Colección + `$filter` FUNCIONA** contra BD real: `GET /odata/product-odata?$filter=precio gt 100` → 200 con los registros filtrados. El KNOWN ISSUE §5 ("`$filter` en colección cuelga / timeout") **NO se reproduce**; el doc lo contradice y fue corregido en `docs/pruebas-odata-product.md` §5.
- **`/$count` + `$filter` FUNCIONA** cuando el `$` va sin codificar (formato de SAPUI5).
- **Bug real encontrado:** `/$count` con `$` **URL-encoded** (`%24count`) cae en el handler `GET /:id` (id=`$count`) y da `404 Column $count not found`. Causa: Express no decodifica `%24`→`$` antes del route matching, así que `/%24count` no matchea la ruta `/$count`.
- **Hallazgo de contexto:** `@phrasecode/odata` tiene un build ESM roto (`export * from './controller'` → dir-import no soportado en Node ESM), por lo que el app corre vía CJS (`.js`), que **sí está parcheado**. Por eso key-access y `/$count` funcionan pese a que el `.mjs` no lo está. Los parches viven en `scripts/patch-odata.mjs` (commiteado) y se reaplican en install/dev.

**Próxima sesión:** Sesión 6 — Mitigación del `/$count` codificado.

### Sesión 6 — Mitigación `/$count` codificado (vía B) (2026-07-14)

**Qué se hizo:**
- Se añadió un middleware de normalización en `src/common/service/odata/odata.service.ts`, **antes** de instanciar `ExpressRouter`, que reescribe `req.url` decodificando los tokens OData del path: `%24count`→`$count`, `%24metadata`→`$metadata`, `%24batch`→`$batch`.
- Esto corrige la causa raíz (el path no se decodifica antes del route matching) y cubre los tres tokens de una vez, sin tocar `node_modules` ni el parche.

**Por qué vía B (y no vía A: ruta extra `/%24count`):**
- Vía A solo arregla ese encoding y solo `$count` (`$metadata`/`$batch` quedarían igual); además duplica el handler.
- Vía B es el fix de causa raíz, localizado en código propio, y es robusta para los tres tokens OData del path.

**Verificación:** `pnpm test` → 116 passed (1 todo, 1 skipped). Contra BD real: `/%24count`, `/%24metadata` y `/%24count?%24filter=...` responden correctamente (200, número plano); `/$count` literal sigue OK (sin regresión).

**Decisión de alcance:** la mitigación es **defensiva** (SAPUI5 envía `$count` sin codificar y ya funcionaba); protege contra clientes estrictos RFC que codifican el `$`.

**Próxima sesión:** Fase D — Navigation properties (decoradores `@BelongsTo`/`@HasMany`).

### Sesión 7 — Fase D: Navigation properties (2026-07-14)

**Contexto:** se implementa la Fase D completa (Opción 1 del análisis: dominio `category` REST
completo + navegación OData). Verificado contra Postgres real (Docker `servidor-odata-db-1`)
con un script que siembra datos y ejecuta `$expand` en ambas direcciones vía `DataSource.execute`.

**Qué se hizo (REST, `src/core/category/` — dominio nuevo, uniforme a `product`):**
- `interface/category.interface.ts` → `ICategory { id?, nombre }`.
- `model/category.model.ts` → `db.define("Category", …, { tableName: "categories", timestamps: true })`.
- `dto/category.dto.ts` → `CategoryCreateDTO` / `CategoryUpdateDTO` (`OmitType`).
- `service/category.service.ts` → `implements BaseService` (singleton).
- `controller/category.controller.ts` → handlers `try/catch → next(error)` + `ApiResponse`.
- `route/category.route.ts` → CRUD + `validateBodyWithDTO` en POST/PUT.
- `main.ts` → `CategoryRouter`; registrado en `src/core/main.ts` como `CoreRouter.use("/categories", CategoryRouter)`.

**Qué se hizo (OData, `src/common/service/odata/`):**
- `models/category.odata.model.ts` (`@Table({ tableName: "categories" })` + `@Column`s).
- `controllers/category.odata.controller.ts` (`allowedMethod: ["get"]`, cap `top=100`).
- Decoradores de navegación:
  - `ProductOData` ← `@BelongsTo(() => CategoryOData, { relation: [{ foreignKey: "id", sourceKey: "categoriaId" }] }) category`.
  - `CategoryOData` ← `@HasMany(() => ProductOData, { relation: [{ foreignKey: "categoriaId", sourceKey: "id" }] }) products`.
- `datasource.ts`: `CategoryOData` añadido al array `models`.
- `odata.service.ts`: `CategoryODataController` añadido a `odataControllers`.

**Prerequisito de esquema (Paso 0):** se añadió `categoriaId` (INTEGER, nullable) a
`product.interface`, `product.model`, `product.dto` y `ProductOData`. `server.ts` (`db.sync({ alter: true })`)
crea la columna y la tabla `categories` automáticamente; no se tocó `node_modules`.

**Decisiones técnicas:**
- **`categoria` (STRING) se mantuvo** para no romper datos/queries existentes; `categoriaId` es la FK real hacia `categories`. El `$expand` de SAPUI5 usa `categoriaId`, no el texto.
- **Semántica de la opción de relación** (verificada invirtiendo el mapeo en `core/model.js` + `core/dataSource.js` de la librería): en `@BelongsTo`, `foreignKey` = PK del target y `sourceKey` = columna FK en el source.
- **Test offline de metadata** (`src/__tests__/unit/odata/navigation.metadata.test.ts`, 2 tests): el `$metadata` CSDL expone `ProductOData.category` → `NavigationProperty` → `CategoryOData` con `$ReferentialConstraint: { categoriaId: "CategoryOData/id" }`, y `CategoryOData.products` → `Collection(ProductOData)`.

**Verificación contra BD real:**
- `product?$expand=category` → cada producto trae `category: { id, nombre }` anidado.
- `category?$expand=products` → cada categoría trae `products: [...]`.
- SQL generado correcto: `LEFT OUTER JOIN "products" ON "categories"."id" = "products"."categoriaId"`.
- `pnpm test` → 118 passed (2 nuevos del test de metadata; sin regresión).

**Notas / pendientes (investigados y resueltos en Sesión 8 — ver abajo):**
- **Quirk de naming en `$metadata`** — *Resuelto (no bloqueante).* Ver Sesión 8. La afirmación de que el CSDL emitía `/productodata` (sin guion) **no se reproduce** en el código actual: tanto la ruta registrada como el `$Endpoint` del `$metadata` se derivan de `controller.getEndpoint()` (kebab-case), que convierte `ProductOData` → `product-odata`. Verificado empíricamente (`GET /odata/$metadata` → `$Endpoint: /product-odata`). Ruta y metadata coinciden; SAPUI5 resuelve las URLs correctamente.
- **`$count` + `$expand` combinados** — *Resuelto (no bloqueante).* Ver Sesión 8. La combinación que SAPUI5 emite realmente (`?$expand=category&$count=true`) funciona (200, `@odata.count` + expansión anidada). El `Unsupported relation type for $count` de `adaptors/sequelizer.js:309` es inalcanzable con las relaciones definidas (`belongsTo`/`hasMany` quedan cubiertas por los `if` previos); solo fallan usos avanzados no emitidos por SAPUI5 (p.ej. `$filter=category/$count gt 0`), fuera de alcance para v1.1.0.
- El endpoint OData de category es `/category-odata` (kebab, como `product-odata`).

**Próxima sesión:** Fase E — Tests (unitarios + integración de todas las fases) y Fase F — Documentación + merge a master + tag `v1.1.0`.

---

### Sesión 8 — Fase E (tests de integración) + resolución de pendientes (2026-07-14)

**Contexto:** se levantó Postgres en Docker (`docker compose up -d db`; `servidor-odata-db-1`,
credenciales del `.env`: `postgres`/`postgres`/`odata_dev`) y se investigaron empíricamente los
dos pendientes anotados en Sesión 7 antes del merge.

**Investigación pendiente (1) — quirk de naming en `$metadata`:**
- Se ejecutó `GET /odata/$metadata` contra el servidor real. El CSDL emite
  `ProductOData.$Endpoint = "/product-odata"` y `CategoryOData.$Endpoint = "/category-odata"`.
- Causa: tanto la ruta registrada (`setUpRouters` → `this.app.use(routePath, router)`) como el
  `$Endpoint` del metadata (`buildControllerEndpointInfo` → `controller.getEndpoint()`) usan el
  **mismo** `getEndpoint()`, que aplica `KEBAB_CASE`. `convertStringToKebabCase("ProductOData")`
  inserta el guion en la frontera `t→O` → `product-odata`.
- **Conclusión:** la discrepancia `/productodata` vs `/product-odata` descrita en Sesión 7 **no se
  reproduce**; ruta y metadata coinciden. SAPUI5 construye las URLs a partir del `$Endpoint` del
  metadata, que es correcto. No se requiere cambio de código.

**Investigación pendiente (2) — `$count` + `$expand` combinados:**
- Se probaron las combinaciones realistas contra BD:
  - `product-odata?$expand=category&$count=true` → **200**, con `@odata.count` y `category` anidado.
  - `category-odata?$expand=products($count)` → **200**.
  - `product-odata?$expand=category($count)` → **200**.
  - `category-odata?$expand=products($count)&$count=true` → **200**.
- El `BadRequestError("Unsupported relation type for $count")` de `adaptors/sequelizer.js:309`
  vive en la rama `else` de `buildCountExpression`, que solo se alcanza si `relationType` no es
  `hasMany`/`belongsToMany`/`belongsTo`/`hasOne`. Con las relaciones definidas (`belongsTo` en
  `ProductOData.category`, `hasMany` en `CategoryOData.products`) **nunca se llega a esa rama**.
- Fallan (fuera de alcance): `$filter`/`$select` aplicados a un `$count` de propiedad de navegación
  (p.ej. `?$filter=category/$count gt 0` → 404/500). SAPUI5 **no** emite este patrón; se documenta
  como limitación conocida de la librería, no como bug de nuestro parche.
- **Conclusión:** no se requiere cambio de código; la combinación que usa SAPUI5 funciona.

**Fase E — Tests de integración (`src/__tests__/integration/odata-expand.integration.test.ts`):**
- Test sin BD (regresión del pendiente 1): `GET /odata/$metadata` → `ProductOData.$Endpoint === "/product-odata"`
  y `CategoryOData.$Endpoint === "/category-odata"`.
- Tests de integración contra Postgres (gated con `describe.skipIf` vía `db.authenticate()` en
  tiempo de recolección, para saltar limpiamente sin Docker):
  - `product-odata?$expand=category` → cada producto trae `category` anidado y `categoriaId === category.id`.
  - `category-odata?$expand=products` → cada categoría trae `products: [...]` y `product.categoriaId === category.id`.
  - `product-odata?$expand=category&$count=true` → `@odata.count > 0` + `value[0].category` presente.
- Patrón de sembrado: `db.sync({ alter: true })` + `CategoryModel`/`ProductModel` del dominio
  (misma BD que el DataSource OData), `db.close()` en `afterAll`.
- **Verificación:** `pnpm test` → 122 passed (4 nuevos en `odata-expand.integration.test.ts`;
  sin regresión respecto a los 118 de Sesión 7). Sin Docker, el suite de integración se salta y
  el test de metadata (sin BD) sigue corriendo.

**Fase F (estado):** README y `docs/14-*.md` actualizados (Fases A–E marcadas ✅; naming/`$count+$expand`
resueltos). El **merge a master y el tag `v1.1.0` quedan pendientes de confirmación explícita del
usuario** (no se ejecutan en esta sesión).

**Próxima sesión:** tras confirmación — merge `feat/odata-sapui5-compat` → `master`, tag `v1.1.0`.

---

## Decisiones técnicas globales

| Decisión | Opción elegida | Alternativa descartada |
|---|---|---|
| Formato ruta key | `/:id` (Express friendly) | `(/:id)` — Express no lo interpreta bien |
| Ruta `/$count` | `/\\$count` (escapar `$`) + registrar antes de `/:id` | `/$count` sin escapar — `path-to-regexp` lo trata como ancla de regex |
| Respuesta `/$count` | Texto plano con `@odata.count` | JSON — SAPUI5 espera el número plano |
| Parser para `$batch` | Parser `multipart/mixed` propio (sin dependencia, texto plano) | `busboy` — **solo soporta `multipart/form-data`**, no `multipart/mixed` (OData lo usa) |
| Estrategia `$batch` | Middleware Express propio en `batch.middleware.ts` | Parchar la librería (muy acoplado) |
| Parches a librería | Via `scripts/patch-odata.mjs` (postinstall) | Modificar node_modules a mano (frágil) |
| Robustez `/$count` codificado | Middleware normalización `%24`→`$` en `odata.service.ts` (vía B, antes del route matching) | Ruta extra `/%24count` (vía A: solo cubre un token, duplica handler) |
| KNOWN ISSUE §5 | Verificado contra BD real: colección `$filter` **sí funciona**; el bug real es `/$count` codificado (mitigado en Sesión 6) | — |

---

## Cómo retomar una sesión

```bash
git checkout feat/odata-sapui5-compat
git pull
# Leer este documento para saber dónde se quedó
# Ejecutar pnpm install (aplica parches vía postinstall)
```

Al terminar cada sesión:

```bash
git add .
git commit -m "fase X: descripción del cambio"
git push origin feat/odata-sapui5-compat
```
