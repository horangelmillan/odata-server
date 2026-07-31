# 00 — Plan Maestro: Producción Segura (ciclo 16)

> **Ciclo:** `16-produccion-segura`
> **Inicio:** 2026-07-31
> **Estado global:** 🚧 F0 en ejecución
> **Baseline (verificado 2026-07-31):** `pnpm build` ✅ · `pnpm test` **185/185** ✅ · type-check tests 0 ✅ · working tree limpio · master al día (5492df5) · sin issues/PRs abiertos

---

## 0. Contexto y origen

Tras el cierre del ciclo 15 (consolidación, PR #31), el usuario solicitó una evaluación
de madurez para uso productivo. Veredicto honesto: los 15 ciclos están completados y
cerrados, pero **no es honesto afirmar "producción sin problemas"** — existen brechas
reales verificadas:

1. **Arranque productivo roto (crítico):** `pnpm start` (y el CMD de la imagen Docker
   prod) ejecutan `node ./dist/server.js` y fallan con `ERR_UNSUPPORTED_DIR_IMPORT`:
   el build ESM de `@phrasecode/odata` (`dist/index.mjs`) importa 4 directorios sin
   índice (`./controller`, `./core`, `./decorators`, `./routers`). Dev funciona solo
   porque el loader `ts-node/esm` resuelve estilo CJS. La vía de despliegue prod
   **nunca se ha ejecutado**.
2. **Migraciones en producción (bug latente):** el migrator Umzug usa
   `glob: ["[0-9]*.ts", …]`; en `dist/` las migraciones compiladas son `.js` → pending
   siempre vacío en prod → el esquema migrado nunca se aplica (lo cubre hoy `sync()`).
3. **Acoplamiento Shared Kernel ↔ Dominios (regla del usuario):** `src/common`
   contiene conocimiento de dominio: `odata-models.ts` importa los 11 modelos de
   `src/core` y `odata.service.ts` importa `domainRegistrations` de `core/main.js`
   (7 imports common→core). Eliminar o cambiar un dominio (p.ej. finance por otro
   rubro) rompería `common`. Además las migraciones 002/003 (modelo financiero) viven
   en `common`. Regla de la arquitectura propuesta: **el dominio no conoce a `common`;
   `common` jamás depende del dominio; todo encaja como bloques**.
4. **Seguridad inexistente:** el middleware JWT se eliminó en el ciclo 15 (D1 — era
   código muerto de la era REST, nunca montado). CORS sin restricción de origen,
   `SECRET_KEY` con default `"change-me"`, sin auth en ningún entorno.
5. **Observabilidad mínima:** sin `/healthz` ni healthcheck para el compose prod.
6. **Documentación obsoleta:** índice §15 aún dice "en ejecución"; la doc de seguridad
   (docs/03) describe la era REST; la referencia de arquitectura menciona Node 20/REST;
   la checklist de patrones dice "sin JWT/bcrypt activos".

Además, se crea la **plantilla de ciclo** (`docs/02-patrones/17-plantilla-ciclo.md`,
D8) para codificar el proceso de creación de iniciativas que este proyecto ha seguido
desde el ciclo 05: estructura de carpeta, backlog con categorías de hallazgos, fases
con checklist y gates de validación, y cierre con PR.

---

## 1. Decisiones de arquitectura

| D | Decisión | Alternativas descartadas |
|---|---|---|
| **D1** | **Modularidad Nivel 1**: `src/common` queda 100% genérico (cero imports de `src/core`, verificado por test estructural en CI). La composición de dominios se hace únicamente en el bootstrap (`src/main.ts`), único punto que conoce core y common. Los dominios pueden usar utilidades del kernel (modelOf, OmitType/PartialType, excepciones) y el contrato `DomainRegistration`. Eliminar/cambiar un dominio no rompe common | Nivel 2 (cero imports core→common): mover utilidades compartidas fuera de common o duplicarlas por dominio — alto costo y roza la duplicación de código; decisión del usuario |
| **D2** | **Seguridad por entorno**: `development`/`test` → **modo abierto** (sin auth, sin tokens, cero fricción); `production` → **modo estricto** (arranque fail-fast si `SECRET_KEY` ausente/débil, JWT Bearer obligatorio en `/odata`, `CORS_ORIGIN` obligatoria, rate-limit en escrituras, helmet con CSP). Mecanismo: **JWT + usuarios** (dominio `src/core/auth/` con login y usuario sembrado; bcrypt + jsonwebtoken ya en deps) | API key estática (sin gestión de usuarios) — descartada por decisión del usuario; ambos mecanismos — más superficie sin requisito real (YAGNI) |
| **D3** | **Arranque productivo vía parche**: extender `scripts/patch-odata.mjs` con un parche de imports de directorio en `dist/index.mjs` (4 líneas, idempotente con marcador, mismo patrón que los parches existentes). El Dockerfile prod ya ejecuta `postinstall` → la imagen queda corregida. Se añade smoke `pnpm start` al CI para que esto no se rompa en silencio | Wrapper CJS local de la librería — más código de mantenimiento sin ventaja sobre el parche existente |
| **D4** | **Migraciones**: el migrator resuelve migraciones `.ts` (dev) y `.js` (dist/prod) según el entorno. Las migraciones del dominio finance (002, 003) se mudan a `src/core/finance/migrations/` y se entregan al migrator vía los registros de dominio (discovery por composición) | Dejar migraciones en common → viola D1; duplicar el mecanismo por dominio |
| **D5** | **Validación Docker real en F3** (decisión del usuario: Docker disponible): `docker build --target production` + `docker compose -f docker-compose.prod.yml` con BD limpia; se verifica: contenedor healthy, migraciones aplicadas (`SequelizeMeta`), `$metadata` y una consulta OData respondiendo | Validar solo `pnpm start` + `docker compose config` — menos confianza (descartada por el usuario) |
| **D6** | **Observabilidad mínima**: endpoint `GET /healthz` público (liveness: ping a BD + uptime) + healthcheck del servicio `api` en `docker-compose.prod.yml`. Sin métricas/APM externos (IF1 — Movido a iniciativa futura, YAGNI) | Agregar métricas (prom-client), tracing o logging estructurado completo — sin requisito de operación real |
| **D7** | **Bump de versión a `2.3.0`** al cierre del ciclo (patrón de release: v2.0.0-odata-domain, v2.1.0-financial-eco, v2.2.0) | Mantener 2.2.0 — el ciclo introduce funcionalidad de seguridad y arranque prod |
| **D8** | **Plantilla de ciclo** creada en F0 (`docs/02-patrones/17-plantilla-ciclo.md`): estructura canónica de iniciativas (plan maestro + backlog + fases con checklist/gates + cierre PR). El ciclo 16 es su primera implementación de referencia | Documentar solo en AGENTS.md — se pierde el detalle operativo; no crearla — se sigue improvisando la estructura |

---

## 2. Fases

| Fase | Contenido | Entregable | Criterio de aceptación |
|---|---|---|---|
| F0 | Rama `feat/produccion-segura` + baseline + plantilla de ciclo (D8) + plan/backlog + índice §16 | Este ciclo creado | Build + 185/185 + type-check 0 ✅ |
| F1 | **Modularidad (D1, D4)**: bootstrap compone (modelos viajan en cada registro; `odata-models.ts` y el import de `core/main.js` en common eliminados); migraciones finance → `src/core/finance/migrations/` + discovery vía registros; test estructural + gate CI (ningún archivo de `src/common` importa `src/core`) | src/ limpio y test estructural | Build + suite + type-check ✅; grep: cero imports de `core` dentro de `src/common` |
| F2 | **Seguridad (D2, D6)**: `env.config.ts` validado (fail-fast en prod: `SECRET_KEY` ≥32 chars, `CORS_ORIGIN`); dominio `src/core/auth/` (modelo User, login, JWT); middleware de auth con tier open/strict; CORS por entorno; rate-limit en escrituras (prod); `/healthz`; docs/03 reescritas | Seguridad por entorno operativa | Tests auth ✅; dev: transacción sin token OK; prod: 401 sin token, fail-fast sin `SECRET_KEY` |
| F3 | **Arranque productivo (D3, D4, D5)**: parche dir-imports en `patch-odata.mjs`; `pnpm start` funcional; migrator `.ts`/`.js` verificado en dist; smoke `pnpm start` en CI; **Docker build + compose prod real** con BD limpia | `pnpm start` + imagen prod verificada | `pnpm start` smoke ✅; contenedor healthy; `SequelizeMeta` con 3+ migraciones; OData respondiendo |
| F4 | **Validación integral**: build, type-check tests, suite completa, `db:reset` ×2 (determinismo), smoke dist, **Playwright** (skill obligatoria): bench 8/8 + navegación Demo ↔ Finance ↔ detail, 0 errores de consola | Reporte de validación | Suite en verde; Playwright 8/8; 0 errores consola |
| F5 | **Cierre (D7)**: revisión completa del backlog 16; índice actualizado (§15 completado, §16); README; checklist de patrones; referencia de arquitectura; bump `2.3.0`; PR a `master` con CI verde | PR mergeado | Backlog 16 sin "Pendiente"/"En evaluación"; índice coherente; CI verde |

---

## 3. Criterios de aceptación globales

- [ ] `pnpm start` arranca el server compilado y responde OData (sin ts-node).
- [ ] La imagen Docker prod se construye y arranca con BD limpia; las migraciones se aplican.
- [ ] `src/common` no importa nada de `src/core` (test estructural en CI).
- [ ] Eliminar un dominio no rompe `common` (verificado por diseño de composición + test estructural).
- [ ] `NODE_ENV=development|test`: transacciones sin configurar seguridad (abierto por defecto).
- [ ] `NODE_ENV=production`: falla rápido si falta `SECRET_KEY`/`CORS_ORIGIN`; sin token → 401.
- [ ] Suite completa en verde + Playwright 8/8 con 0 errores de consola.
- [ ] Backlog 16 sin elementos "Pendiente"/"En evaluación" al cierre.
- [ ] `docs/00-indice.md` refleja el estado real (ciclos 15 y 16).
- [ ] Plantilla de ciclo creada y usada por este ciclo (D8).
- [ ] Versión `2.3.0` (D7).

---

## 4. Flujo Git

- Rama: `feat/produccion-segura` (nueva, desde `master` actualizado — GIT_WORKFLOW §2).
- Fases F1–F4 sobre la misma rama mientras el PR esté abierto (GIT_WORKFLOW §12).
- Único mecanismo de integración: PR a `master` con CI verde (GIT_WORKFLOW §7–§8).
- Sin cambios en `ui5-odata-demo` (repo externo, no forma parte de este ciclo).

---

## 5. Resultado de la ejecución

*(Se completa al cierre del ciclo, fase por fase, con evidencia.)*
