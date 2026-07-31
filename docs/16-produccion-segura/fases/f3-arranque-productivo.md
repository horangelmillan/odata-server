# F3 — Arranque productivo (R1, R2, R5, M2)

> Fase 3 del ciclo 16 — "Producción Segura". Rama `feat/produccion-segura`.
> Alcance: hacer que `pnpm start` (dist) y el stack Docker de producción
> funcionen de verdad, con verificación automática en CI.

---

## 1. Objetivo

Cerrar la brecha dev/prod de arranque:

- **R1** — `node ./dist/server.js` falla con `ERR_UNSUPPORTED_DIR_IMPORT` de
  `@phrasecode/odata` (build ESM del paquete rota en Node ESM).
- **R2** — verificar que las migraciones se aplican desde `dist/` (lista
  explícita de F1 ya elimina el glob; falta probarlo end-to-end en dist).
- **R5** — CI sin smoke de arranque real (por eso R1 pasó desapercibido).
- **M2** — completar healthcheck en `docker-compose.prod.yml` + vars que F2
  exige en prod (`CORS_ORIGIN`, `DB_SSL`).

## 2. Alcance

| ID | Categoría | Trabajo |
|---|---|---|
| R1 | Riesgo | Puente runtime CJS (`odata-runtime.ts`) y actualización de imports de valores |
| R2 | Riesgo | Verificación de migraciones en dist (BD limpia de humo) |
| R5 | Riesgo | Smoke de `pnpm start` en el CI (healthz, 401 sin token, login, 200 con token) |
| M2 | Mejora | `docker-compose.prod.yml`: healthcheck `/healthz` + `CORS_ORIGIN` + `DB_SSL=false` |

Fuera de alcance: seguridad (F2), observabilidad (IF1), deuda documental (F5).

## 3. Diseño

### 3.1 R1 — por qué la build ESM del paquete está rota

`@phrasecode/odata@0.3.1` publica dos builds:

- `dist/index.js` (CJS) — `require("./controller")` resuelve el directorio por
  la resolución legacy de Node. **Funciona** y es donde viven todos los parches
  de `scripts/patch-odata.mjs` (expressRouter `$count`/`/:id`, EDM mapping,
  `@odata.context`, SSL). Es la build que consume dev (loader ts-node).
- `dist/index.mjs` (ESM, 47 archivos) — imports sin extensión y de
  directorios (`from './controller'`), inválidos en Node ESM estricto
  (`ERR_UNSUPPORTED_DIR_IMPORT`). Nuestra app es `"type": "module"`, así que
  `node dist/server.js` importa por `exports.import` → `index.mjs` → roto.

No se parchea la build ESM: serían 47 archivos con imports por corregir y
**todos los parches existentes habría que duplicarlos en `.mjs`** (regresión
funcional: sin `$count`, sin `/ :id`, EDM mal mapeado, contexto UI5 roto).

### 3.2 R1 — solución: puente runtime CJS (cero cambios en la librería)

Nuevo módulo `src/common/service/odata/odata-runtime.ts`:

```ts
const require = createRequire(import.meta.url);
const odata = require("@phrasecode/odata") as typeof import("@phrasecode/odata");
export const { DataSource, Model, Table, Column, DataTypes, BelongsTo,
               HasMany, ODataControler, QueryParser, ExpressRouter } = odata;
export type { /* mismos nombres */ } from "@phrasecode/odata";
```

- `require()` de un paquete ESM usa la condición `require` del `exports` →
  `dist/index.js` (CJS) → resolución legacy → parches vigentes.
- Los imports de **valores** (decoradores, clases base, parsers) pasan de
  `@phrasecode/odata` → `odata-runtime.js` (mismo objeto de runtime que en
  dev; sin dual-package hazard).
- Los imports **solo de tipo** (`import type`) se quedan en `@phrasecode/odata`
  (se borran en compilación, no llegan al runtime).
- `export type {...} from "@phrasecode/odata"` permite `import { DataSource }`
  (valor+type) desde un solo módulo (datasource.ts, odata.service.ts).

### 3.3 R2 — migraciones en dist (verificación)

