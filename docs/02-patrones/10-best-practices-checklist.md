# 10 — Checklist de Mejores Prácticas

> **Nota de vigencia (ciclo 15, 2026-07-31; revisada en ciclo 16, 2026-08-01):** la versión original de esta checklist
> pertenecía a la era REST (ciclos 01–04: "OData solo-lectura + REST para escritura").
> El ciclo 05 invirtió deliberadamente ese diseño (**OData-as-domain**: OData es el
> dominio único, lectura **y** escritura en `/odata/*`, sin capa REST), así que la
> checklist original era **engañosora** y fue reescrita alineada a la arquitectura
> vigente. El ciclo 16 (Producción Segura) la vuelve a revisar: common 100%
> genérico (F1), seguridad por entorno con JWT/bcrypt activos en prod (F2) y
> migraciones por dominio con lista explícita (F1/F2).
> La fuente de verdad de la evolución es [`docs/00-indice.md`](../00-indice.md).
>
> Convención: `[x]` = verificado en el proyecto (con evidencia) · `[~]` = decidido no
> aplicar, con motivo · `[ ]` = pendiente o no aplica al contexto actual.

---

## 10.1 Arquitectura (OData-as-domain)

- [x] OData v4 como dominio único: lectura **y** escritura en `/odata/*`, sin capa REST (ciclos 05–06: `f3-eliminar-capa-rest`, PR #1; `/api` residual eliminado en ciclo 15)
- [x] Shared Kernel en `common/` **100% genérico**: cero imports de `core/` (ciclo 16 F1 — test estructural en CI; antes importaba `core/main.js` vía `odata.service.ts`, ciclo 07)
- [x] Registro de dominios centralizado: `core/main.ts` → `domainRegistrations[]`; los modelos viajan en cada registro y el **bootstrap compone** (`odata-models.ts` eliminado en ciclo 16 F1; test de consistencia de registrations, DT1/DT2 ciclo 14)
- [x] Una sola vía de escritura por recurso: `odata-write.routes.ts` + servicios de persistencia (ciclo 07 F1)
- [x] Escrituras transaccionales: `$batch` changesets atómicos + Content-ID (ciclo 06 F6.1, ciclo 08 G4, N19 ciclo 13)
- [x] Sin rutas REST: `GET /api/*` devuelve 404 (montaje eliminado en ciclo 15)

## 10.2 Modelos OData

- [x] Modelos decorados con `@Table` + `@Column` — única fuente de verdad del esquema (13 dominios en `src/core/*/model/`: demo, finance ×10, auth)
- [x] Relaciones con `@HasMany`/`@BelongsTo` (invoice↔items/payments, supplierinvoice↔items/payments; ciclos 06 y 14)
- [x] Named exports (no `export default`)
- [x] Tipo `!` (definite assignment) en propiedades
- [x] Metadata EDMX CSDL 4.01 generada con compat SAPUI5 (`odata-metadata.ts`, ciclos 04–07)
- [~] Vistas SQL (prefijo `VIEW_`) — **no aplica hoy**: volúmenes demo/dev no lo exigen; se evaluará con datos reales (decisión ciclo 15)

## 10.3 Controladores OData

- [x] Extender `ODataControler` (`@phrasecode/odata`) en los 12 dominios
- [x] Límite máximo de resultados: `query.setTop(100)` en todos los controladores
- [x] Custom logic vía override del método `get()` (ej. `computeInvoiceStatus` en escrituras — DAP1 ciclo 11)
- [x] Manejo de errores: try/catch + excepciones tipadas (`HttpException` y subclases: NotFound, Conflict, Database)
- [~] Consultas raw con `@Query` decorator — no usado; los controladores consultan vía servicio/controller genérico (YAGNI)

## 10.4 Capas de dominio

- [x] Dominio en `core/<domain>/` con capas: interface / model / dto / service / controller / main (patrón `docs/02-patrones/05-odata-module-pattern.md`)
- [x] Service implementa `BaseService`; Controller implementa `BaseController`
- [x] DTOs con decoradores `class-validator`; `ValidatorMiddleware.validateBodyWithDTO` en escrituras
- [x] Errores tipados: `HttpException` + `GlobalErrorMiddleware.globalErrorHandler()`
- [~] `ApiResponse`/respuestas REST — restos de la era REST sin consumidores; interfaces conservadas en `common/interface/` sin uso activo (deuda menor, se evaluará su eliminación)

## 10.5 Seguridad

> **Seguridad por entorno (ciclo 16 F2):** `development`/`test` → modo abierto
> (sin auth ni rate-limit); `production` → modo estricto con fail-fast de
> entorno (`SECRET_KEY` ≥32 chars y `CORS_ORIGIN` obligatorias, arranque
> abortado si faltan).

- [x] `helmet()` activado (CSP por defecto; la API solo sirve JSON)
- [x] CORS por entorno: dev abierto; prod restringe `origin === CORS_ORIGIN` (callback; un string fijo no restringe en el paquete `cors`) + `exposedHeaders: ["OData-Version"]`
- [x] Morgan activo (`dev` en desarrollo, `combined` en producción)
- [x] Compression activo
- [x] Stack trace oculto en producción (global-error middleware)
- [x] **JWT + bcrypt activos en modo estricto (prod)**: dominio `src/core/auth/` (tabla `users`, migración 004), `POST /auth/login` (bcrypt.compare + firma JWT), `AuthMiddleware.requireBearerToken()` en `/odata` saltando `$metadata`; `/healthz` público (ciclo 16 F2). Usuarios vía `pnpm auth:create-user` / `seed:auth`
- [x] Fail-fast de entorno en prod: `SECRET_KEY` ausente/<32 chars o `CORS_ORIGIN` ausente → arranque abortado (ciclo 16 F2)
- [x] Rate-limit de escrituras en prod: `express-rate-limit` en `/odata` (POST/PUT/PATCH/DELETE, 100/15min por IP; 0 deps de runtime, IF2 ciclo 16)
- [x] `GET /healthz` público (liveness: ping BD + uptime; 503 si BD down) + healthcheck del servicio `api` en `docker-compose.prod.yml` (ciclo 16 F2/F3)
- [~] CSP customizado para SAPUI5 — la app UI5 es otro origen que consume JSON vía CORS; la política por defecto de helmet no interfiere

## 10.6 Base de Datos

- [x] Pool de conexiones gestionado por Sequelize dentro del `dataSource` (`sequelizerAdaptor`), sin pools duplicados
- [x] Migraciones versionadas (Umzug) por dominio: `001-baseline.ts` en common (snapshot congelado), `002`/`003` en `core/finance/migrations/`, `004-auth-users.ts` en `core/auth/migrations/`; lista explícita `KernelMigration[]` sin glob ni `file://` (ciclo 16 F1/F2; fix Windows ciclo 14 R1); nombres con extensión preservan identidad `SequelizeMeta`
- [x] Naming consistente: snake_case en tablas (nombres de modelo como entity sets con hyphens)
- [x] Timestamps en modelos
- [x] Producción: migraciones al arranque (sin `sync`); dev/test: migraciones + `sync({alter})` (ciclo 16 F1; origen ciclo 09 R01)
- [x] Arranque productivo desde `dist`: puente CJS `odata-runtime.ts` (`createRequire` → build CJS de `@phrasecode/odata`) + smoke de start en CI (ciclo 16 F3, R1/R5)
- [~] SSL en producción — termina en TLS externo (reverse proxy); `DB_SSL` toggleable (ciclo 16 F2); documentado en `docker-compose.prod.yml`/README

## 10.7 Código

- [x] ESM (`type: "module"`), imports con `.js` (NodeNext)
- [x] `strict: true` en tsconfig; type-check de tests/scripts gateado en CI (`tsconfig.test.json`, ciclo 09 DT02 / ciclo 13 N5)
- [x] `skipLibCheck: true`; `declaration: false` en build (evita TS2742 en CI Linux, ciclo 09 M03)
- [x] `PascalCase` clases, `camelCase` instancias; constants `SCREAMING_SNAKE` donde aplica
- [x] Decoradores `experimentalDecorators: true`
- [x] Versión Node alineada: 22.x (`.nvmrc`/`engines`/CI, decisión D3 ciclo 15)

## 10.8 Rendimiento

- [x] Límite `$top` máximo (100) por controlador
- [x] `$select`/`$expand`/`$filter`/`$count` v4 soportados (expansión profunda verificada en ciclos 12–14)
- [x] Compression activo
- [x] Benchmark de regresión disponible (`scripts/bench/`, gate ≤10% p95 — ciclo 05 F6)
- [~] Índices en columnas de `$filter` — no configurados: volúmenes demo no lo requieren; se añadirán vía migración cuando exista un perfil de datos real (decisión ciclo 15)

## 10.9 Anti-Patterns a Evitar

- [x] NO pool duplicado de BD (una sola instancia Sequelize en `dataSource`)
- [x] NO imports de `core/` en `common/` — **cero** (gate estructural en CI, ciclo 16 F1; antes: salvo `core/main.js` desde `odata.service.ts`)
- [x] NO escribir lógica de negocio en controladores (servicios por dominio)
- [x] NO error genérico: `HttpException` y subclases en toda la cadena
- [x] NO dependencias cross-domain service→service
- [x] NO duplicación de definiciones de modelos: los modelos viajan en cada registro de dominio y el bootstrap compone; seed con `SEED_TABLES` + tests de consistencia (DT1/DT2 ciclo 14; `odata-models.ts` eliminado en ciclo 16 F1)
