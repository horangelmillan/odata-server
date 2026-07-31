# Implementation Backlog — Pulido Total

> **Ciclo:** `feat/pulido-total`
> **Última actualización:** 2026-07-31

## Propósito

Centraliza los hallazgos detectados durante la investigación exhaustiva del proyecto
(2026-07-31) previa al ciclo de pulido, según las reglas de `AGENTS.md`.

Estados válidos: Pendiente · En evaluación · Aprobado · Implementado · Descartado · Movido a una iniciativa futura.

---

# Riesgos

| ID | Detectado en | Descripción | Impacto | Estado | Resolución |
| -- | ------------ | ----------- | ------- | ------ | ---------- |
| N1 | Investigación 07-31 | `PaymentList.view.xml:47` binding `{fecha}` sin `type: String` → FormatException DateTimeOffset en consola (fix B17 no aplicado a esta vista) | Medio — ruido de consola, render afectado | Implementado | Fase A1: binding con `type: String` ✅ (verificado 0 errores) |
| N2 | Investigación 07-31 | `CustomerDetail.view.xml:44` binding `{fecha}` sin `type: String` → misma FormatException | Medio | Implementado | Fase A2: binding con `type: String` ✅ |
| N3 | Investigación 07-31 | `GET /i18n/i18n_en.properties` → 404. El fix B10 (`supportedLocales: ["", "en"]`) declara 'en' pero el archivo no existe | Medio — error de red por vista | Implementado | Fase A3: `i18n_en.properties` creado ✅ (verificado 200) |
| N4 | Investigación 07-31 | `GET /odata/` → 404 (service document raíz no implementado) | Bajo — menor | **DECIDIDO (07-30): Aceptado** | El service document raíz no es usado por SAPUI5 (usa `$metadata`); 404 estándar de Express para ruta no definida. Se registra como aceptado; no se implementa (YAGNI). |
| **N18** | Diagnóstico 07-31 (Fase A) | **CRÍTICO — bindings por-key tipados de UI5 v4 no procesan las respuestas del servidor.** | **Alto — vistas detail vacías** | **IMPLEMENTADO (07-31)** | **Causa raíz:** los controllers usaban path por-key con **slash** (`/invoice-odata/I00001`). UI5 v4 no separa la clave del meta path (`sMetaPath: "/invoice-odata/I00001"` → tipo irresoluble → binding nunca envía request → Raw). La sintaxis OData v4 por-key es con **paréntesis** (`/invoice-odata('I00001')`). **Fix:** controllers InvoiceDetail/CustomerDetail con paréntesis + proxy-to-server matchea `(` tras el entity set. Verificado: 6/6 vistas con 0 errores, datos reales visibles (I00001 + expand). Los checks del ciclo 12 eran falsos positivos. |
| N19 | Diagnóstico 07-31 (Fase A) | Seed demo no re-ejecutable tras `db:reset`: los productos usan auto-increment (IDs 423+) y el test bench usa IDs fijos (348, 1) → by-key demo 404. Además "Create via $batch changeset" del test bench FALLA (antes OK). | Medio | **IMPLEMENTADO (07-30)** | **Causa raíz del $batch:** `assemble()` en `batch.middleware.ts` unía los bloques del changeset **sin CRLF previo al boundary** (`..."Z"}--changeset_id-...`), violando RFC 2046. SAPUI5 no separa las partes → `JSON.parse` falla ("Unterminated string in JSON at position 222") → `created()` nunca resuelve (el dato SÍ se persistía). El "quirk de cliente UI5" documentado en F6.1 era este bug del servidor mal diagnosticado. **Fix:** CRLF antes de cada delimitador + test de regresión (`odata-batch.api.test.ts`). Seed demo: re-ejecutado (20 productos IDs 1–20, 5 categorías); by-key 1 → 200. **Validación Playwright:** test bench 8/8 PASS (incl. "Create via $batch changeset" ids=451,452), 0 errores de consola (solo 404 `/odata/` = N4). Suite: 176/176 PASS. |

---

# Mejoras

| ID | Detectado en | Descripción | Prioridad | Estado | Observaciones |
| -- | ------------ | ----------- | --------- | ------ | ------------- |
| N5 | Investigación 07-31 | CI (`ci.yml`) no ejecuta `tsc --noEmit --project tsconfig.test.json` — el type-check de tests (DT02) no está gateado | Alta | Implementado — Fase B1 ✅ | Gate añadido tras `pnpm build`. |
| N7 | Investigación 07-31 | `package.json` version `2.1.0` desactualizada (múltiples features desde `v2.1.0-financial-eco`) | Media | Implementado — Fase B3 ✅ | Bump a `2.2.0`; tag `v2.2.0` tras merge. |

---

# Refactorizaciones

| ID | Detectado en | Descripción | Motivo | Estado |
| -- | ------------ | ----------- | ------ | ------ |
| N8 | Investigación 07-31 | `docs/00-indice.md` desalineado: ciclo 12 "En ejecución", IF01/DT02 "movidos a futuro", sin modelo financiero rico | Documentación no confiable | Implementado — Fase C1 ✅ |
| N15 | Investigación 07-31 | ~50 casts `as unknown as`/`as never` repetidos en 10 servicios (patrón `modelOf`) | Duplicación; cambio centralizado en 1 lugar | **Implementado — Fase E1 ✅**: `src/common/service/odata/odata-model-of.ts` creado; los 10 services usan el helper compartido. Build verde + type-check 0. Resto de casts documentados en E3. |

---

# Deuda Técnica

