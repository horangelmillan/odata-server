# 16 — Módulo Financiero (Ecosistema S/4HANA)

> **Estado:** Ciclo 06 (feature/financial-eco) — F1 a F4 completadas, F5 documentación.
> 8 dominios financieros en namespace `finance/`, seed idempotente re-montable.

## 16.1 Descripción

El ecosistema financiero simula la estructura maestra de SAP S/4HANA Cloud:

- **8 entidades** con relaciones FK lógicas entre ellas.
- Expuestas vía OData v4 en `/odata/finance/<entidad>-odata`.
- Seed determinista (`pnpm seed` / `pnpm db:reset`): PRNG sembrado + fecha de referencia
  fija — recrea exactamente el mismo dataset en cada ejecución (ver 16.5).
- Pensado para que un backend orquestador/LLM pueda consultar mediante `$expand`/`$filter`.

## 16.2 Dominios

```
src/core/finance/
├── company/           # Sociedad (cabecera del grupo)
├── customer/          # Cliente (pertenece a una sociedad)
├── supplier/          # Proveedor (independiente de sociedad)
├── glaccount/         # Cuenta mayor (plan de cuentas)
├── invoice/           # Factura de venta (cliente → sociedad)
├── supplierinvoice/   # Factura de proveedor (sin líneas ni pagos: asimetría SD/MM, ver 16.2)
├── invoiceitem/       # Línea de factura de venta (solo invoice)
└── payment/           # Pago / clearing (vinculado a invoice)
```

### Modelo de datos

```
Company (1) ──< Customer (N)     Company (1) ──< Invoice (N)
Customer (1) ──< Invoice (N)     Invoice (1) ──< InvoiceItem (N)
Invoice (1) ──< Payment (N)       GlAccount (1) ──< InvoiceItem (N)
Supplier (1) ──< SupplierInvoice (N)
```

### Tabla de entidades

| Entidad | Endpoint OData | PK | FK principales | Columnas clave |
|---------|---------------|----|----------------|----------------|
| Company | `/odata/finance/company-odata` | `id` (string) | — | nombre, moneda, pais |
| Customer | `/odata/finance/customer-odata` | `id` (string) | companyId → Company | nombre, companyId, pais |
| Supplier | `/odata/finance/supplier-odata` | `id` (string) | — | nombre, pais |
| GlAccount | `/odata/finance/glaccount-odata` | `id` (string) | — | nombre |
| Invoice | `/odata/finance/invoice-odata` | `id` (string) | companyId → Company, customerId → Customer | fecha, importe, moneda, estado |
| SupplierInvoice | `/odata/finance/supplierinvoice-odata` | `id` (string) | supplierId → Supplier | fecha, importe, moneda, estado |
| InvoiceItem | `/odata/finance/invoiceitem-odata` | `id` (string) | invoiceId → Invoice, glAccountId → GlAccount | material, cantidad, importe |
| Payment | `/odata/finance/payment-odata` | `id` (string) | invoiceId → Invoice | fecha, importe, metodo |

### Estados de ciclo de vida (Invoice)

| Estado | Significado |
|--------|-------------|
| `PENDIENTE` | Pendiente de pago (vencimiento = `fecha + 30 días` aún no alcanzado, Σ pagos < importe) |
| `PAGADA` | Pagada (Σ pagos = importe; admite pago único o a plazos) |
| `VENCIDA` | Vencida (`fecha + 30 días` < fecha de referencia) y sin pagos |

> **Convención de vencimiento (ciclo 11):** el modelo no tiene `dueDate`; el vencimiento se
> define como `fecha + 30 días`. El seed persiste estados coherentes con esta convención;
> no existe recálculo en la capa de servicio (decisión pendiente DAP1, ciclo 11).
> `SupplierInvoice` no tiene entidad pago asociada: su estado es coherente con la antigüedad
> (reciente ⇒ `PENDIENTE`; antigua ⇒ `PAGADA` o `VENCIDA`).

## 16.3 Navegaciones OData (`$expand` disponibles)

### Invoice (factura de venta)

```
invoice?$expand=customer                            → Cliente
invoice?$expand=company                              → Sociedad
invoice?$expand=items                                → Líneas
invoice?$expand=items($expand=glAccount)             → Líneas + cuenta mayor
invoice?$expand=customer,company,items($expand=glAccount)  → Todo
```

