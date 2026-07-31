# 10 — Checklist de Mejores Prácticas

> **Nota de vigencia (ciclo 15, 2026-07-31):** la versión original de esta checklist
> pertenecía a la era REST (ciclos 01–04: "OData solo-lectura + REST para escritura").
> El ciclo 05 invirtió deliberadamente ese diseño (**OData-as-domain**: OData es el
> dominio único, lectura **y** escritura en `/odata/*`, sin capa REST), así que la
> checklist original era **engañosora** y fue reescrita alineada a la arquitectura
> vigente. La fuente de verdad de la evolución es [`docs/00-indice.md`](../00-indice.md).
>
> Convención: `[x]` = verificado en el proyecto (con evidencia) · `[~]` = decidido no
> aplicar, con motivo · `[ ]` = pendiente o no aplica al contexto actual.

---

## 10.1 Arquitectura (OData-as-domain)

- [x] OData v4 como dominio único: lectura **y** escritura en `/odata/*`, sin capa REST (ciclos 05–06: `f3-eliminar-capa-rest`, PR #1; `/api` residual eliminado en ciclo 15)
- [x] Shared Kernel en `common/` sin acoplamiento a `core/`: `odata.service.ts` importa únicamente `core/main.js` (ciclo 07, F1/F2)
- [x] Registro de dominios centralizado: `core/main.ts` → `domainRegistrations[]`; lista de modelos única en `odata-models.ts` con test de consistencia (ciclo 07 + DT1 ciclo 14)
- [x] Una sola vía de escritura por recurso: `odata-write.routes.ts` + servicios de persistencia (ciclo 07 F1)
- [x] Escrituras transaccionales: `$batch` changesets atómicos + Content-ID (ciclo 06 F6.1, ciclo 08 G4, N19 ciclo 13)
- [x] Sin rutas REST: `GET /api/*` devuelve 404 (montaje eliminado en ciclo 15)

## 10.2 Modelos OData

- [x] Modelos decorados con `@Table` + `@Column` — única fuente de verdad del esquema (10 dominios en `src/core/*/model/`)
- [x] Relaciones con `@HasMany`/`@BelongsTo` (invoice↔items/payments, supplierinvoice↔items/payments; ciclos 06 y 14)
- [x] Named exports (no `export default`)
- [x] Tipo `!` (definite assignment) en propiedades
- [x] Metadata EDMX CSDL 4.01 generada con compat SAPUI5 (`odata-metadata.ts`, ciclos 04–07)
- [~] Vistas SQL (prefijo `VIEW_`) — **no aplica hoy**: volúmenes demo/dev no lo exigen; se evaluará con datos reales (decisión ciclo 15)

## 10.3 Controladores OData

- [x] Extender `ODataControler` (`@phrasecode/odata`) en los 12 dominios
- [x] Límite máximo de resultados: `query.setTop(100)` en todos los controladores
- [x] Custom logic vía override del método `get()` (ej. `computeStatus` en escrituras — DAP1 ciclo 11)
- [x] Manejo de errores: try/catch + excepciones tipadas (`HttpException` y subclases: NotFound, Conflict, Database)
- [~] Consultas raw con `@Query` decorator — no usado; los controladores consultan vía servicio/controller genérico (YAGNI)

## 10.4 Capas de dominio

- [x] Dominio en `core/<domain>/` con capas: interface / model / dto / service / controller / main (patrón `docs/02-patrones/05-odata-module-pattern.md`)
- [x] Service implementa `BaseService`; Controller implementa `BaseController`
- [x] DTOs con decoradores `class-validator`; `ValidatorMiddleware.validateBodyWithDTO` en escrituras
- [x] Errores tipados: `HttpException` + `GlobalErrorMiddleware.globalErrorHandler()`
- [~] `ApiResponse`/respuestas REST — restos de la era REST sin consumidores; interfaces conservadas en `common/interface/` sin uso activo (deuda menor, se evaluará su eliminación)

## 10.5 Seguridad

- [x] `helmet()` activado (CSP por defecto; la API solo sirve JSON)
- [x] CORS con `exposedHeaders: ["OData-Version"]`
- [x] Morgan activo (`dev` en desarrollo, `combined` en producción)
- [x] Compression activo
- [x] Stack trace oculto en producción (global-error middleware)
- [x] Sin JWT/bcrypt activos: middleware de seguridad de la era REST eliminado (ciclo 15, D1) — el servidor es un ecosistema simulado sin autenticación; se re-creará con requisito real
- [~] CSP customizado para SAPUI5 — la app UI5 es otro origen que consume JSON vía CORS; la política por defecto de helmet no interfiere

## 10.6 Base de Datos

- [x] Pool de conexiones gestionado por Sequelize dentro del `dataSource` (`sequelizerAdaptor`), sin pools duplicados
- [x] Migraciones versionadas con Umzug: `migrations/001–003` + fix migrator Windows (ciclo 09 IF01, ciclo 14 R1)
- [x] Naming consistente: snake_case en tablas (nombres de modelo como entity sets con hyphens)
- [x] Timestamps en modelos
- [x] `sync({alter})` solo en dev; producción con `sync()` sin alter (ciclo 09 R01)
- [~] SSL en producción — el servidor asume TLS de terminación externa (reverse proxy); documentado en `docker-compose.prod.yml`/README

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
- [x] NO imports de `core/` en `common/` (salvo `core/main.js` desde `odata.service.ts` — puerto de registro)
- [x] NO escribir lógica de negocio en controladores (servicios por dominio)
- [x] NO error genérico: `HttpException` y subclases en toda la cadena
- [x] NO dependencias cross-domain service→service
- [x] NO duplicación de definiciones de modelos: lista centralizada (`odata-models.ts`) y seed con `SEED_TABLES` + tests de consistencia (DT1/DT2 ciclo 14)