F1 eliminó el glob (`migrator.ts` usa lista explícita `KernelMigration[]`; los
nombres con `.ts` conservan identidad en `SequelizeMeta`). Prueba de humo:
levantar `node dist/server.js` contra una BD **vacía** y comprobar que
aplica 001-004 y `$metadata` responde.

### 3.4 R5 — smoke de start en CI

Tras `pnpm test`, en el mismo job (el servicio postgres ya existe):

1. crear usuario de humo con `pnpm auth:create-user`;
2. `node ./dist/server.js` con `NODE_ENV=production`, `SECRET_KEY` (40×x),
   `CORS_ORIGIN`, `DB_SSL=false`, `DB_*` → servicio postgres;
3. esperar `/healthz` 200; `$metadata` 200; `/odata/product-odata` 401 sin
   token; login → token → 200; matar el proceso.

### 3.5 M2 — compose prod

Al servicio `api` de `docker-compose.prod.yml`:

- `CORS_ORIGIN` obligatoria (`:?` como `SECRET_KEY`) — sin ella el server
  aborta (fail-fast F2);
- `DB_SSL=false` (BD del mismo stack; el default prod exige SSL);
- `healthcheck` con `fetch('/healthz')` (Node 20+ tiene fetch nativo).

## 4. Pasos

1. `docs/16-produccion-segura/fases/f3-arranque-productivo.md` (este doc).
2. `src/common/service/odata/odata-runtime.ts` + actualizar imports de valores
   (13 modelos, 12 controllers, datasource, odata.service, batch.middleware)
   y convertir a `import type` los de solo-tipo (registration.interface,
   write.routes, odata.service types).
3. Gate estático: `pnpm build`, `tsc --noEmit -p tsconfig.test.json`,
   `pnpm test`.
4. Smoke `pnpm start` local (modo abierto) + BD limpia `odata_f3_smoke`
   (prueba R2) + smoke prod (fail-fast ya cubierto en F2; estricto completo).
5. CI: paso de smoke (R5).
6. Compose prod: healthcheck + vars (M2).
7. `docker compose -f docker-compose.prod.yml up -d --build` si Docker está
   disponible (gate de producción real).
8. Cierre: checklist, gate, hallazgos, resultado; backlog (R1/R2/R5/M2);
   commit `feat(ciclo16): F3 - ...`.

## 5. Checklist de ejecución

- [x] `odata-runtime.ts` creado (bridge CJS, value+type exports).
- [x] Imports de valores migrados a `odata-runtime.js` (grep 0 de
      `from "@phrasecode/odata"` sin `import type` en src).
- [x] `pnpm build` ✅.
- [x] `npx tsc --noEmit --project tsconfig.test.json` ✅.
- [x] `pnpm test` en verde (215/215).
- [x] Smoke `node dist/server.js` (modo abierto) ✅.
- [x] Migraciones aplicadas desde dist en BD limpia (R2) ✅.
- [x] Smoke prod desde dist (healthz/metadata públicos, 401, login→200) ✅.
- [x] CI: paso de smoke de start (R5) ✅.
- [x] Compose prod: `CORS_ORIGIN`, `DB_SSL=false`, healthcheck `/healthz` (M2) ✅.
- [x] Docker compose prod levanta (healthy) ✅.
- [x] Backlog + bitácora + commit F3 ✅.

## 6. Gate de la fase

- [x] build ✅ · tsc test ✅ · suite ✅ (215/215) · smoke start dev ✅ · smoke start prod ✅
- [x] smoke migraciones en BD limpia ✅ (4 pendientes → all applied; users table
      operativa: login real en el contenedor Docker)
- [x] compose prod up ✅ (api healthy; healthcheck funcionando; login → 200)

## 7. Hallazgos detectados