### Customer / Company / Supplier

```
customer?$expand=invoices                    → Facturas del cliente
customer?$expand=invoices($expand=items)     → Facturas + líneas
company?$expand=customers,invoices           → Clientes + facturas de la sociedad
supplier?$expand=supplierInvoices            → Facturas del proveedor
```

### GlAccount

```
glaccount?$expand=items                      → Líneas que usan esta cuenta
```

### SupplierInvoice / Payment

```
supplierinvoice?$expand=supplier             → Proveedor
payment?$expand=invoice                      → Factura pagada
```

## 16.4 Queries del chatbot (ejemplos)

### Facturas vencidas de un cliente

```
GET /odata/finance/invoice-odata?$filter=customerId eq 'C0001' and estado eq 'VENCIDA'&$expand=customer
```

### Importe total pendiente por cliente

```
GET /odata/finance/invoice-odata?$filter=estado eq 'PENDIENTE'
→ Sumar importe en cliente
```

### Pagos de un período

```
GET /odata/finance/payment-odata?$filter=fecha ge 2026-07-01&$expand=invoice
```

### Clientes con facturas pendientes

```
GET /odata/finance/customer-odata?$expand=invoices($filter=estado eq 'PENDIENTE')
```

### Clearing (pago → factura)

```
GET /odata/finance/payment-odata?$filter=invoiceId eq 'I00001'&$expand=invoice
```

## 16.5 Seed re-montable

El seed vive en `scripts/seed/` y es **determinista**: ejecutado N veces produce exactamente
el mismo dataset (IDs, nombres, importes, fechas y relaciones). Mecanismo (ciclo 11,
decisión D2 — actualiza D5 del ciclo 06 que preveía JSON estáticos):

- `financial-seed-data.ts` — **generador puro** (sin IO): PRNG mulberry32 con semilla
  constante + `REFERENCE_DATE = "2026-07-15"` fija (las fechas nunca derivan con el reloj).
- `financial-seed.ts` — IO: valida invariantes **antes** de tocar la BD (fail fast),
  borra en orden inverso a FKs, inserta con `bulkCreate` y verifica conteos post-inserción.

```bash
pnpm seed        # Ejecuta el seed sin reiniciar la BD
pnpm db:reset    # DROP + CREATE + sync + seed
```

Datos generados (volumen ampliado en ciclo 11):
- 1 Company (`1000`, Servicios TI Horizonte S.A., EUR, ES)
- 12 Customers (`C0001`–`C0012`; todos con ≥10 facturas — cobertura garantizada)
- 6 Suppliers (`S0001`–`S0006`)
- 10 GlAccounts (`000100`–`001000`)
- 150 Invoices (`I00001`–`I00150`): exactamente 90 `PAGADA` / 37 `PENDIENTE` / 23 `VENCIDA`
- 20 SupplierInvoices (`SI00001`–`SI00020`)
- ~387 InvoiceItems (1–4 por factura; solo cuentas de ingreso `000100`/`000200`)
- ~104 Payments (clearing exacto; ~10 facturas con pago a plazos 60/40 y ~4 `PENDIENTE` con pago parcial)

Reglas de coherencia garantizadas por el generador (y verificadas por
`validateSeedData` + tests unitarios `src/__tests__/unit/seed/`):
- `estado` derivado de fecha + pagos (vencimiento = `fecha + 30d`); nunca contradictorio.
- Todo pago tiene `fecha ≥ fecha` de su factura; Σ líneas = importe al céntimo.
- `importe` de factura = Σ (precio de catálogo × cantidad) de sus líneas.
- `createdAt`/`updatedAt` = fecha del documento (maestros: alta fija hace 1 año).

## 16.6 Tests

Los tests de integración del ecosistema financiero:

| Archivo | Contenido |
|---------|-----------|
| `src/__tests__/integration/financial-expand.integration.test.ts` | 10 tests de `$expand` en todas las navegaciones financieras |
| `src/__tests__/integration/financial-ecosystem.integration.test.ts` | 11 tests de queries representativas (conteos, filtros, `$metadata`) |
