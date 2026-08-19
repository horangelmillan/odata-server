# Implementation Backlog — Consolidación Post-DAP2

> **Ciclo:** `15-consolidacion`
> **Última actualización:** 2026-07-31

## Propósito

Centraliza los hallazgos detectados durante la evaluación exhaustiva del proyecto
(2026-07-31) realizada tras el cierre del ciclo 14 (DAP2), según las reglas de `AGENTS.md`.

Estados válidos: Pendiente · En evaluación · Aprobado · Implementado · Descartado · Movido a una iniciativa futura.

---

# Riesgos

| ID | Detectado en | Descripción | Impacto | Estado | Resolución |
| -- | ------------ | ----------- | ------- | ------ | ---------- |
| R1 | Evaluación 07-31 | Deriva de entorno: Node local **v22.20.0** vs `.nvmrc`/`engines`/CI **20.18.0** (`pnpm` emite `Unsupported engine` en cada comando) | Bajo — los tests pasan en ambos, pero la paridad local↔CI queda sin garantía (ej. comportamientos ESM/glob distintos) | Implementado (F3) | Alineado a Node **22.20.0** en `.nvmrc`/`engines` (`>=22 <23`)/CI (decisión D3) |

> Nota: no se detectaron riesgos funcionales abiertos: suite 192/192 PASS, build
> `tsc` verde, CI configurado (build + type-check tests + tests con Postgres),
> sin issues/PRs abiertos en `odata-server` ni `ui5-odata-demo`.

---

# Mejoras

