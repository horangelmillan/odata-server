# F2 — Seed idempotente re-montable (datos coherentes)

> **Fase:** F2 · **Esfuerzo:** Alto · **Depende de:** F1 (tablas creadas).
> **Actualiza:** `package.json` (scripts `seed`/`db:reset`), este archivo.

---

## 0. Objetivo

Crear un **seed idempotente determinista**: `pnpm seed` (o `pnpm db:reset`) recrea datos
**idénticos** — mismos IDs tipo SAP, mismas relaciones.

El seed vive en `scripts/seed/financial-seed.ts` y genera los datos programáticamente
(no JSON estáticos) para mantenerlo mantenible con ~50 facturas.

---

## 1. Script único `scripts/seed/financial-seed.ts`

- Conecta a la misma BD que la app usando `Sequelize` + `dotenv`.
- `clear()`: `destroy({ truncate: true, cascade: true })` en **orden inverso a FK**.
- `seed()`: `Model.create` en **orden de FK** con IDs deterministas.
- `--reset`: hace `sync({ force: true })` (drop + create) antes de seed.

Volumen generado:
- 1 Company (`1000`)
- 8 Customers (`C0001`…`C0008`)
- 6 Suppliers (`S0001`…`S0006`)
- 10 GlAccounts (`000100`…`001000`)
- 50 Invoices (`I00001`…`I00050`) con ~60% PAGADA, ~25% PENDIENTE, ~15% VENCIDA
- 20 SupplierInvoices (`SI00001`…`SI00020`)
- ~100 InvoiceItems (1-4 por factura)
- Payments para todas las facturas PAGADAS

---

## 2. Scripts `package.json`

```json
"seed": "node --loader ts-node --loader ts-node/esm --no-warnings scripts/seed/financial-seed.ts",
"db:reset": "node --loader ts-node --loader ts-node/esm --no-warnings scripts/seed/financial-seed.ts --reset"
```

---

## 3. Criterios de aceptación (F2 global)

- [x] `pnpm seed` reproduce datos idénticos (IDs fijos).
- [x] `pnpm db:reset` = drop + sync + seed, sin error.
- [x] `pnpm test` en verde (143 tests).

---

## 4. Siguiente fase

➡️ [`f3-relaciones-y-estados.md`](f3-relaciones-y-estados.md)
