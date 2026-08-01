# F4 — Dependencias: uuid override + audit saneado (R8, D4, D5)

> Fase 4 del ciclo 17 — "Operación Segura". Rama `feat/operacion-segura`.

## 1. Objetivo

- **R8** — eliminar el advisory moderado de `uuid` (transitiva de Sequelize).
- **D5** — override de uuid vía `pnpm.overrides`.
- **D4** — bcrypt se mantiene; los 13 avisos restantes (cadena de build) quedan
  documentados como conocidos y el gate de CI los excluye.

## 2. Alcance

| Archivo | Cambio |
|---|---|
| `package.json` | `pnpm.overrides.uuid: "^11.1.1"` |
| `pnpm-lock.yaml` | actualizado por `pnpm install` |
| `.github/workflows/ci.yml` | filtro del audit simplificado (solo cadena bcrypt; ya no hay uuid que excluir) |
| `docs/17-operacion-segura/fases/f4-dependencias.md` | este documento |
| Backlog | R8 → Implementado; DT1 → Descartado (D4); DA5 registrada |

## 3. Diseño

El advisory de uuid (GHSA-w5hq-g745-h8pq: buffer bounds check en v3/v5/v6 con `buf`)
afecta a `<11.1.1`. El primer intento con `^9.0.1` **no** lo limpiaba (9.x sigue en el
rango vulnerable). Se probó `^11.1.1` (ESM-only) contra Sequelize 6.37.8 (CJS): **Node
22.20 resuelve `require(esm)`** y la suite completa (215/215) + smoke dist pasan — el
override es seguro y elimina el advisory por completo.

Tras el override: `pnpm audit --prod` = **13 advisories, todos de la cadena de build de
bcrypt** (`@mapbox/node-pre-gyp` → tar/rimraf/minimatch/brace-expansion), documentados
como conocidos (D4) y excluidos por el filtro del CI.

## 4. Pasos

1. `package.json`: override `uuid@^11.1.1` (Context7: sintaxis `pnpm.overrides` en la raíz).
2. `pnpm install` (lockfile) → `pnpm why uuid` = 11.1.1 en ambas rutas.
3. `pnpm audit --prod --json`: 13 advisories, ninguno fuera de la cadena bcrypt.
4. `ci.yml`: filtro del audit sin la parte de uuid.
5. Verificaciones: build ✅, tsc ✅, suite 215/215 ✅, smoke dist dev ✅.
6. Cierre: checklist, gate, hallazgos, resultado; backlog.

## 5. Checklist de ejecución

- [x] Override `uuid@^11.1.1` en `package.json` (pnpm.overrides).
- [x] Lockfile actualizado; `pnpm why uuid` → 11.1.1.
- [x] `pnpm audit --prod`: 0 advisories fuera de la cadena bcrypt (13 conocidos).
- [x] Filtro del CI actualizado (solo bcrypt).
- [x] Build + tsc ✅; suite 215/215 ✅; smoke dist dev ✅ (uuid 11 en runtime real).

## 6. Gate de la fase

- [x] `pnpm build` ✅ · `npx tsc --noEmit --project tsconfig.test.json` ✅
- [x] `pnpm test` **215/215** ✅ (Sequelize + uuid 11.1.1)
- [x] `pnpm audit --prod`: sin critical nuevos fuera de la cadena documentada ✅
- [x] Smoke dist dev ✅ (healthz ok, /odata 200)

## 7. Hallazgos detectados

| ID | Hallazgo | Clasificación | Resolución |
|---|---|---|---|
| R8 | uuid@8.3.2 moderada transitiva | Riesgo | Resuelto: override `^11.1.1` (el advisory cubre <11.1.1; 9.x no bastaba). Verificado: uuid 11 ESM-only funciona con Sequelize 6 en Node 22.20 (suite + smoke) |
| DT1 | bcrypt → node-pre-gyp → tar (13 avisos) | Deuda Técnica | Descartado vía D4: cadena de build, no runtime, mitigada por frozen-lockfile; documentado en el runbook (F5) y excluida del gate |

## 8. Resultado

F4 ejecutada y cerrada el 2026-08-01.

- **Audit saneado:** de 14 advisories (1 moderada de uuid + 13 de build de bcrypt) a
  **13, todos de la cadena documentada de bcrypt**. El override a `uuid@11.1.1` (que
  superó la prueba empírica ESM/CJS en Node 22.20) eliminó la única de runtime.
- **Gate:** build ✅ · tsc ✅ · 215/215 ✅ · audit sin novedades ✅ · smoke dist dev ✅.
- **Pendiente conocido:** los 13 avisos de bcrypt quedan como deuda conocida (D4);
  se re-evalúa al actualizar bcrypt.
- **Siguiente fase:** F5 (runbook completo: despliegue, secrets, SSL, backups, bcrypt,
  rollout, troubleshooting, rotación de SECRET_KEY).
