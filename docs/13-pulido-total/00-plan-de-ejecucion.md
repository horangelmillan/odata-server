# 00 — Plan de Ejecución: Pulido Total del Proyecto

> **Ciclo:** `feat/pulido-total` (rama dedicada; merge a `master` solo vía PR, flujo `docs/07-workflow/GIT_WORKFLOW.md`)
> **Inicio:** 2026-07-31
> **Estado global:** 🚧 En ejecución
> **Baseline:** `pnpm build` ✅ · `pnpm test` 174/174 ✅ · `tsc --project tsconfig.test.json` 0 errores ✅

---

## 0. Resumen Ejecutivo

Pulido total del proyecto tras la resolución de los backlogs de los ciclos 08–12 (todos
cerrados) y la implementación del modelo financiero rico (IF01 C11). Este ciclo aborda:

1. **Bugs visibles en consola UI5** (FormatException DateTimeOffset, 404 de i18n_en).
2. **Calidad/CI**: gate de type-check de tests, resolución del KNOWN ISSUE `$filter`, bump de versión.
3. **Documentación desalineada** (índice 00, checkboxes de fases antiguas, backlogs C09/C11).
4. **Higiene de repositorios** (artefactos Playwright, logs, `.tsbuildinfo`) y repo remoto para `ui5-odata-demo`.
5. **Deuda técnica evaluada**: helper `modelOf()` compartido, re-evaluación de DAP2.

---

## 1. Sistema de Checklist

Cada hallazgo/acción tiene un ID único (`F`, `A`, `B`, `C`, `D`, `E`). Estado: `[ ]` pendiente → `[x]` completado.
Cada ítem tiene criterio de aceptación explícito.

---

## 2. Fases

### FASE 0 — Documentación del ciclo

| ID | Acción | Estado |
|---|---|---|
| F0.1 | Crear `docs/13-pulido-total/00-plan-de-ejecucion.md` (este documento) | [ ] |
| F0.2 | Crear `docs/13-pulido-total/02-implementation-backlog.md` con hallazgos N1–N17 | [ ] |
| F0.3 | Registrar baseline (build, 174 tests, type-check 0 errores) | [ ] |
| F0.4 | Rama `feat/pulido-total` desde `master` actualizado | [ ] |

**Aceptación:** Documentos presentes; baseline documentado; rama creada desde master.

### FASE A — Correctivo UI5 (bugs visibles en consola)

| ID | Acción | Estado |
|---|---|---|
| A1 | Fix FormatException en `PaymentList.view.xml:47` (`{fecha}` → `type: String`) | [x] ✅ |
| A2 | Fix FormatException en `CustomerDetail.view.xml:44` (mismo patrón) | [x] ✅ |
| A3 | Fix 404 `i18n_en.properties`: crear archivo (alias del default) | [x] ✅ |
| A4 | Validación Playwright: PaymentList/InvoiceList/SupplierInvoiceList **0 errores** (solo 404 `/odata/` conocido) | [x] ✅ |

**Hallazgos adicionales de Fase A:**
- **N18 (CRÍTICO)**: binding por-key tipado de UI5 v4 no procesa respuestas (Raw) — demo y finance. `requestObject()` sí funciona. Tests del ciclo 12 (P0.7/P0.8/P2.5a/P2.6a) eran falsos positivos. → investigación dedicada (ver backlog).
- **N19**: seed demo no re-ejecutable (IDs auto-increment); test bench by-key con IDs fijos → 404; "Create via $batch" falla.
- **Fix extra**: PaymentList `$expand=invoice` (drill-down `{invoice/id}` fallaba).
- **Fix extra**: ETag header con comillas (RFC 7232) en `odata.service.ts`.
- **N20**: `forceSelection` inválido en ComboBox (InvoiceList) → eliminado.

**Aceptación:** Sin FormatException ni 404 de i18n en consola; verificado con Playwright MCP.

### FASE B — CI y Calidad

| ID | Acción | Estado |
|---|---|---|
| B1 | Añadir gate al CI: `npx tsc --noEmit --project tsconfig.test.json` antes de `pnpm test` | [x] ✅ |
| B2 | KNOWN ISSUE (`odata-count.api.test.ts:242`): probar `$filter` colección con BD real | [x] ✅ — **resuelto**: `$filter` con BD real responde 200 con datos. `it.todo` reemplazado por test real (`collection $filter against real DB`). 18/18 tests PASS. |
| B3 | Bump `package.json` `2.1.0` → `2.2.0` + tag `v2.2.0` tras merge | [x] ✅ (tag tras merge del PR) |

