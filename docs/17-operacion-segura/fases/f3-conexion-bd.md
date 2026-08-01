# F3 — Conexión/BD hardening (R6, R7, R9, M2)

> Fase 3 del ciclo 17 — "Operación Segura". Rama `feat/operacion-segura`.

## 1. Objetivo

- **R9** — `statement_timeout` configurable (una query pesada no retiene el pool indefinidamente).
- **M2** — pool de BD configurable por entorno (`DB_POOL_MAX`/`DB_POOL_MIN`).
- **R6** — validación de CA del certificado SSL de BD configurable (`DB_SSL_REJECT_UNAUTHORIZED`, default **true**).
- **R7** — los 500 genéricos no exponen `error.message` en producción (detalle solo en consola).

## 2. Alcance

| Archivo | Cambio |
|---|---|
| `src/common/config/env.config.ts` | `dbStatementTimeout` (default 30000), `dbPoolMax` (10), `dbPoolMin` (2), `dbSslRejectUnauthorized` (default true) |
| `src/common/service/odata/datasource.ts` | pool desde env; `dialectOptions.statement_timeout`; `ssl.rejectUnauthorized` desde env |
| `scripts/patch-odata.mjs` | parche SSL v1 → **v2** (`PATCHED-SSL-v2`): `dialectOptions` MERGEA `dbConfig.dialectOptions` en vez de sobrescribirlo (si no, el adaptor borra el `statement_timeout`) |
| `src/common/middleware/global-error.middleware.ts` | 500 genérico en prod + detalle a consola |
| `.env.example` | nuevas variables documentadas |
| `docs/17-operacion-segura/fases/f3-conexion-bd.md` | este documento |
| Backlog | R6, R7, R9, M2 → Implementado |

## 3. Diseño

### 3.1 statement_timeout (R9)

`dialectOptions: { statement_timeout: env.dbStatementTimeout }`. Verificado empíricamente:
pg 8.22 acepta la clave directa (`SHOW statement_timeout` → 50ms con `statement_timeout: 50`).
El adaptor de `@phrasecode/odata` construía `dialectOptions` ignorando el resto del config
(parche v1), así que el parche SSL pasa a v2: `{ ...(dbConfig.dialectOptions || {}), ...(ssl ? {ssl} : {}) }`.

### 3.2 Pool (M2)

`pool: { max: env.dbPoolMax, min: env.dbPoolMin, idle: 10000, acquire: 30000 }` — defaults
iguales a los anteriores; solo se cambia si el entorno lo pide.

### 3.3 SSL CA (R6)

`ssl: { require: true, rejectUnauthorized: env.dbSslRejectUnauthorized }` — el default cambia
de `false` (aceptaba cualquier certificado) a **`true`** (valida la CA). Los despliegues con
BD self-signed deben setear `DB_SSL_REJECT_UNAUTHORIZED=false` explícitamente. Los entornos
actuales del proyecto usan `DB_SSL=false` → sin cambio de comportamiento.

### 3.4 500 genérico (R7)

En prod: `message: "Internal Server Error"` + `console.error` del detalle. En dev: mensaje
actual. El stack sigue nunca exponiéndose al cliente.

## 4. Pasos

1. `env.config.ts` + `datasource.ts` (env → config).
2. `patch-odata.mjs`: parche SSL v2 (con migración v1→v2 idempotente por marcador).
3. `global-error.middleware.ts`: 500 genérico en prod.
4. `.env.example`.
5. Verificaciones: parche aplicado (v2, idempotente), build, tsc, suite 215/215,
   smoke dev (healthz + $metadata 200), smoke prod (healthz público, 401 sin token,
   login→200), fail-fast exit(1) con BD inexistente.
6. Cierre: checklist, gate, hallazgos, resultado; backlog.

## 5. Checklist de ejecución

- [x] `DB_STATEMENT_TIMEOUT`/`DB_POOL_MAX`/`DB_POOL_MIN`/`DB_SSL_REJECT_UNAUTHORIZED` en env + datasource.
- [x] Parche SSL v2 aplicado e idempotente (`PATCHED-SSL-v2`; re-run → "ya aplicado").
- [x] 500 genérico en prod (detalle a consola).
- [x] `.env.example` documentado.
- [x] Build + tsc ✅; suite 215/215 ✅.
- [x] Smoke dev ✅ (healthz ok, $metadata 200).
- [x] Smoke prod ✅ (healthz ok, 401 sin token, login → token → 200).
- [x] Fail-fast: BD inexistente → exit(1) ✅ (demostrado en el mismo smoke, `odata_prod`).
- [x] Backlog actualizado (R6, R7, R9, M2 → Implementado).

## 6. Gate de la fase

- [x] `pnpm build` ✅ · `npx tsc --noEmit --project tsconfig.test.json` ✅
- [x] `pnpm test` **215/215** ✅
- [x] Parche v2 idempotente ✅
- [x] Smoke dist dev ✅ · smoke dist prod ✅ (con `DB_STATEMENT_TIMEOUT` activo por defecto)

## 7. Hallazgos detectados

| ID | Hallazgo | Clasificación | Resolución |
|---|---|---|---|
| R9 | Sin statement_timeout | Riesgo | Resuelto: `dialectOptions.statement_timeout` (default 30s) — requirió parche SSL v2 (el adaptor sobrescribía dialectOptions) |
| M2 | Pool fijo | Mejora | Resuelto: `DB_POOL_MAX`/`DB_POOL_MIN` con defaults 10/2 |
| R6 | SSL sin validación de CA | Riesgo | Resuelto: default `rejectUnauthorized: true`; `DB_SSL_REJECT_UNAUTHORIZED=false` explícito para BD self-signed |
| R7 | error.message en 500 | Riesgo | Resuelto: mensaje genérico en prod, detalle a consola |
| — | Nota: el parche SSL debía migrar a v2 (merge de dialectOptions); se escribió con lógica propia (fábrica/v1/v2) porque `patchFile` no soporta reemplazar un patched previo | Nota | Documentado en el propio script |

## 8. Resultado

F3 ejecutada y cerrada el 2026-08-01.

- **Conexión/BD hardening:** `statement_timeout` (30s default), pool configurable, validación
  de CA SSL por defecto, 500 genéricos en prod. El parche SSL de la librería pasó a v2 para
  preservar `dialectOptions` (migración idempotente v1→v2 por marcador, verificada).
- **Gate:** build ✅ · tsc ✅ · 215/215 ✅ · parche idempotente ✅ · smoke dev ✅ · smoke prod ✅
  (healthz, 401, login→200) · fail-fast exit(1) ✅.
- **Pendiente conocido:** ninguno. Los entornos existentes (`DB_SSL=false`) no cambian de
  comportamiento; los que usen SSL con cert self-signed necesitan la nueva variable.
- **Siguiente fase:** F4 (dependencias: override `uuid@^9` + audit final documentado).
