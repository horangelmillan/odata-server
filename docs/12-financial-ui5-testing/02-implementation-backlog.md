# Backlog de Implementación — Validación Financiera UI5 + OData v4

> **Ciclo:** `docs/financial-ui5-testing`
> **Última actualización:** 2026-07-24

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
| B2 | 2026-07-24 | Riesgo | Finance dashboard no detecta enlaces por innerText | El dashboard usa iconos + texto, el hash routing puede no renderizar los items como texto plano detectable por `innerText`. | Media | Pendiente | Usar `browser_snapshot` en lugar de `innerText` para verificar. |
| B3 | 2026-07-24 | Riesgo | Invoice Edit usa changeset batch ($batch) | El controlador `InvoiceList.onEditInvoiceSave` usa `setProperty` encadenado con `updateGroupId: "changes"`. Si el changeset batch no funciona, la edición fallará silenciosamente. | Alta | Pendiente | Verificar durante P1.9. |
| B4 | 2026-07-24 | Refactorización | Callback hell en InvoiceList.onEditInvoiceSave | 6 niveles de `.then()` anidados para `setProperty`. Frágil y difícil de depurar. | Baja | Pendiente | Fuera de alcance. Mover a iniciativa futura si se decide refactorizar. |
| B5 | 2026-07-24 | Deuda Técnica | PaymentList sin controlador funcional | Solo inicializa el router. No hay filtros, acciones ni binding dinámico. | Baja | Pendiente | Aceptado como diseño actual (solo lectura). |
| B6 | 2026-07-24 | Deuda Técnica | Supplier/SupplierInvoice/GlAccount sin vistas UI5 | Solo accesibles vía API directa o expand desde otras entidades. | Media | Pendiente | Evaluar si se agregan en ciclo futuro. |
| B7 | 2026-07-24 | Investigación | $batch changeset para creación | El modelo usa `groupId: "$direct"` como default y `updateGroupId: "changes"` para ediciones. Verificar si el changeset multipart/mixed del UI5 funciona correctamente para PATCH batch. | Alta | Pendiente | Verificar durante P1.9 y con captura de red. |
| B8 | 2026-07-24 | Mejora | InvoiceItem sin CRUD directo | Solo se puede crear como parte del expand de Invoice. No hay endpoint dedicado en UI5. | Baja | Pendiente | Fuera de alcance. |
| B9 | 2026-07-24 | Decisión Arquitectónica | ¿Agregar vistas UI5 para Supplier, SupplierInvoice, GlAccount? | Actualmente no hay vistas dedicadas; solo accesibles vía API directa. | Media | Pendiente | Decidir según resultados de P3.4. |
| B10 | 2026-07-24 | Deuda Técnica | Fallback locale warning en consola | "The fallback locale 'en' is not contained in the list of supported locales" — warning de ResourceModel. | Baja | Pendiente | Verificar durante P0.2. No bloqueante. |
| B11 | 2026-07-25 | Riesgo | POST duplicado devuelve 500 en lugar de 409 | **SOLUCIONADO.** Se agregó catch de `UniqueConstraintError` de Sequelize en `odata-write.routes.ts:60-63` para retornar 409 Conflict. | Alta | Implementado | POST duplicado ahora responde 409 (verificado). |
| B12 | 2026-07-25 | Riesgo | GET-by-key no cita claves string en $filter | El ExpressRouter de `@phrasecode/odata` (CJS) construye `$filter=id eq VALUE` sin comillas, causando error "Column X not found" para claves string. Además el `.mjs` (ESM) carece de rutas `/:id` y `/$count`. | Alta | Implementado | Fix aplicado en pnpm store: ExpressRouter.js ahora usa metadata PK para citar correctamente. |

## Tabla de Seguimiento

| Fase | Checks | Hallazgos nuevos | Hallazgos cerrados |
|---|---|---|---|---|
| F1 — Smoke (P0) | 9 | — | — |
| F2 — API directa | 8 | B11, B12 | B1, B11 |
| F3 — UI interactiva | 22 | — | — |
| F4 — Consolidación | — | — | — |
