# 00 — Plan Maestro: DAP2 — Simetría SupplierInvoice (items + pagos)

> **Ciclo:** `14-dap2` (rama `feature/dap2-supplierinvoice-symmetry` en servidor + `feature/dap2-supplierinvoice-detail` en ui5-odata-demo)
> **Inicio:** 2026-07-31
> **Estado global:** ✅ **COMPLETADO** — merge a `master` vía PR #28 (CI verde). UI5 mergeado vía PR #3 (`ui5-odata-demo`).
> **Baseline:** `pnpm build` ✅ · `pnpm test` 176/176 ✅ · type-check tests 0 ✅

---

## 0. Contexto y origen

DAP2 nace del hallazgo **DT5** del ciclo 11 (documentación 16.2 afirmaba que
`invoiceitem` servía "(invoice o supplierinvoice)" — falso): `supplierinvoice` es
estructuralmente asimétrica frente a `invoice`:

| Aspecto | Invoice (ventas) | SupplierInvoice (compras) |
|---|---|---|
| Items | ✅ `invoiceitems` + `@HasMany` + vista detalle | ❌ (antes de este ciclo) |
| Pagos | ✅ `payments` + estado derivado de fecha+pagos | ❌ estado solo por antigüedad |
| UI5 detalle | ✅ InvoiceDetail con items | ❌ solo lista |

El modelo financiero rico (IF01, ciclo 11) ya aportó la simetría **fiscal**
(dueDate, netAmount, taxAmount, grossAmount, docNumber). Re-evaluado en N17
(ciclo 13) se decidió abordarlo como iniciativa independiente → este ciclo.

---

## 1. Decisiones de arquitectura

| D | Decisión | Alternativas descartadas |
|---|---|---|
| **D1** | Tabla nueva `supplierinvoiceitems` (id, supplierInvoiceId, glAccountId, material, cantidad, importe) | Reutilizar `invoiceitems` con FK nullable → contamina el modelo actual, FKs ambiguas |
| **D2** | Tabla nueva `supplierpayments` (id, supplierInvoiceId, fecha, importe, metodo) | Reutilizar `payments` con columna nullable → misma razón (fiel a S/4HANA: F-53 vs F-28) |
| **D3** | Dominios write completos `supplierinvoiceitem` y `supplierpayment` (interface → dto → service → controller → registration, patrón shared kernel) | Solo lectura → rompe simetría de API |
| **D4** | Seed con líneas de **gasto** (000300 materiales / 000600 suministros) y pagos coherentes | Sin cuentas de gasto → items sin cuenta válida |
| **D5** | Estado de supplierinvoice **derivado de fecha + pagos** (misma convención R3 que invoice) | Mantener antigüedad → inconsistencia con convención documentada |
| **D6** | UI5 SupplierInvoiceDetail (cabecera + items + pagos) con navegación desde la lista | Sin UI5 → ecosistema incompleto |

**Hallazgo adicional (F1):** el migrator Umzug tenía 2 bugs de Windows que
impedían aplicar migraciones en dev (glob con `.pathname` no resolvía; `import()`
de ruta nativa Windows requería `file://`). Corregidos en `migrator.ts`
(`fileURLToPath` + `pathToFileURL`) — las migraciones 001/002 nunca se habían
aplicado en la BD dev (las tablas las creaba `sync`).

---

## 2. Fases

| Fase | Contenido | Estado |
|---|---|---|
| F0 | Rama + baseline | ✅ |
| F1 | Migración `003-supplierinvoice-items-payments` (2 tablas) + modelos `SupplierInvoiceItemOData`/`SupplierPaymentOData` + `@HasMany` en SupplierInvoice + fix migrator Windows | ✅ |
| F2 | Seed: catálogo de compras, items por SI (Σ = importe), pagos coherentes, invariantes, determinismo | ✅ |
| F3 | Dominios write (2) + registrations + dataSource + `$expand`/CRUD verificados | ✅ |
| F4 | Tests unit (6 nuevos) + integration (8 nuevos) → suite 188/188 | ✅ |
| F5 | UI5: SupplierInvoiceDetail + ruta + i18n + navegación + Playwright | ✅ (PR #3 mergeado) |
| F6 | Documentación (este ciclo) + índice + patrón | ✅ |
| F7 | Suite completa + PR servidor con CI verde | ✅ (PR #28 mergeado, CI verde) |

---

## 3. Criterios de aceptación

- `$metadata` expone `SupplierInvoiceItem` y `SupplierPayment`; `$expand=items,payments` funciona.
- Seed determinista: 20 SI, 49 items, 16 pagos; invariantes (Σ líneas = importe; PAGADA ⇔ Σ pagos = importe; VENCIDA sin pagos) verificados por `validateSeedData` y tests.
- CRUD write en ambos dominios (201/200/204) + validación 400.
- UI5: detalle con items y pagos visibles, navegación lista ↔ detalle, 0 errores consola (Playwright).
- Suite completa verde + CI.