| ID | Detectado en | Descripción | Impacto | Estado |
| -- | ------------ | ----------- | ------- | ------ |
| N9 | Investigación 07-31 | `docs/06-financial-eco/fases/f3-relaciones-y-estados.md`: 4 checkboxes sin marcar aunque el índice declara F3 ✅ | Documentación engañosa | Implementado — Fase C2 ✅ (verificados contra ciclos 06/11/12) |
| N10 | Investigación 07-31 | Backlogs C09 (L75) y C11 (L95) afirman IF01/DT02 "movidos a futuro" — ya implementados | Documentación desactualizada | Implementado — Fase C3 ✅ |
| N11 | Investigación 07-31 | `.playwright-mcp/` con 35 archivos de sesiones (ignorado por git pero ocupa espacio) | Higiene | Implementado — Fase D1 ✅ |
| N12 | Investigación 07-31 | 10 logs/basura en raíz de `ui5-odata-demo` | Higiene | Implementado — Fase D2 ✅ |
| N13 | Investigación 07-31 | `.tsbuildinfo` 194KB en raíz (ignorado) | Higiene | Implementado — Fase D3 ✅ |
| N16 | Investigación 07-31 | 8 casts `as any[]` en `financial-seed.ts` (bulkCreate) | Deuda aceptada (tipado de Sequelize) | Registrado (E3) — se mantiene |
| N20 | Diagnóstico 07-31 | `forceSelection` inválido en `sap.m.ComboBox` (InvoiceList.view.xml) → ASSERT FUTURE FATAL | Ruido de consola | Implementado — eliminado ✅ |

---

# Investigaciones Futuras

| ID | Detectado en | Tema | Motivo | Estado |
| -- | ------------ | ---- | ------ | ------ |
| N6 | Investigación 07-31 | it.todo KNOWN ISSUE `odata-count.api.test.ts:242`: colección `$filter` con BD real no validado (datasource mockeado) | **RESUELTO (07-31):** `$filter` con BD real responde 200 con datos. `it.todo` reemplazado por test real. 18/18 PASS. | Implementado — Fase B2 ✅ |
| N18 | Diagnóstico 07-31 | **CRÍTICO — binding por-key tipado de UI5 v4 no procesa respuestas** (ver Riesgos). | **RESUELTO (07-31):** causa raíz = sintaxis por-key con slash en los controllers (UI5 v4 requiere paréntesis). Fix en controllers + proxy. Verificado con datos visibles. Los P0.7/P0.8/P2.5a/P2.6a del ciclo 12 eran falsos positivos. | Implementado — investigación N18 ✅ |

---

# Decisiones Arquitectónicas Pendientes

| ID | Tema | Motivo | Estado |
| -- | ---- | ------ | ------ |
| N14 | ¿Repo remoto para `ui5-odata-demo`? | Repo local sin remote: riesgo de pérdida del trabajo UI5 | **IMPLEMENTADO (07-31):** Repo GitHub **público** `horangelmillan/ui5-odata-demo` (GitHub Free no permite protección en privados; decisión del usuario 07-31: público). Ramas `main` y `dev` **protegidas** (solo PR, 1 review requerida, enforce admins). Código pusheado (3 commits). |
| N17 | Re-evaluar DAP2 (simetría supplierinvoice items/pagos) | IF01 C11 (modelo financiero rico) ya implementado: supplierinvoice YA tiene dueDate/netAmount/taxAmount/grossAmount/docNumber. La simetría restante (items + pagos para supplierinvoice) requiere: nueva tabla `supplierinvoiceitems`, modelos, DTOs, endpoints, seed y UI5 → iniciativa sustancial independiente | **DECIDIDO (07-31):** Se mantiene diferido como iniciativa futura. El modelo financiero rico ya cubre la parte fiscal; los items/pagos de proveedor se evaluarán en una iniciativa dedicada (coste/beneficio no justifica en ciclo de pulido). |

---

# Registro de Resoluciones

| Fecha | ID | Acción realizada |
| ----- | -- | ---------------- |
| 2026-07-31 | N14 | Decisión tomada: repo privado GitHub para ui5-odata-demo con main/dev protegidas. |
| 2026-07-31 | N1 | PaymentList `{fecha}` → `type: String`. Verificado: 0 errores en PaymentList. |
| 2026-07-31 | N2 | CustomerDetail `{fecha}` → `type: String`. |
| 2026-07-31 | N3 | `i18n_en.properties` creado (alias del default). Verificado: 200. |
| 2026-07-31 | — | Fix ETag header: `res.set("ETag", etag)` → `res.set("ETag", \`"${etag}"\`)` (RFC 7232, comillas obligatorias) en `odata.service.ts`. |
| 2026-07-31 | N18 | Diagnóstico completo: el binding por-key tipado no procesa respuestas (Raw). Evidencia: `requestObject()` OK vs `getObject()` vacío en demo y finance; servidor responde 200 con datos y `@odata.context` correcto (probados `$metadata#.../$entity` y `/$metadata#.../$entity`); `$metadata` EDMX correcto (10 EntityTypes). Los P0.7/P0.8/P2.5a/P2.6a del ciclo 12 fueron falsos positivos (validación por título). → Investigación dedicada requerida. |
| 2026-07-31 | N19 | Seed demo re-ejecutado (20 productos IDs 1–20, 5 categorías); by-key 1 → 200. **$batch changeset:** causa raíz = CRLF faltante antes del boundary (RFC 2046) en `assemble()` de `batch.middleware.ts` — el "quirk de cliente" de F6.1 era un bug del servidor. Fix + test de regresión. Test bench Playwright: 8/8 PASS, created() resuelve (ids=451,452). Suite 176/176. |
| 2026-07-31 | N4 | Decisión: service document raíz aceptado como no implementado (SAPUI5 no lo usa; `$metadata` cubre el descubrimiento). Registrado en backlog. |
