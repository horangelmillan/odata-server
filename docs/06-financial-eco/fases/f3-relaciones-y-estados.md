# F3 — Relaciones, navegaciones y estados coherentes

> **Fase:** F3 · **Esfuerzo:** Medio · **Sesión:** 19/N
> **Depende de:** F2 (datos reales sembrados).
> **Actualiza:** `docs/02-patrones/05-odata-module-pattern.md` (anexo `$expand` financiero), este archivo.

---

## 0. Objetivo

Validar y endurecer las navegaciones OData (`$expand`/`$filter`) que usará el chatbot/LLM, y
calcular los **estados de ciclo de vida** (PENDIENTE / PAGADA / VENCIDA) de forma coherente a
partir de `dueDate`, la fecha de hoy y los `payment` (clearing).

---

## 1. Pasos

### 1.1 Verificar navegaciones `$expand`
Probar con supertest/integración:
- `GET /odata/invoice?$expand=customer`
- `GET /odata/invoice?$expand=items($expand=glAccount)`
- `GET /odata/invoice?$expand=customer,companyRef,items($expand=glAccount)`
- `GET /odata/supplierinvoice?$expand=supplier`
- `GET /odata/payment?$expand=invoice`

### 1.2 Estados coherentes (helper en services)
- `invoice.service.computeStatus(invoice, payments)`: si existe pago con `clearedInvoice = invoiceId`
  y `amount >= grossAmount` → `PAGADA`; si no y `dueDate < hoy` → `VENCIDA`; si no → `PENDIENTE`.
- Aplicar en el `get()` del controlador (o en un `@Query` de resumen) para que el LLM reciba el
  estado real sin recalcular en el cliente.

### 1.3 Queries representativas del chatbot (las que usará el LLM)
- Facturas vencidas de un cliente: `GET /odata/invoice?$filter=customerId eq 'C00001' and status eq 'VENCIDA'&$expand=customer`
- Importe total pendiente: `@Query` agregado o `$filter` + suma en cliente.
- Pagos de este mes: `GET /odata/payment?$filter=date ge 2026-07-01`

### 1.4 Tests
Añadir `financial-expand.integration.test.ts` que valide los `$expand` profundos y los estados.

---

## 2. Criterios de aceptación

- [ ] `$expand` profundo funcional en invoice/supplierinvoice/payment.
- [ ] Estados PENDIENTE/PAGADA/VENCIDA calculados coherentemente.
- [ ] Queries representativas del chatbot resueltas vía OData.
- [ ] `pnpm test` en verde.

---

## 3. Siguiente fase

➡️ [`f4-tests-ecosistema.md`](f4-tests-ecosistema.md)
