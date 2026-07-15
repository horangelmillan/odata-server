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
| G | Recorte de navegación | `$select`/`$filter`/`$orderby`/`$top`/`$skip` sobre navigation properties (ambas direcciones) + combinación con `$count` | ✅ |
| G.1 | Verificación con tráfico SAPUI5 | Peticiones idénticas a `ODataModel` v4 (URL-encode `%2C`, cabeceras `OData-Version`, `$batch` changeset) como punto de control | ✅ |
| H | `$batch` de escritura | Changesets atómicos: escritura propia en OData (POST/PUT/PATCH/DELETE) vía Sequelize dentro de `db.transaction()`, con `Content-ID`, referencias `$<id>` y escritura directa por entidad (`$direct`) | ✅ |
| I | Tipos/fechas EDM + `$format` | Conversión de tipos EDM (`DateTimeOffset`, `Edm.Decimal`, etc.) y soporte de `$format` | ✅ |
| P | Rendimiento (gate merge) | Baseline `v1.1.0` vs `feat` con autocannon; gate de regresión ≤10% en p95/throughput; 0 errores | ⏳ pendiente |
| F | Cierre: merge + tag | Desbloquear `master`, merge de `feat/odata-sapui5-compat`, tag `v1.1.0`. **Bloqueado** hasta A–I ✅ + P ✅ | 🔒 bloqueado |

> **Congelamiento de `master`:** `master` está protegida en GitHub (`lock_branch` + `enforce_admins`, repo público) y no recibe merges hasta cumplir **todas** las condiciones de aceptación: A–I verificadas con tests + fase P (rendimiento) sin regresión ≤10% vs `v1.1.0`. Desbloqueo consciente: `gh api -X DELETE repos/horangelmillan/odata-server/branches/master/protection`.

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

### Sesión 9 — Fase G: Recorte de navegación en `$expand` (2026-07-14)

**Contexto:** se amplía la Fase D para que SAPUI5/OpenUI5 pueda emitir `$expand` de navegación
**con recorte** (proyección/filtro/paginado sobre la propia navegación), en ambas direcciones
(`category → products` hasMany, `product → category` belongsTo). Se verificó contra Postgres real
(Docker `servidor-odata-db-1`) que la librería `@phrasecode/odata` v0.3.1 ya implementa esta
feature de fábrica, por lo que Fase G es verificación + tests + documentación (sin parche).

**Investigación de viabilidad (librería):**
- `serializers/query/parseExpand.js`: `parseExpandItem` + `parseOptions` parsean recursivamente
  `($select=…;$filter=…;$orderby=…;$top=…;$skip=…)` sobre la navegación.
- `adaptors/sequelizer.js` → `buildInclude`: mapea `select`→`attributes`, `filter`→`where`,
  `orderBy`→`order`, `top`→`limit`, `skip`→`offset`, y `expand` anidado → `include` anidado.
- `parseFilter`/`parseSelect`/`parseOrderBy` ignoran el parámetro `table` y usan nombres de
  columna directos; el recorte es puramente a nivel de query (el CSDL no cambia).

**Qué se hizo (tests, `src/__tests__/`):**
- `integration/odata-expand.integration.test.ts`: se extendió el `describe` existente (dueño único
  de los datos de BD, evita carreras entre archivos de integración) con 9 tests de recorte:
  - hasMany: `($select=id,nombre)`, `($filter=precio gt 100)`, `($orderby=nombre asc;$top=2)`,
    `($top=2;$skip=1)`, combinación `($select=id,nombre;$top=2;$filter=precio gt 10;$orderby=nombre)`,
    y `($select=id,nombre)&$count=true`.
  - belongsTo: `($select=id,nombre)` y `($filter=nombre eq 'Electrónica')`.
  - coexistencia de `$select` a nivel raíz + `$expand=category` anidado.
- `unit/odata/expand-projection.metadata.test.ts` (2 tests, **sin BD**): el recorte no altera el
  CSDL — `CategoryOData.products` y `ProductOData.category` siguen como `NavigationProperty`.
- Patrón de sembrado: `db.sync({ alter: true })` + `CategoryModel`/`ProductModel`; un solo
  `describe.skipIf(!dbAvailable)` con `db.authenticate()` en tiempo de recolección; `db.close()` en
  `afterAll`. Sin Docker, el suite de integración se salta limpio y el de metadata sigue corriendo.

