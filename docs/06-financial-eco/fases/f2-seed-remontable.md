# F2 — Seed idempotente re-montable (datos coherentes tipo S/4HANA)

> **Fase:** F2 · **Esfuerzo:** Alto · **Sesión:** 10/N (se divide en sub-fases `f2.0` + `f2.1`…`f2.8`)
> **Depende de:** F1 (tablas creadas).
> **Actualiza:** `package.json` (scripts `seed`/`db:reset`), `docs/00-indice.md`, este archivo.

---

## 0. Objetivo

Crear un **seed idempotente determinista**: si la base de datos se borra, `pnpm seed` (o
`pnpm db:reset`) la recrea **idéntica** — mismos IDs tipo SAP, mismas relaciones, mismos importes.
Esto garantiza que las pruebas del LLM/chatbot no pierdan el rumbo.

Principio del usuario: **volumen moderado (~50 facturas) pero complejidad alta** (relaciones,
transacciones, clearing, estados). El seed vive en `scripts/seed/` con datos en
`scripts/seed/data/*.json` versionados.

---

## 1. Infra de seed (`f2.0`)

- `scripts/seed/financial-seed.ts`:
  - Carga los JSON de `scripts/seed/data/`.
  - `clear()`: `DELETE` en **orden inverso a las FK** (payments → invoiceitems → invoices →
    supplierinvoices → customers → suppliers → glaccounts → companies). Con `sequelize.query`
    o `model.destroy({ truncate: true, cascade: true })`.
  - `seed()`: `bulkCreate` en **orden de FK** (companies → customers/suppliers/glaccounts →
    invoices → invoiceitems → supplierinvoices → payments) usando los IDs fijos de los JSON.
  - No genera UUIDs: los IDs vienen de los JSON. Así es 100% reproducible.
- `package.json`:
  ```json
  "seed": "ts-node scripts/seed/financial-seed.ts",
  "db:reset": "ts-node scripts/seed/financial-seed.ts --reset"   // drop+sync+seed
  ```
  (o `node --loader ts-node ...` según ESM del proyecto).

---

## 2. Sub-fases por dominio (`f2.1`…`f2.8`)

Cada sub-fase crea el JSON de datos y el `bulkCreate` correspondiente:

- [`f2.1-company.md`](f2.1-company.md) — 1 sociedad (`1000`).
- [`f2.2-customer.md`](f2.2-customer.md) — ~8 clientes (`C00001`…).
- [`f2.3-supplier.md`](f2.3-supplier.md) — ~6 proveedores (`S00001`…).
- [`f2.4-glaccount.md`](f2.4-glaccount.md) — ~10 cuentas mayor (`0000xxxxxx`).
- [`f2.5-invoice.md`](f2.5-invoice.md) — ~50 facturas cliente (`I00001`…) con importes/net/tax/gross coherentes.
- [`f2.6-supplierinvoice.md`](f2.6-supplierinvoice.md) — ~20 facturas proveedor (`SI0001`…).
- [`f2.7-invoiceitem.md`](f2.7-invoiceitem.md) — ~1-4 líneas por factura (`II00001`…) enlazadas a glaccounts.
- [`f2.8-payment.md`](f2.8-payment.md) — ~30 pagos (`P00001`…) con clearing parcial/total a facturas.

---

## 3. Coherencia de datos (reglas)

- `grossAmount = netAmount + taxAmount` (IVA 21% típico, algunos 10%/0%).
- `dueDate = date + 30d` (paymentTerms 30D) o 60d.
- Estados: ~60% PAGADA (con pago en `f2.8`), ~25% PENDIENTE, ~15% VENCIDA (dueDate < hoy sin pago).
- `clearedInvoice` apunta a facturas PAGADAS; el importe del pago ≈ `grossAmount`.
- Fechas repartidas en los últimos ~6 meses para que haya vencidas reales.

---

## 4. Criterios de aceptación (F2 global)

- [ ] `pnpm seed` reproduce datos idénticos (IDs fijos).
- [ ] `pnpm db:reset` = drop + sync + seed, sin error.
- [ ] Tras borrar la BD y reseedar, los `$expand`/`$filter` dan los mismos resultados.
- [ ] `pnpm test` en verde (los tests de F4 dependen de estos datos).

---

## 5. Siguiente fase

➡️ [`f3-relaciones-y-estados.md`](f3-relaciones-y-estados.md)
