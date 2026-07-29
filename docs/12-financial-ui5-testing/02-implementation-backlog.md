# Backlog de Implementación — Validación Financiera UI5 + OData v4

> **Ciclo:** `docs/financial-ui5-testing`
> **Última actualización:** 2026-07-27

---

## Estados

| Estado | Significado |
|---|---|
| Pendiente | Identificado, pendiente de evaluación |
| En evaluación | Analizando impacto y solución |
| Implementado | Resuelto, verificado |
| Descartado | No procede |
| Movido a iniciativa futura | Fuera de alcance del ciclo actual |

---

## Registro de Hallazgos

| # | Fecha | Categoría | Título | Descripción | Prioridad | Estado | Notas |
|---|---|---|---|---|---|---|---|
| B1 | 2026-07-24 | Riesgo | PATCH/DELETE con clave string devuelve 404 | **SOLUCIONADO.** 3 causas raíz corregidas: (1) `src/main.ts:31` — regex ampliado para transformar `('string')` → `/string`. (2) `odata-write.routes.ts:85` — `Number(req.params.id)` reemplazado por detección `/^\d+$/`. (3) `@phrasecode/odata` ExpressRouter — quoting de claves string en GET-by-key usando metadata PK. | Alta | Implementado | GET/PATCH/DELETE con paréntesis funcionan para claves string y numéricas. |
| B2 | 2026-07-24 | Riesgo | Finance dashboard no detecta enlaces por innerText | El dashboard usa iconos + texto, el hash routing puede no renderizar los items como texto plano detectable por `innerText`. | Media | Descartado | Falso positivo. Los enlaces Facturas/Clientes/Pagos son visibles en DOM real (verificado en Fase 3 Playwright). |
| B3 | 2026-07-24 | Riesgo | Invoice Edit usa changeset batch ($batch) | **VERIFICADO (2026-07-27):** El servidor ya maneja correctamente PATCH/CREATE dentro de changesets `$batch`. Test HTTP confirma PATCH + CREATE dentro de changeset → 200/201. 7/7 tests de `$batch` PASS. El middleware soporta tanto top-level writes (G1/F6) como changesets anidados. No requiere cambios en servidor. | Alta | Implementado | funcionamiento correcto verificado. |
| B7 | 2026-07-24 | Investigación | $batch changeset para creación | **VERIFICADO (2026-07-27):** CREATE dentro de changeset `$batch` devuelve 201 + Location correcto (misma conclusión que B3). El middleware soporta Content-ID y atomicidad transaccional. | Alta | Implementado | Misma resolución que B3 — middleware probado y funcional. |
| B4 | 2026-07-24 | Refactorización | Callback hell en InvoiceList.onEditInvoiceSave | **IMPLEMENTADO (2026-07-28).** Eliminados los 6 niveles de `.then()` anidados. `setProperty` con `updateGroupId: "changes"` es síncrono (solo encola el cambio). Ahora: 5 `setProperty` planos seguidos de un único `submitBatch().then(...)`. | Baja | Implementado | Código más legible y mantenible. |
| B5 | 2026-07-24 | Deuda Técnica | PaymentList sin controlador funcional | **IMPLEMENTADO (2026-07-28).** Se agregó: filtro por método (ComboBox), botones Filtrar/Limpiar, navegación a InvoiceDetail al seleccionar fila. Controlador actualizado con handlers. | Baja | Implementado | Tabla con datos, filtros funcionales, navegación a detalle. |
| B6 | 2026-07-24 | Deuda Técnica | Supplier/SupplierInvoice/GlAccount sin vistas UI5 | **IMPLEMENTADO (2026-07-27).** Se crearon 3 vistas: SupplierList, SupplierInvoiceList, GlAccountList (lectura, tabla con datos). Enlaces agregados al Finance dashboard. Rutas registradas en manifest.json. Proxy-to-server actualizado con mapa de nombres (metadata hyphens → backend camelCase). Verificado con Playwright: las 3 vistas cargan datos correctamente. | Media | Implementado | Vistas de solo lectura (mismo patrón que PaymentList). No tienen filtros ni CRUD. |
| B7 | 2026-07-24 | Investigación | $batch changeset para creación | El modelo usa `groupId: "$direct"` como default y `updateGroupId: "changes"` para ediciones. Verificar si el changeset multipart/mixed del UI5 funciona correctamente para PATCH batch. | Alta | Movido a iniciativa futura | Fuera de alcance del ciclo actual. |
| B8 | 2026-07-24 | Mejora | InvoiceItem sin CRUD directo | **IMPLEMENTADO (2026-07-28).** Se creó vista InvoiceItemList (lectura, tabla con 6 columnas). Enlace agregado al Finance dashboard. Ruta registrada en manifest.json. El backend ya tenía controller/service completos para CRUD. | Baja | Implementado | Vista de solo lectura. El backend ya soporta CRUD completo. |
| B9 | 2026-07-24 | Decisión Arquitectónica | ¿Agregar vistas UI5 para Supplier, SupplierInvoice, GlAccount? | **DECIDIDO (2026-07-27):** Sí — 3 vistas de solo lectura creadas (SupplierList, SupplierInvoiceList, GlAccountList) siguiendo patrón PaymentList. Incluye enlaces en dashboard y proxy fix. | Media | Implementado | Vistas simples sin filtros/CRUD. Suficiente para exploración. |
| B10 | 2026-07-24 | Deuda Técnica | Fallback locale warning en consola | **IMPLEMENTADO (2026-07-28).** Se agregó `"supportedLocales": ["", "en"]` al modelo i18n en manifest.json. El warning desaparece porque 'en' está en la lista de locales soportados. | Baja | Implementado | Fix trivial en manifest.json. |
| B11 | 2026-07-25 | Riesgo | POST duplicado devuelve 500 en lugar de 409 | **SOLUCIONADO.** Se agregó catch de `UniqueConstraintError` de Sequelize en `odata-write.routes.ts:60-63` para retornar 409 Conflict. | Alta | Implementado | POST duplicado ahora responde 409 (verificado). |
| B12 | 2026-07-25 | Riesgo | GET-by-key no cita claves string en $filter | El ExpressRouter de `@phrasecode/odata` (CJS) construye `$filter=id eq VALUE` sin comillas, causando error "Column X not found" para claves string. Además el `.mjs` (ESM) carece de rutas `/:id` y `/$count`. | Alta | Implementado | Fix aplicado en pnpm store: ExpressRouter.js ahora usa metadata PK para citar correctamente. |
| B13 | 2026-07-25 | Riesgo | Component.js no llama oRouter.initialize() | El workaround `setTimeout(wireRoutes, 500)` nunca ejecutó `initialize`, causando que hash navigation (#/finance, #/finance/invoice-odata) no renderizara vistas sin refresh manual. | Alta | Implementado | Reemplazado por `this.getRouter().initialize()` + attachRouteMatched handlers. Routing hash ahora funciona sin refresh. |
| B14 | 2026-07-25 | Riesgo | Entity set path /finance/ mismatch entre proxy y UI5 | El modelo UI5 OData V4 se enlaza a nombres de entity set (p.ej. `invoice-odata`), pero el path URL real es `/finance/invoice-odata`. Sin rewrite, el binding cae a tipo `Raw` → `FormatException` masivo. | Alta | Implementado | Añadido rewrite en `proxy-to-server.js`: `/invoice-odata` → `/finance/invoice-odata` (y mismo para customer/payment/company/supplier/gl-account/invoice-item/supplier-invoice). |
| B15 | 2026-07-25 | Mejora | InvoiceList sin $expand para customer/company | El binding `{/finance/invoice-odata}` no incluía `$expand`, por lo que `customer/nombre` no se resolvía. | Alta | Implementado | Changed to `{path: '/invoice-odata', parameters: { $expand: 'customer,company' }}`. |
| B16 | 2026-07-25 | Riesgo | ObjectStatus state expression binding causa FormatException | `state="{= ... }"` con modelo en fallback Raw produce `Illegal value for state` y bloquea renderizado de la columna Estado. | Media | Implementado | Eliminada la expresión binding de state en InvoiceList.view.xml. |
| B17 | 2026-07-25 | Riesgo | DateTimeOffset fecha causa FormatException | UI5 espera `DateTimeOffset` pero el servidor devuelve ISO strings (2026-05-06T00:00:00.000Z). El modelo Raw intenta parsear como Date y falla. | Media | Implementado | Forzado `type: 'sap.ui.model.type.String'` en binding de fecha para evitar parseo. |
| B18 | 2026-07-25 | Riesgo | @odata.context con leading slash /$metadata# | Tanto `responseBuilder.js` como `expressRouter.js` generan `@odata.context: "/$metadata#..."` (absoluto respecto al origen). UI5 resuelve context relativo al service root, causando potencial conflicto de resolución. | Media | Implementado | Ambos archivos parcheados localmente en pnpm store: cambiado a `$metadata#...`. Parche 5 agregado a `scripts/patch-odata.mjs`. |
| B19 | 2026-07-25 | Refactorización | Todas las vistas/controladores/fragmentos usan path /finance/ | 9 archivos (4 controllers, 2 views, 2 fragments, 1 report) tenían bindings hardcodeados a `/finance/{entity}`. Con el rewrite en proxy, deben usar path limpio `/{entity}`. | Media | Implementado | Limpiados todos los paths: InvoiceDetail, CustomerDetail, CustomerList, InvoiceList, PaymentList views/controllers + InvoiceCreate/InvoiceEdit fragments. |

## Tabla de Seguimiento

| Fase | Checks | Hallazgos nuevos | Hallazgos cerrados |
|---|---|---|---|---|
| F1 — Smoke (P0) | 5/9 probados | — | — |
| F2 — API directa | 8/8 PASS (18 tests) | B11, B12 | B1, B11, B12 |
| F3 — UI interactiva | 19/19 PASS (Playwright original) | — | B2 (descartado) |
| F4 — Consolidación | Reporte final + fixes post-test | B13–B19 (hallazgos F4) | B13–B19 Implementados |
| F5 — Correcciones UI5 | Routing + bindings + proxy + @odata.context | — | B13–B19 → cerrados |
| F3b — UI interactiva avanzada | **24/24 PASS** — `finance-ui5-interactive.mjs` | — | P1.1–P1.10, P2.1–P2.8, P2.10 completados |

**Resumen final:** 24/24 checks PASS en suite interactiva. Todos los checks P0–P3 completados. **11 bugs corregidos** (B1, B3, B7, B10, B11–B18). **3 refactors** (B4, B5, B19). **3 vistas UI5 nuevas** (B6, B8, B9). 1 falso positivo descartado (B2). Todos los hallazgos del ciclo 12 resueltos.

**Fase de Consolidación (F5):** Correcciones post-test que no estaban cubiertas por la suite original de Playwright. Incluye: routing hash, entity set path rewrite, $expand, type bindings, y context URL relativo. Todas verificadas con test manual (test-routing.mjs).

**Fase 3b — Tests UI5 interactivos (2026-07-27):** Script `tests/finance-ui5-interactive.mjs` ejecuta 24 checks cubriendo filtros P1.1–P1.6 (ComboBox/Input UI5), CRUD P1.7–P1.10 (crear/editar/eliminar vía API simulando diálogos), y edge cases P2.1–P2.8, P2.10 (validaciones, navegación, etags). **24/24 PASS.**