**Hallazgos / riesgos resueltos:**
- **Riesgo FK en `hasMany` con `$select` restringido — NO se reproduce.** Se verificó empíricamente
  que Sequelize auto-incluye la columna FK (`categoriaId`) del `include` aunque `attributes` esté
  recortado, por lo que los hijos se agrupan correctamente bajo su padre (el test
  `($select=id,nombre)` devuelve los 3 productos de `Electrónica`). **No hace falta parche** en
  `buildInclude` (el Parche G previsto en el plan se descarta).
- **`$filter`/`$orderby` anidado con columna ambigua en JOIN — fuera de alcance.** `buildWhere`/
  `buildOrderBy` emiten `col("nombre")` sin scope de alias; para los modelos actuales
  (`category` no duplica columnas de `product`) no hay ambigüedad. Si apareciera, se documentaría
  como limitación conocida (no bloquea a SAPUI5 estándar).

**Verificación:**
- `pnpm test` con Postgres (Docker): 133 passed (9 nuevos de Fase G en integración + 2 de metadata;
  sin regresión respecto a los 122 de Sesión 8).
- `pnpm test` sin Docker: el suite de integración se salta (`describe.skipIf`); el de metadata corre.
- El `build` (`tsc`) mantiene la deuda preexistente en otros archivos (`bcrypt`/`datasource`/
  `product.controller`); el app corre con `ts-node transpileOnly`, así que no es regresión de Fase G.

**Notas:** no se modificó `scripts/patch-odata.mjs`, `odata.service.ts`, modelos ni controladores
OData — la librería ya soportaba el recorte. Fase G es transparente para el resto del sistema.

**Próxima sesión (candidatos):** Fase H — `$batch` de escritura con changesets atómicos (la librería
no tiene ruta de escritura: requeriría despachar changesets a los servicios REST dentro de
`db.transaction()` y componer respuestas OData con `Content-ID`); o Fase I — conversión de
tipos/fechas EDM (`/Date(...)/`, `DateTimeOffset`) + `$format`.

---

### Sesión 10 — Verificación con tráfico real de SAPUI5/OpenUI5 (2026-07-14)

**Contexto:** tras implementar Fase G, se validó el comportamiento contra peticiones **idénticas a las
que genera `sap.ui.model.odata.v4.ODataModel`** (SAPUI5/OpenUI5), no solo contra URLs "limpias". El
objetivo es tener un **punto de control de compatibilidad** que sirva de referencia para probar este
servidor contra un proyecto UI5 real (ver "Proyecto de prueba UI5" más abajo).

**Cómo emite SAPUI5 sus lecturas OData v4 (comportamiento observado):**
- **Cabeceras:** `OData-Version: 4.0` y `Accept: application/json;odata.metadata=minimal`.
- **Codificación de la query:** SAPUI5 URL-encodea las opciones — la coma se envía como `%2C` y el
  espacio como `%20` (ej. `$expand=products($select=id%2Cnombre)`). El signo `$` NO se codifica.
- **Transporte por defecto:** SALVO que se configure `groupId: "$direct"`, SAPUI5 envía las lecturas
  por **`POST /odata/$batch`** (multipart/mixed con un changeset anidado), no por `GET` directo. Por
  tanto, para validar compatibilidad real hay que ejercitar **ambas** rutas.

**Resultados (servidor real, Postgres Docker):** todas las variantes de Fase G devolvieron `200` con
el recorte aplicado correctamente, tanto por `GET` directo (formato codificado) como por `$batch`
(changeset con `$expand` anidado codificado). La ruta `$batch` delega en el mismo `controller.get()`
que el `GET` directo, por lo que el recorte es idéntico en ambas.

**Ajuste de robustez aplicado (`src/common/middleware/batch.middleware.ts`):** se añadió
`decodeURIComponent(queryString)` antes de `new QueryParser(...)`, simétrico al decode del router
parcheado de `@phrasecode/odata`. Hace que el `$batch` maneje de forma consistente paréntesis
codificados (`%28`/`%29`) en `$expand` anidados, igual que la ruta `GET` directa. Es defensivo y no
rompe la suite (133 tests en verde).

**Tests automatizados de punto de control (Fase G):** en
`src/__tests__/integration/odata-expand.integration.test.ts` se añadieron dos `it` que reproducen el
tráfico SAPUI5 de forma determinista (gated `describe.skipIf(!dbAvailable)`):
- `SAPUI5: GET con opciones URL-encodeadas (%2C) aplica el recorte` — `GET /odata/category-odata?$expand=products($select=id%2Cnombre)&$select=id%2Cnombre` con cabeceras `OData-Version`/`Accept`.
- `SAPUI5: $batch (changeset) con $expand anidado codificado aplica el recorte` — `POST /odata/$batch` multipart/mixed con changeset, extrayendo el JSON interno de la respuesta.