**Aceptación:** CI verde con gate; KNOWN ISSUE cerrado; versión alineada.

### FASE C — Documentación desalineada

| ID | Acción | Estado |
|---|---|---|
| C1 | Actualizar `docs/00-indice.md` (ciclo 12 completado, ciclo 13 añadido, IF01/DT02 implementados, modelo financiero rico) | [x] ✅ |
| C2 | `docs/06-financial-eco/fases/f3-relaciones-y-estados.md`: validar/marcar 4 checkboxes | [x] ✅ (verificados contra ciclos 06/11/12) |
| C3 | Corregir backlogs C09 y C11 (IF01/DT02 → Implementado) | [x] ✅ |

### FASE D — Higiene de repositorios

| ID | Acción | Estado |
|---|---|---|
| D1 | Eliminar `.playwright-mcp/` (35 archivos) | [x] ✅ |
| D2 | Eliminar 10 logs de raíz de `ui5-odata-demo` | [x] ✅ |
| D3 | Eliminar `.tsbuildinfo` + ajustar `.gitignore` | [x] ✅ |
| D4 | Repo remoto para `ui5-odata-demo` | [x] ✅ — GitHub **público** (`horangelmillan/ui5-odata-demo`), ramas `main`/`dev` **protegidas** (solo PR, 1 review, enforce admins), código pusheado. (GitHub Free no permite protección en privados → decisión usuario: público.) |

### FASE E — Deuda técnica evaluada

| ID | Acción | Estado |
|---|---|---|
| E1 | Helper `modelOf()` compartido (10 servicios) | [x] ✅ — `odata-model-of.ts`; build verde + type-check 0 |
| E2 | Re-evaluar DAP2 post-IF01 C11 | [x] ✅ — mantenido diferido (simetría items/pagos de proveedor = iniciativa independiente; la parte fiscal ya cubierta) |
| E3 | Registrar casts (`as unknown as`, `as any[]`) como deuda aceptada | [x] ✅ — registrado en backlog (N16 + casts restantes) |

### FASE F — Cierre

| ID | Acción | Estado |
|---|---|---|
| F1 | Suite completa: `pnpm build`, `pnpm test`, type-check tests | [ ] |
| F2 | Validación Playwright final de las 8 vistas finance | [ ] |
| F3 | Actualizar backlog del ciclo 13 (estados finales) | [ ] |
| F4 | Commit + push + PR a `master` | [ ] |

**Aceptación:** Checklist completo; PR con check verde; backlog sin pendientes.

---

## 3. Registro de Hallazgos (referencia rápida)

| ID | Categoría | Hallazgo | Fase |
|---|---|---|---|
| N1 | Riesgo | FormatException PaymentList `{fecha}` | A1 |
| N2 | Riesgo | FormatException CustomerDetail `{fecha}` | A2 |
| N3 | Riesgo | 404 `i18n_en.properties` (fix B10 incompleto) | A3 |
| N4 | Riesgo | 404 `GET /odata/` (service document) | B2/registrar |
| N5 | Mejora | CI sin gate de type-check tests | B1 |
| N6 | Investigación | it.todo KNOWN ISSUE $filter BD real | B2 |
| N7 | Mejora | Version 2.1.0 desactualizada | B3 |
| N8 | Refactor | Índice 00 desalineado | C1 |
| N9 | Deuda | Checkboxes f3-relaciones sin marcar | C2 |
| N10 | Deuda | Backlogs C09/C11 desactualizados | C3 |
| N11 | Higiene | `.playwright-mcp/` 35 archivos | D1 |
| N12 | Higiene | 10 logs en ui5-odata-demo | D2 |
| N13 | Higiene | `.tsbuildinfo` 194KB | D3 |
| N14 | Decisión | ui5-odata-demo sin remote | D4 |
| N15 | Refactor | ~50 casts repetidos en servicios | E1/E3 |
| N16 | Deuda | 8 casts `as any[]` en seed | E3 |
| N17 | Decisión | Re-evaluar DAP2 post-IF01 | E2 |
