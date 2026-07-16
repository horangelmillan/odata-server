# F1 — Modelos OData del ecosistema financiero

> **Fase:** F1 · **Esfuerzo:** Alto · **Sesión:** 2/N (se divide en sub-fases `f1.1`…`f1.8`)
> **Depende de:** F0 (rama creada, baseline registrado).
> **Actualiza:** `docs/02-patrones/05-odata-module-pattern.md` (anexo financiero), `docs/00-indice.md`, este archivo.

---

## 0. Objetivo

Crear los 8 dominios OData del ecosistema financiero en `core/finance/<dominio>/`, siguiendo el
patrón de `product`/`category` (ver `docs/02-patrones/05-odata-module-pattern.md`). Cada dominio:
`interface/`, `model/*.odata.model.ts` (`@Table/@Column`), `dto/*.dto.ts`,
`controller/*.odata.controller.ts` (`ODataControler` con `getEndpoint()` → `/odata/finance/<entidad>`),
`service/*.service.ts`, `main.ts`. Finalmente registran modelos en `datasource.ts` y
controladores en `odata.service.ts`.

Al ser un esfuerzo grande, **F1 se divide en sub-fases por dominio** (`f1.1`…`f1.8`). Cada
sub-fase es autónoma y ejecutable en una sesión distinta. Los dominios `demo/` (product, category)
ya fueron prefijados en F0.

---

## 1. Catálogo de dominios (IDs deterministas tipo SAP)

| Dominio | Tabla | Clave primaria (fija) | Campos clave | Relaciones |
|---|---|---|---|---|
| `company` | `companies` | `code` (ej. `1000`) | `name`, `currency` (EUR), `country` | 1—N a todo |
| `customer` | `customers` | `customerId` (ej. `C00001`) | `name`, `vatId`, `city`, `paymentTerms` | 1—N `invoice` |
| `supplier` | `suppliers` | `supplierId` (ej. `S00001`) | `name`, `vatId`, `city` | 1—N `supplierinvoice` |
| `glaccount` | `glaccounts` | `glAccount` (ej. `0000123400`) | `description`, `accountType` | N—M con `invoiceitem` |
| `invoice` | `invoices` | `invoiceId` (ej. `I00001`) | `docNumber`, `company`, `customer`, `date`, `dueDate`, `netAmount`, `taxAmount`, `grossAmount`, `status`, `currency` | `@BelongsTo` customer, company; `@HasMany` items |
| `supplierinvoice` | `supplierinvoices` | `supplierInvoiceId` (ej. `SI0001`) | análogo a `invoice` pero con `supplier` | `@BelongsTo` supplier, company |
| `invoiceitem` | `invoiceitems` | `itemId` (ej. `II00001`) | `invoice`, `glAccount`, `material`, `quantity`, `netAmount`, `taxAmount` | `@BelongsTo` invoice, glaccount |
| `payment` | `payments` | `paymentId` (ej. `P00001`) | `company`, `partnerId`, `partnerType` (C/S), `date`, `amount`, `method`, `clearedInvoice` | enlaza a `invoice` (clearing) |

---

## 2. Sub-fases

- [`f1.1-company.md`](f1.1-company.md) — Sociedad (raíz del ecosistema).
- [`f1.2-customer.md`](f1.2-customer.md) — Cliente.
- [`f1.3-supplier.md`](f1.3-supplier.md) — Proveedor.
- [`f1.4-glaccount.md`](f1.4-glaccount.md) — Cuenta mayor.
- [`f1.5-invoice.md`](f1.5-invoice.md) — Factura cliente (SD) + relaciones a customer/company.
- [`f1.6-supplierinvoice.md`](f1.6-supplierinvoice.md) — Factura proveedor (MM).
- [`f1.7-invoiceitem.md`](f1.7-invoiceitem.md) — Línea de factura + relación a glaccount.
- [`f1.8-payment.md`](f1.8-payment.md) — Pago/transacción + clearing.

Cada sub-fase sigue el mismo molde:
1. Confirmar API `@phrasecode/odata` (context7 si hace falta).
2. Crear `model/*.odata.model.ts` con `@Table/@Column` + navegaciones.
3. Crear `controller/*.odata.controller.ts` (`ODataControler`, `allowedMethod: ["get"]` lectura; escritura opcional en F3).
4. Crear `interface/`, `dto/`, `service/`, `main.ts` (barrel).
5. Registrar en `datasource.ts` (`models: [...]` ) y `odata.service.ts` (`odataControllers`).
6. `pnpm test` en verde (sin romper baseline).

---

## 3. Criterios de aceptación (F1 global)

- [ ] Los 8 modelos `@Table/@Column` existen en `core/<dominio>/model/`.
- [ ] Los 8 controladores `ODataControler` registrados en `odata.service.ts`.
- [ ] `datasource.ts` importa los 8 modelos.
- [ ] `pnpm test` en verde (sin regresión vs baseline F0).
- [ ] `$metadata` expone las 8 entidades.

---

## 4. Siguiente fase

➡️ [`f2-seed-remontable.md`](f2-seed-remontable.md)
