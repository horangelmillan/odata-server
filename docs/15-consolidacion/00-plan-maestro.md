# 00 — Plan Maestro: Consolidación Post-DAP2

> **Ciclo:** `15-consolidacion`
> **Inicio:** 2026-07-31
> **Estado global:** ✅ F0–F4 ejecutadas y validadas — pendiente PR a `master` (F5)
> **Baseline (verificado 2026-07-31):** `pnpm build` ✅ · `pnpm test` **192/192** ✅ · type-check tests 0 ✅ · working tree limpio · master al día · sin issues/PRs abiertos

---

## 0. Contexto y origen

Tras el cierre del ciclo 14 (DAP2, PRs #28–#30), se ejecutó una evaluación exhaustiva
del proyecto completo siguiendo `AGENTS.md` (docs → Codebase Memory → código):

- **Estado funcional: sólido.** Suite 192/192, build `tsc` verde, CI con Postgres,
  migraciones 001–003, backlogs 01–14 sin elementos "Pendiente"/"En evaluación",
  repos limpios (odata-server y ui5-odata-demo sin issues/PRs abiertos).
- **Estado documental: deuda acumulada.** El patrón detectado en N9 (ciclo 13) —
  checkboxes de fases cerradas sin marcar — es sistémico: se replica en los ciclos
  05–08 (30+ ítems). Además hay un documento de patrones (ciclo 01–02) que
  **contradice la arquitectura vigente**, un índice con el ciclo 14 desactualizado
  y restos de la era REST en código muerto (mount `/api`, middleware de seguridad
  huérfano, git hooks obsoletos).
- **Estado de código: residuos inertes.** 3 refactors de limpieza y 1 corrupción
  de encoding (U+FFFD en `batch.middleware.ts`).

Este ciclo NO introduce funcionalidad: consolida, corrige y alinea el proyecto
con las reglas de documentación de `AGENTS.md`, con validación integral final.

---

## 1. Decisiones de arquitectura

| D | Decisión | Alternativas descartadas |
|---|---|---|
| **D1** | `security.middleware.ts` huérfano: **eliminar el archivo** (y su test) con registro en el backlog como decisión; el middleware de seguridad se re-creará cuando exista autenticación real (YAGNI) | Conservarlo sin consumidores → dead code permanente; convertirlo en middleware global → cambia comportamiento sin requisito real |
| **D2** | `scripts/git-hooks/*`: **eliminar** (los 3, con su commit de origen 687e338). Hoy la protección real es GitHub (ramas protegidas + CI + PR); los hooks son inertes y describen un protocolo de la era v1.1.0 | Actualizarlos al flujo PR → trabajo sin valor (GitHub ya lo impide); conservarlos → confusión documental |
| **D3** | **Adoptar Node 22 como versión oficial del proyecto**: actualizar `.nvmrc` y `engines` a `>=22 <23` (22.x), y `actions/setup-node` en el CI de `odata-server` a `22`. Local ya ejecuta v22.20.0 y toda la suite pasa; CI verifica contra la misma familia | Bajar local a 20.18.0 → forzar downgrade del entorno ya alineado; mantener la deriva → R1 sin resolver |
| **D4** | **Cerrar IF01-10, IF02-10, IF03-10 como "Descartado (re-evaluación sin evidencia)"**: la validación E2E sigue siendo exploratoria (MCP), el rate-limit de Context7 no ha sido problema, y el linter UI5 ya corre en el CI del demo. Se reabrirán solo con un desencadenante concreto | Mantenerlos "Movidos a iniciativa futura" indefinidamente → backlog eterno sin criterio de activación |
| **D5** | **No añadir ESLint a `odata-server`** (registrar decisión): el gate CI actual (build `tsc` + type-check de tests) ya cubre los errores que lint atraparía para este tamaño de código; `ui5-odata-demo` (librería UI5 con otro toolchain) sí lo mantiene | Añadir ESLint → dependencias, configuración y ruido de PRs sin defecto real detectado (YAGNI) |

---

## 2. Fases

| Fase | Contenido | Entregable | Criterio de aceptación |
|---|---|---|---|
| F0 | Rama + baseline + plan/backlog | Este ciclo creado | Build + 192/192 + type-check 0 ✅ |
| F1 | **Documentación**: índice §14 (M1), checklist de patrones (DT5: reescribir alineada a OData-as-domain o reemplazarla por referencia al índice), triage de checkboxes ciclos 05–08 (DT4: tickear lo hecho / marcar "superseded" lo superado con nota), comentario KNOWN ISSUE del test (DT2), fila B7 duplicada (DT3) | docs/ actualizadas | 0 casillas falsas: cada checkbox queda ✅ o `~` (superseded) con justificación; índice coherente |
| F2 | **Código**: encoding `batch.middleware.ts` (DT1, restaurar acentos), limpieza `main.ts` (RF1: quitar `/api` + `global.router.ts` huérfano), eliminar `security.middleware.ts` + test (D1), eliminar git hooks (D2) | src/ + scripts/ limpios | Build + type-check + suite en verde; grep sin referencias a lo eliminado |
| F3 | **Decisiones de entorno**: Node 22 oficial (D3: `.nvmrc`, `engines`, CI), cierre IF01-10/02-10/03-10 (D4), decisión lint documentada (D5) | infra/config alineada | `.nvmrc` = 22.x; backlogs sin ítems "Pendiente" |
| F4 | **Validación integral**: `pnpm build`, `tsc --noEmit --project tsconfig.test.json`, suite completa, `db:reset` + determinismo del seed (2 ejecuciones), smoke OData real (server levantado + `$metadata` + `$expand`), **Playwright** (skill obligatoria): Demo ↔ Finance ↔ detail, 0 errores de consola | Reporte de validación | Suite en verde; 0 errores consola; navegación UI5 OK |
| F5 | **Cierre**: revisión completa del backlog 15, PR a `master` con CI verde, merge | PR mergeado | Backlog 15 sin "Pendiente"/"En evaluación"; índice actualizado |

---

## 3. Criterios de aceptación globales

- Todo elemento del backlog 15 termina en **Implementado**, **Descartado** o con decisión registrada.
- `docs/00-indice.md` refleja el estado real de los 15 ciclos (incluido §14 completado).
- `10-best-practices-checklist.md` deja de contradecir la arquitectura vigente.
- Cero restos de la era REST referenciados en el código activo.
- Validación final Playwright sobre el ecosistema completo, sin errores de consola.

---

## 5. Resultado de la ejecución (2026-07-31)

- **F0** ✅ Rama `docs/consolidacion-post-dap2` + plan/backlog creados.
- **F1** ✅ Índice §14 → COMPLETADO (M1); checklist de patrones reescrita (DT5); triage
  de checkboxes 05–08 con `[x]`/`[~]` + evidencia — **0 checkboxes sin marcar** en
  `docs/` (DT4); comentario KNOWN ISSUE corregido (DT2); fila B7 duplicada eliminada (DT3).
- **F2** ✅ Encoding `batch.middleware.ts` restaurado — `grep \uFFFD` en `src/` = 0 (DT1);
  mount `/api` + import + `global.router.ts` eliminados (RF1 **parcial**); `security.middleware.ts`
  + test eliminados (D1); git hooks eliminados (D2).
  > **Corrección de análisis en F4**: el regex `/^\/demo\//` de `main.ts` NO es código
  > muerto — los tests de compat SAPUI5 (`odata-count.api.test.ts`,
  > `odata-write-validation.api.test.ts`, 24 tests) lo ejercitan (`/odata/demo/*` → 200).
  > Se restauró y se documentó en RF1 como compat shim con cobertura de tests.
- **F3** ✅ `.nvmrc` = `22.20.0`; `engines.node` = `>=22 <23`; CI `node-version: 22.20.0`
  (D3). IF01-10/02-10/03-10 cerradas como Descartado en backlog 10 y 15 (D4).
  Decisión D5 (sin ESLint) registrada.
- **F4** ✅ `pnpm build` verde · `tsc --noEmit --project tsconfig.test.json` 0 · suite
  **185/185 PASS** (192 − 7 tests de `security.middleware.test.ts` eliminado con D1) ·
  `db:reset` ×2 → md5 del dataset idéntico (`e6af212c…`) · smoke real: `$metadata` 12
  EntityTypes, `/odata/demo/*` → 200 (compat), `$expand` finance anida customer+company,
  `$filter`+`$count` OK, `/api/*` → 404 · **Playwright**: 8/8 tests del bench
  (Metadata, List, By-key, $expand, CRUD $direct, $batch changeset), navegación
  Demo ↔ Finance ↔ detail (cabecera + líneas con glAccount), **0 errores de consola**.

---

## 4. Flujo Git

- Rama: `docs/consolidacion-post-dap2` (nueva, desde `master` actualizado).
- Fases F1–F4 sobre la misma rama mientras el PR esté abierto (GIT_WORKFLOW §12).
- Único mecanismo de integración: PR a `master` con CI verde (GIT_WORKFLOW §7–§8).