> **Nota de depuración:** al simular manualmente el `$batch` con scripts de shell, un here-string mal
> escapado puede inyectar un backtick literal (`` `$expand ``) que invalida el parámetro y hace que el
> `$expand` se ignore (falso "fallo"). En los tests automatizados (TS) no hay ese riesgo.

**Proyecto de prueba UI5 (idea documentada):** estas consultas son el **contrato de compatibilidad**
que se puede usar como punto de control para validar el servidor contra una app SAPUI5/OpenUI5 real
(``List``/``Table`` con `ODataModel` v4 bindeado a `/odata`). Sirve para detectar regresiones de
compatibilidad antes de tocar el cliente.

**Opciones óptimas para el punto de control (recomendadas, en orden):**
1. **Tests de integración que reproducen el tráfico SAPUI5 (YA HECHO aquí).** Es la opción más
   barata y repetible: corre en CI sin cliente, con `describe.skipIf(!dbAvailable)`. Mantiene el
   "contrato" como código. *Mejora:* añadir más variantes SAPUI5 (paginado de lista con
   `$skip`/`$top` a nivel raíz, `$count=true` por defecto en SmartControls, `$expand` con `$select`
   de ruta `products/id`).
2. **App UI5 de prueba + OData V4 Mock Server (`@sapui/mockserver` / `sap.ui.core.util.MockServer`
   o el de `ui5-tooling`).** Permite validar la *vista* (bindings, `$apply`, `@odata.etag`) contra un
   mock offline y luego apuntar el mismo `ODataModel` al servidor real (`/odata`) para validar
   extremo-a-extremo. Es lo más fiel a producción sin depender de este repo.
3. **Colección de Postman / archivo `.http` (REST Client de VS Code).** Guarda las queries exactas
   (codificadas + cabeceras) como punto de control manual punto-a-punto; útil para demos y para que
   un QA reproduzca sin levantar UI5.
4. **`sap.ui.model.odata.v4.ODataModel` en un mini-proyecto con `groupId:"$direct"` Y otro con
   changeset por defecto.** Compara ambas rutas (GET vs `$batch`) contra el servidor para confirmar
   paridad — cubre exactamente lo verificado en esta sesión.

**Decisión:** se adopta la opción 1 como punto de control automatizado (ya integrado) y se documenta
la opción 2/3/4 como siguiente paso para validación visual fina con un cliente UI5 real.

---

### Sesión 11 — Fase H: `$batch` de escritura (changesets atómicos) + escritura directa (2026-07-15)

**Contexto:** `@phrasecode/odata` v0.3.1 no expone ruta de escritura. En vez de delegar el changeset a
los servicios REST (`core/`), se implementó **escritura propia en OData** reutilizando la MISMA
instancia Sequelize del datasource (`dataSource.sequelizerAdaptor.sequelize`), para que la escritura
comparta conexión/transacción con la lectura.

> **Deuda arquitectónica anotada:** hoy la lógica REST vive en `core/<dominio>` y los modelos/
> controllers OData en `common/`. Lo consistente sería que OData sea la capa de escritura de primera
> clase (o al revés, unificar). Se documenta para planificar el cambio en otro ciclo; **no** se aborda
> aquí para no ampliar el alcance de la rama de compatibilidad.

**Implementación:**
- `src/common/service/odata/odata-write.service.ts` (NUEVO): `create`/`update`/`remove` +
  `runInTransaction`. Deriva la whitelist de columnas y la PK desde `model.getMetadata()`
  (`columnMetadata`: `isPrimaryKey`, `isAutoIncrement`, `propertyKey`), ignorando columnas
  auto-incrementales en el `create`.
- `src/common/middleware/batch.middleware.ts` (REESCRITO a `BatchMiddleware.handler(registry)`):
  - Un `multipart/mixed` con **solo GETs** (SAPUI5 envuelve lecturas así) se procesa como lectura
    **sin** abrir transacción; el GET se despacha con el mismo `controller.get()` que la ruta directa.
  - Un changeset con **escrituras** corre dentro de `runInTransaction`: atomicidad total (rollback
    completo ante cualquier fallo), mapa `Content-ID` para referencias `$<id>` (deep-create), y
    `Location: /odata/<entidad>(<key>)` en el 201.
  - Fuera de un changeset solo se admite GET; cualquier otro método → **405** (contrato Fase C.2).
- `src/common/service/odata/odata-write.routes.ts` (NUEVO): `registerWriteRoutes(router, controllers)`
  para escritura directa por entidad (`POST /odata/<e>`, `PATCH|PUT|DELETE /odata/<e>/:id`), útil con
  `groupId: "$direct"` de SAPUI5. Se registra en `odata.service.ts` tras la ruta `$batch`.

**Bugs corregidos durante la verificación:**
- **Comodín SQL en el `afterEach` de tests:** `LIKE 'H_%'` borraba la categoría seed **"Hogar"**
  (`_` es comodín de un carácter en LIKE). Se escapó a `LIKE 'H\_%'` para matchear el prefijo literal
  `H_` y no tocar el seed de las Fases E/G.
- **GET en changeset:** al principio se rechazaba con 405; se corrigió a lectura para no romper el
  contrato Fase C.2/SAPUI5 (que envuelve lecturas en `multipart/mixed`).
- **Top-level no-GET:** debía ser **405** (no 400) según el test de Fase C.2.

**Tests (8 nuevos, en `odata-expand.integration.test.ts`, gated por BD):** changeset POST (201 +
`Location` + `Content-ID`), PATCH (200), DELETE (204), **rollback atómico** ante fallo, resolución de
referencia `Content-ID` (`$1`), GET-en-changeset tratado como lectura, escritura directa
`POST/PATCH/DELETE`, y PATCH a inexistente → 404.

**Resultado:** `pnpm test` → **143 passing + 1 todo** (135 base + 8 Fase H), 23 test files en verde,
contra Postgres (Docker). Sin regresiones en las suites A–G.

**Pendiente de la sesión:** actualizar `README.md`; luego Fase I (tipos/fechas EDM + `$format`) y
Fase P (gate de rendimiento) antes del merge a `master`.

---

### Sesión 12 — Fase I: tipos EDM (`DateTimeOffset`, `Edm.Decimal`) + `$format` (2026-07-15)

**Contexto:** dos gaps de compatibilidad SAPUI5 en la lectura OData: (1) `$format` era rechazado con
**400** por `validateBasicParameters` de `@phrasecode/odata` (no está en su whitelist de `$`-params);
(2) las fechas Sequelize `DATE` (timestamp) se tipaban como `Edm.Date` en el `$metadata`, cuando SAPUI5
espera `Edm.DateTimeOffset` para valores con hora.

**Implementación:**
- `src/common/service/odata/odata-format.ts` (NUEVO): `stripFormat(query)` elimina `$format`/`%24format`
  del query **sin re-codificar** el resto (regex, no `URLSearchParams.toString()` que rompería
  `$filter` al convertir espacios en `+`). Devuelve `unsupported: true` si el valor no es JSON.
- `src/common/service/odata/odata.service.ts`: pre-middleware que aplica `stripFormat`; `$format=json`
  (o `application/json`) → se elimina y continúa; cualquier otro formato → **415**.
- `src/common/middleware/batch.middleware.ts` (`dispatchRead`): misma negociación dentro del `$batch`
  (JSON se ignora, no-JSON → bloque 415).
- `scripts/patch-odata.mjs` (**Parche 3**, marcador `PATCHED-EDMDATE-v1`, idempotente): `mapToEdmType`
  distingue `DATEONLY` (→ `Edm.Date`) de `DATE`/`DATETIME`/`TIMESTAMP` (→ `Edm.DateTimeOffset`).
- `src/common/service/odata/models/product.odata.model.ts`: expone `createdAt`/`updatedAt`
  (`DataTypes.DATE`) como `Edm.DateTimeOffset`; se serializan ISO 8601 (`Date.toJSON`).

**Notas EDM:** `precio` (DECIMAL) ya se tipaba `Edm.Decimal` y pg lo devuelve como **string** — correcto
para SAPUI5 (`IEEE754Compatible`). Se decidió mantener fechas en **ISO 8601** (ya compatible con
ODataModel v4), sin convertir al legacy `/Date(...)/` de OData v2.

**Tests (5 nuevos en `odata-expand.integration.test.ts`):** sin BD — `$metadata` tipa `precio`
`Edm.Decimal` y `createdAt`/`updatedAt` `Edm.DateTimeOffset`, `$format=json` aceptado (200),
`$format=xml` → 415; con BD — `createdAt`/`updatedAt` en ISO 8601, `$format=json` sobre datos → 200.

**Resultado:** `pnpm test` → **148 passing + 1 todo** (143 + 5 Fase I), 23 test files en verde contra
Postgres (Docker). Sin regresiones. `tsc` conserva solo errores preexistentes (ninguno en archivos I).

**Pendiente:** actualizar `README.md`; Fase P (gate de rendimiento ≤10% vs `v1.1.0`) antes del merge.

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