| ID | Hallazgo | Clasificación | Resolución |
|---|---|---|---|
| R1 | `node dist/server.js` → `ERR_UNSUPPORTED_DIR_IMPORT` | Riesgo | Resuelto: `odata-runtime.ts` (createRequire → build CJS; sin tocar la librería) |
| R2 | Migraciones no aplican en dist | Riesgo | Resuelto en F1 (lista explícita); verificado end-to-end en BD limpia desde dist y dentro del contenedor |
| R5 | CI sin smoke de start | Riesgo | Resuelto: paso "Smoke start (dist, modo produccion)" en ci.yml (healthz, 401, login→200) |
| M2 | Healthcheck compose + vars F2 | Mejora | Resuelto: healthcheck `/healthz` (interval 10s, start_period 20s), `CORS_ORIGIN` `:?` obligatoria, `DB_SSL=false` |
| — | Dockerfile prod: sin `pnpm-lock.yaml` en el stage production | Bug | `COPY package.json` no incluía el lockfile → `--frozen-lockfile` imposible (ERR_PNPM_NO_LOCKFILE). Corregido |
| — | Dockerfile con `node:20.18.0` vs `engines: ">=22 <23"` | Bug/riesgo | Inconsistencia con CI (22.20.0) y warning de pnpm. Corregido a `node:22.20.0-alpine` |
| — | `docker compose` (cualquier comando, incluso `ps`) exige `CORS_ORIGIN` | Nota operativa | Efecto del fail-fast F2: hay que exportar `SECRET_KEY`/`CORS_ORIGIN` o definirlas en `.env` del proyecto (donde ya vive `DB_PASSWORD=postgres`, distinto del default del compose) |
| — | TS no fusiona `export type { X } from` con valor del mismo nombre | Nota técnica | TS1362: los tipos que se necesiten como anotación se importan con `import type` desde el paquete (se borran en compilación); el puente exporta solo valores |

## 8. Resultado

F3 ejecutada y cerrada el 2026-07-31.

- **`pnpm start` operativo (R1):** el problema era la build ESM del paquete
  (imports sin extensión/directorios → `ERR_UNSUPPORTED_DIR_IMPORT`); la build
  CJS es la que funcionaba en dev y donde viven los parches. Solución sin tocar
  la librería: `src/common/service/odata/odata-runtime.ts` — `createRequire`
  fuerza la condición `require` del `exports` → `dist/index.js` (CJS), la misma
  build que consume dev (sin dual-package hazard). Los imports de valores (13
  modelos, 12 controllers, datasource, odata.service, batch.middleware) pasan
  por el puente; los tipos siguen como `import type` del paquete (erased).
- **Migraciones en dist (R2):** verificado en BD limpia (`odata_f3_smoke`):
  desde `node dist/server.js` aplican 001-baseline → 004-auth-users; también
  dentro del contenedor Docker (login real contra `odata_prod`).
- **CI (R5):** nuevo paso de smoke que levanta `dist` en modo producción contra
  el servicio postgres del job, verifica healthz 200, `/odata` 401 sin token,
  login → 200 con token, y mata el proceso. Cualquier rotura futura de start
  falla el pipeline.
- **Compose prod (M2):** `CORS_ORIGIN` obligatoria (`:?` — sin ella aborta por
  fail-fast F2), `DB_SSL=false` (BD del mismo stack), healthcheck `fetch`
  sobre `/healthz`. **Gate Docker completo:** `up -d --build` → db healthy →
  api healthy → healthz 200, `$metadata` 200, 401 sin token, login → 200.
- **Correcciones del Dockerfile:** copia de `pnpm-lock.yaml` en el stage
  production (sin ella `--frozen-lockfile` no puede instalar) y base
  `node:22.20.0-alpine` (el motor declarado es `>=22 <23`; antes Node 20 con
  warning de pnpm e inconsistencia con CI).
- **Gate:** build ✅ · tsc ✅ · 215/215 ✅ · smoke dist dev ✅ · smoke dist prod ✅
  · smoke migraciones BD limpia ✅ · Docker prod healthy ✅.
- **Pendiente conocido:** ninguno bloqueante. `docker compose ps` exige las
  vars de entorno (nota operativa §7). La imagen Docker se beneficiaría de un
  `devDependencies` pruning explícito (deuda menor, no registrada como tal).
- **Siguiente fase:** F4 (consolidación post-arranque: revisión del backlog y
  cierre del ciclo) o F5 (deuda documental DT2/DT3/DT4). Revisar
  `02-implementation-backlog.md` antes de empezar.