| ID | Detectado en | Descripción | Prioridad | Estado | Observaciones |
| -- | ------------ | ----------- | --------- | ------ | ------------- |
| M1 | Evaluación 07-31 | `docs/00-indice.md` §14: el ciclo DAP2 figura como "Ciclo en ejecución 🚧 (pendiente F7 merge)" cuando **F7 ya se mergeó** (PR #28) y se cerró (PRs #29 y #30) | Media — documentación no confiable | Implementado (F1) | §14 marcado ✅ COMPLETADO con los 3 PRs + §15 Consolidación añadida |

---

# Refactorizaciones

| ID | Detectado en | Descripción | Motivo | Estado |
| -- | ------------ | ----------- | ------ | ------ |
| RF1 | Evaluación 07-31 | `src/main.ts`: mount `/api` sobre `GlobalRouter` **vacío** (resto de la era REST, ciclo 05) + regex `/^\/demo\//` (sospechado de muerto desde `feat/flatten-odata-endpoints`) | Código muerto que confunde; el dominio único es `/odata` | Implementado (F2) | **Parcial**: eliminados el mount `/api`, su import y `global.router.ts` (quedaba huérfano). El regex `/demo/` resultó **load-bearing** — los tests de compat SAPUI5 (ciclo 09) lo ejercitan (`odata-count.api.test.ts` + `odata-write-validation.api.test.ts`, 24 tests: sin él, `/odata/demo/*` → 404). Detectado en F4 por regresión de la suite; se restauró y el archivo se mantiene documentado como compat shim |
| RF2 | Evaluación 07-31 | `src/common/middleware/security.middleware.ts`: huérfano — nunca se monta en la app (solo tiene tests propios). Era la validación JWT de las rutas `/api` eliminadas | Dead code sin consumidores reales | Implementado (F2) | Eliminado junto a su test (decisión D1) |
| RF3 | Evaluación 07-31 | `scripts/git-hooks/{pre-commit,pre-push,pre-merge-commit}`: protocolo obsoleto ("master congelado hasta `feat/odata-sapui5-compat`", era v1.1.0) y **no instalados** en `.git/hooks` (inertes) | Confusos: describen un flujo que ya no existe (hoy la protección es por GitHub: PR + CI) | Implementado (F2) | Eliminados los 3 scripts (decisión D2) |

---

# Deuda Técnica

| ID | Detectado en | Descripción | Impacto | Estado |
| -- | ------------ | ----------- | ------- | ------ |
| DT1 | Evaluación 07-31 | `batch.middleware.ts`: **14 caracteres U+FFFD** en comentarios (L188-189, L461-463): acentos corruptos ("raiz"→"ra??z", "envian"→"env??an", "peticion"→"petici??n", "tambien", "posicion") | Legibilidad de código; único archivo de código con corrupción de encoding detectada | Implementado (F2) | Acentos restaurados en los 5 comentarios; `grep \uFFFD` en `src/` = 0 |
| DT2 | Evaluación 07-31 | `src/__tests__/integration/odata-count.api.test.ts` L74-80: comentario "KNOWN ISSUE" obsoleto (afirma que `$filter` crashea con BD real; resuelto en N6, ciclo 13 — la ruta responde 200 con datos) | Comentario engañoso sobre el motivo del mock | Implementado (F1) | Comentario reescrito: describe el motivo real (determinismo del fixture) |
| DT3 | Evaluación 07-31 | `docs/12-financial-ui5-testing/02-implementation-backlog.md`: fila **B7 duplicada** con estados contradictorios (una "Implementado", otra "Movido a iniciativa futura") | Backlog cerrado pero incoherente | Implementado (F1) | Fila duplicada B7 eliminada; se conserva la B7 real (Implementado) y la B8 |
| DT4 | Evaluación 07-31 | Checkboxes sin marcar en fases de **ciclos completados**: 05 (f7, plan maestro), 06 (f0.1, f1-modelos, f1.3/1.4, f2.x, f4, f5, plan maestro), 07 (f1–f4, plan, 01-arquitectura), 08 (g1, g3, g4, g5). Algunos **superseded** por ciclos posteriores (ej. f2.5: "50 facturas" → 150 por IF01), otros genuinamente hechos sin tickear (ej. f7-merge de 05: mergeado vía PR #1) | Documentación engañosa (patrón ya detectado en N9, ciclo 13, pero nunca barrido completo) | Implementado (F1) | Triage por ítem: `[x]` con evidencia o `[~]` superseded con nota; **0 checkboxes sin marcar** en `docs/` (verificado por grep) |
| DT5 | Evaluación 07-31 | `docs/02-patrones/10-best-practices-checklist.md`: **60 casillas sin marcar** y contenido que **contradice la arquitectura vigente** — recomienda "OData solo-lectura + REST para escritura" y "NO escribir desde OData" (invertido deliberadamente en el ciclo 05, OData-as-domain) | Documentación activamente engañosa: propone lo contrario del diseño actual | Implementado (F1) | Checklist reescrita completa: alineada a OData-as-domain, casillas marcadas con evidencia |

---

# Investigaciones Futuras (re-evaluación de pendientes previos)

| ID | Detectado en | Tema | Motivo | Estado |
| -- | ------------ | ---- | ------ | ------ |
| IF01-10 | Ciclo 10 | Skill `playwright-best-practices` (currents-dev) — solo aporta si existe suite E2E Playwright (hoy la validación es exploratoria vía MCP) | Sin evidencia de necesidad actual | Descartado (F3, D4) | Ver fila IF01 del backlog 10 |
| IF02-10 | Ciclo 10 | API key de Context7 (Upstash) si crece el uso | Sin evidencia de rate-limit alcanzado | Descartado (F3, D4) | Ver fila IF02 del backlog 10 |
| IF03-10 | Ciclo 10 | Suite `secondsky/sap-skills` complementaria (sapui5-cli, sapui5-linter, sap-fiori-tools) | `ui5-odata-demo` ya tiene CI real con `ui5 lint` | Descartado (F3, D4) | Ver fila IF03 del backlog 10 |
| IF04-15 | Auditoría 2026-08-15 | Cobertura de contrato SAPUI5 sin re-evaluar (plan del ciclo 04, `04-sapui5-compat/15-ui5-integration-plan.md`): action/function imports, `$apply`/`$search`, `$orderby` sobre navegaciones, streams y deep-create `$1` quedaron como "resto pendiente" | **Descartado**: la app UI5 real (demo/backend, ciclos 07–13) no usa ninguna de esas 6 features — grep en el workspace devolvió 0 coincidencias de `$apply`, `$search`, Action/FunctionImport, deep-create y rutas `/com.sap`. Lo validado (CRUD/$filter/$expand/$orderby simple, navegaciones) está cubierto por la suite de compat 185/185 y el E2E Playwright 8/8. Solo se reabriría si un futuro consumidor SAPUI5 lo requiere | Descartado | Auditoría 2026-08-15: decisión del usuario — descartar con nota |

---

# Decisiones Arquitectónicas Pendientes

| ID | Tema | Motivo | Estado |
| -- | ---- | ------ | ------ |
| D1 | Destino de `security.middleware.ts` (huérfano): eliminar vs conservar documentado para futura autenticación | No hay rutas protegidas hoy (solo `/odata`, demo); la clase solo se testea a sí misma | Implementado (F2) | **Eliminado** (archivo + test). El middleware de seguridad se re-creará cuando exista autenticación real (YAGNI) |
| D2 | Destino de `scripts/git-hooks/*` obsoletos: eliminar vs actualizar al flujo actual (PR + CI) vs conservar como referencia | Inertes (no instalados), describen un protocolo de la era v1.1.0 | Implementado (F2) | **Eliminados** los 3 scripts. La protección real es GitHub (rama protegida + PR + CI) |
| D3 | Alineación Node: bajar a 20.18.0 (`.nvmrc`) vs adoptar 22 (actualizar `.nvmrc`/`engines`/CI) | Deriva local detectada (R1) | Implementado (F3) | **Adoptar Node 22.20.0**: `.nvmrc` = `22.20.0`, `engines.node` = `>=22 <23`, CI `node-version: 22.20.0` |
| D4 | Cierre definitivo de IF01-10/IF02-10/IF03-10: descartar vs mantener diferidos con motivo renovado | Cumplen su propósito documental; reevaluados sin nuevas evidencias | Implementado (F3) | **Descartadas**; backlog 10 actualizado (estado + cierre de iniciativa + registro) |
| D5 | Lint en `odata-server`: añadir ESLint (como `ui5-odata-demo`) vs mantener gate actual (tsc + type-check tests) | El gate actual ya atrapa errores de tipos y compilación; lint añade valor limitado | Implementado (F3) | **No añadir ESLint**: se mantiene el gate actual (`pnpm build` + `tsc --noEmit` sobre `tsconfig.test.json`) |

---

# Registro de Resoluciones

| Fecha | ID | Acción realizada |
| ----- | -- | ---------------- |
| 2026-07-31 | — | Evaluación exhaustiva completada: docs revisados (índice, 9 backlogs, planes), suite 192/192, build verde, CI configurado en ambos repos, git sin pendientes (issues/PRs cerrados), BD local operativa con migraciones 001-003. 12 hallazgos clasificados (1 riesgo, 1 mejora, 3 refactors, 5 deuda técnica, 3 investigaciones + 5 decisiones). |
| 2026-07-31 | — | Plan maestro y backlog del ciclo 15 creados (este documento). |
| 2026-07-31 | D1–D5 | Decisiones aprobadas por el usuario y ejecutadas (ver tablas). |
| 2026-07-31 | R1/RF1–RF3/DT1 | F2+F3: código y entorno limpiados — ver tablas. |
| 2026-07-31 | M1/DT2–DT5 | F1: documentación corregida y triageada — ver tablas. |

---

| 2026-08-15 | IF04-15 | Auditoría del ecosistema: hallazgo de cobertura de contrato SAPUI5 (plan 15 del ciclo 04) registrado en Investigaciones Futuras — **pendiente de decisión del usuario** (Descartado con nota vs Investigación futura). |
| 2026-08-15 | — | **Auditoría del ecosistema (limpieza documental)**: README e índice §18 actualizados (subproyectos cerrados); plan 07 con 4 filas marcadas superseded (write services, exports main.ts, , vistas finance — resueltos en ciclos posteriores); headers de estado 📋 de planes 05/07 y fases 07/08 corregidos; IF04-15 registrado (ver fila) |
# Cierre de la iniciativa

Iniciativa **finalizada** (2026-07-31):

- Todos los elementos en estado **Implementado** o **Descartado** (D1–D5, R1, M1,
  RF1–RF3, DT1–DT5, IF01-10/02-10/03-10). No quedan elementos en "Pendiente" ni
  "En evaluación".
- **RF1 se resolvió parcialmente por evidencia**: el regex `/demo/` de `main.ts`
  resultó load-bearing (24 tests de compat SAPUI5 lo cubren) → se conserva
  documentado como compat shim; se eliminaron el mount `/api`, su import y
  `global.router.ts` (huérfano).
- Suite final: **185/185 PASS** (192 − 7 tests del `security.middleware.test.ts`
  eliminado con D1); build y type-check verdes; `db:reset` determinista (2
  ejecuciones, md5 idéntico); validación Playwright 8/8 con 0 errores de consola.
