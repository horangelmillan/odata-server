# 02 — Implementation Backlog: Ciclo 16 — Producción Segura

> Única fuente de verdad de hallazgos del ciclo 16. Categorías según AGENTS.md:
> Riesgo (`R`), Mejora (`M`), Refactorización (`RF`), Deuda Técnica (`DT`),
> Investigación Futura (`IF`), Decisión Arquitectónica (`DA`).
> Estados válidos: Pendiente · En evaluación · Implementado · Descartado ·
> Movido a iniciativa futura · Superseded.

---

## Hallazgos iniciales (investigación 2026-07-31)

| ID | Categoría | Hallazgo | Detalle / evidencia | Impacto | Estado | Resolución |
|---|---|---|---|---|---|---|
| R1 | Riesgo | `pnpm start` / Docker prod roto | `node ./dist/server.js` → `ERR_UNSUPPORTED_DIR_IMPORT`: `dist/index.mjs` de `@phrasecode/odata` importa 4 directorios sin índice (`./controller`, `./core`, `./decorators`, `./routers`). Dev funciona solo por el loader ts-node/esm | Alto — bloquea producción hoy | Pendiente | F3 |
| R2 | Riesgo | Migraciones nunca se aplican en prod | Migrator Umzug con `glob: ["[0-9]*.ts", …]`; en `dist/` son `.js` → pending vacío; `sync()` lo cubre hoy silenciosamente | Medio — bug latente de esquema | Pendiente | F3 |
| R3 | Riesgo | CORS sin restricción de origen | `main.ts` usa `cors({ exposedHeaders })` sin `origin` → abierto a cualquier origen incluso en prod | Medio | Implementado | F2 |
| R4 | Riesgo | `SECRET_KEY` con default "change-me" | `env.config.ts:39`; sin validación ni fail-fast en prod; JWT muerto desde D1 (ciclo 15) | Alto en prod | Implementado | F2 |
| R5 | Riesgo | CI no ejecuta el dist/start | El CI solo hace build+type-check+tests; el start se rompió sin detección | Medio | Pendiente | F3 |
| M1 | Mejora | Seguridad por entorno (open/strict) | dev/test abiertos sin configurar claves; prod estricto (auth, CORS, rate-limit, CSP) | Alta | Implementado | F2 |
| M2 | Mejora | `/healthz` + healthcheck prod | Liveness (ping BD + uptime) público; wiring en `docker-compose.prod.yml` | Baja | En evaluación | F2/F3 (endpoint F2 ✅; healthcheck compose → F3) |
| M3 | Mejora | Docs de seguridad reescritas | `docs/03-seguridad-datos/07-…` describe la era REST; `.env.example` sin `CORS_ORIGIN` ni política de `SECRET_KEY` | Baja | Implementado | F2 |
| RF1 | Refactorización | `common` importa `core` | `odata-models.ts` (11 modelos de dominio) + `odata.service.ts` (`domainRegistrations` de `core/main.js`). Violación de modularidad: eliminar un dominio rompe common | Alta | Implementado | F1 |
| RF2 | Refactorización | Migraciones finance en common | `src/common/service/odata/migrations/002-rich-financial-model.ts` y `003-supplierinvoice-items-payments.ts` son contenido del dominio finance | Media | Implementado | F1 |
| RF3 | Refactorización | Bootstrap como composición única | `src/main.ts` como único punto que conoce core y common; modelos viajan en cada registro de dominio | Media | Implementado | F1 |
| DT1 | Deuda Técnica | Deps huérfanas bcrypt/jsonwebtoken | Permanecen en `dependencies` desde la era REST sin consumidores (se re-utilizan en F2 con el dominio auth) | Baja | Implementado | F2 (re-utilizadas por el dominio auth) |
| DT2 | Deuda Técnica | Índice §15 obsoleto | `docs/00-indice.md` §15 dice "Ciclo en ejecución… pendiente de aprobación" — ya está mergeado (PR #31) | Baja | Pendiente | F5 |
| DT3 | Deuda Técnica | Checklist de patrones obsoleta | `docs/02-patrones/10-best-practices-checklist.md` línea 56: "Sin JWT/bcrypt activos… se re-creará con requisito real" — el requisito real llega en este ciclo | Baja | Pendiente | F5 |
| DT4 | Deuda Técnica | Referencia de arquitectura desactualizada | `docs/01-fundamentos/01-odata-architecture-reference.md`: Node 20, REST en el pipeline, estructura pre-refactor | Baja | Pendiente | F5 |
| DT5 | Deuda Técnica | Write services usan registro global en bootstrap | Enlazado vía `registerDataSource()`/`getDataSource()` en vez de DI estricta (trade-off de mínima modificación; error claro si no enlazado). Se revisa si la arquitectura lo exige | Baja | Implementado | F1 |
| IF1 | Investigación Futura | Observabilidad externa | Métricas (prom-client), APM, logging estructurado con transporte — sin operación real que lo requiera (YAGNI) | Baja | Movido a iniciativa futura | — |
| IF2 | Investigación Futura | Rate-limit: librería vs in-memory | Evaluar con Context7 `express-rate-limit` vs limiter propio en F2; si la dependencia es mínima se incorpora | Baja | Implementado | F2 (`express-rate-limit`, 0 deps de runtime) |
| DA1 | Decisión Arquitectónica | Endpoints públicos en prod | Propuesta: `/healthz` y `$metadata` públicos; resto de `/odata` requiere Bearer. Se confirma en F2 | Media | Implementado | F2 (confirmada por el usuario) |
| RF4 | Refactorización | `GET /healthz` no existe | El server no expone `/healthz` (404 en dev y prod); se requiere para liveness/healthcheck (M2). Se implementa en F2 con el ruteo de seguridad | Baja | Implementado | F2 |

---

## Bitácora

| Fecha | ID | Acción |
|---|---|---|
| 2026-07-31 | — | Ciclo creado (F0): rama `feat/produccion-segura`, plantilla de ciclo (D8), plan maestro, este backlog, índice §16 |
| 2026-07-31 | RF1, RF2, RF3, DT5 | F1 ejecutada: datasource factory+registro, `createODataExpressApp` como factory, composición en `main.ts`/`server.ts`, migraciones finance movidas al dominio (identidad `SequelizeMeta` preservada con extensión — el resolver glob histórico registraba `.ts`), `odata-models.ts` eliminado, migrator con lista explícita `KernelMigration[]`. Gate: build ✅, tsc test ✅, 188/188 ✅, grep 0 imports core en common ✅, smoke dev ✅ (migraciones reconocidas como aplicadas; `$metadata` 200). Hallazgo nuevo: RF4 (`/healthz` ausente → F2) |
| 2026-07-31 | R3, R4, M1, M2, M3, IF2, DA1, RF4, DT1 | F2 ejecutada: seguridad por entorno (dev/test abiertos; prod fail-fast: `SECRET_KEY` ≥32 y `CORS_ORIGIN` obligatorias), dominio `src/core/auth/` completo (modelo `AuthUserOData`/`users`, migración `004-auth-users.ts`, `authService.login` bcrypt+JWT, `POST /auth/login`), `AuthMiddleware.requireBearerToken` + `HealthzMiddleware` (público, resolver perezoso), CORS por callback (`origin === CORS_ORIGIN`), rate-limit escrituras `express-rate-limit` (IF2; 100/15min/IP), scripts `pnpm auth:create-user`/`seed:auth`/`db:reset` encadenado, `DB_SSL` toggle, docs/03 reescritas. Gate: build ✅, tsc test ✅, **215/215** ✅ (27 tests nuevos: env-validation, auth service/middleware/controller, security.api dev, security-prod.api con `vi.hoisted`), smoke dev ✅ (migración 004 aplicada, healthz 200, `/odata` 200 sin token, login OK), smoke prod ✅ (fail-fast ×3, healthz+`$metadata` públicos, 401 sin token, login→token→200). Pendiente conocido: `pnpm start` (dist) sigue roto por R1 → F3 |
