# 01 — Evaluación exhaustiva de coherencia del seed financiero

> **Fecha:** 2026-07-23 · **Objeto:** `scripts/seed/financial-seed.ts` (rev. `master` 039e5c9)
> **Método:** revisión documental (ciclo 06 completo), análisis estático del seed y de los 8
> modelos OData, DTOs, tests de integración y grafo codebase-memory.

---

## 1. Dataset generado (estado actual)

| Entidad | Volumen real | Documentado (16.5) | ¿Coincide? |
|---------|--------------|--------------------|------------|
| Company | 1 (`1000`) | 1 | ✅ |
| Customer | 8 (`C0001`–`C0008`) | 8 | ✅ |
| Supplier | 6 (`S0001`–`S0006`) | 6 | ✅ |
| GlAccount | 10 (`000100`–`001000`) | "1000–10000" | ❌ doc errónea |
| Invoice | 50 (`I00001`–`I00050`) | 50 | ✅ |
| SupplierInvoice | 20 (`SI00001`–`SI00020`) | 20 | ✅ |
| InvoiceItem | ~125 (1–4 aleatorio/factura) | "~100 (2 por Invoice)" | ❌ doc imprecisa |
| Payment | ~30 (1 por factura PAGADA) | "las PAGADAS" | ✅ |

Consumidores del seed: app UI5 (`ui5-odata-demo`), backend orquestador/LLM (queries OData),
desarrolladores (`pnpm db:reset`). **Los tests de integración NO consumen el seed**: siembran
sus propios datos en `beforeAll` (borran todo previamente), por lo que la reescritura del seed
no rompe `pnpm test`.

---

## 2. Coherencias confirmadas ✅

1. **Integridad referencial total**: sin huérfanos — toda factura referencia company `1000` y un
   cliente existente; todo item referencia factura y cuenta existentes; todo pago referencia
   factura existente; toda factura de proveedor referencia proveedor existente.
2. **Σ líneas = importe de factura** al céntimo (el último item absorbe el resto;
   `financial-seed.ts:220-226`).
3. **Clearing consistente**: pagos solo para facturas `PAGADA`, con importe exacto 1:1 (`:239-248`).
4. **Moneda coherente**: company EUR/ES + clientes en eurozona (ES/FR/PT/DE/IT) ⇒ todo EUR.
5. **IDs tipo SAP estables** (`1000`, `C####`, `S####`, cuenta de 6 dígitos, `I#####`, …).
6. **Idempotencia a nivel de tabla**: borrado en orden inverso a FKs e inserción en orden FK.
7. **Distribución de estados aproximada** a la documentada (60/25/15 ponderado).

---

## 3. Incoherencias detectadas

### 🔴 Riesgos

| ID | Hallazgo | Evidencia |
|----|----------|-----------|
| **R1** | **Determinismo roto vs decisión D5 (ciclo 06) y doc 16.5**: ambos afirman *"sin aleatoriedad, reproduce siempre lo mismo"*, pero el código usa `Math.random()` en país, cliente, fecha, importe, estado, nº de items, material, cuenta y método/fecha de pago. Cada `pnpm seed` genera un **dataset distinto** (solo los IDs son estables) ⇒ el LLM/UI5 no pueden escribir pruebas estables ni documentar ejemplos permanentes. | `financial-seed.ts:17-19, 147, 193-214` |
| **R2** | **Las fechas derivan con el reloj**: `dateStr()` usa `new Date()` ⇒ ejecutar hoy o dentro de 3 meses produce datos distintos aunque el código no cambie. | `:11-15` |
| **R3** | **Estado contradictorio con la fecha**: `estado` se asigna por peso aleatorio (25/60/15) ignorando `fecha` (1–180 días). Existen facturas **VENCIDA de ayer** y **PENDIENTE de 180 días** — viola la semántica definida por el propio ciclo en F3 (vencida = pasado vencimiento sin pago). | `:179-201` |
| **R4** | **Pagos anteriores a su factura**: `payment.fecha` ∈ 1–30 días atrás sin relacionarse con `invoice.fecha` ∈ 1–180 ⇒ clearing imposible (pagar antes de emitir). | `:240-247` |

### 🟡 Deuda técnica / desviación de diseño

| ID | Hallazgo |
|----|----------|
| **DT1** | `scripts/seed/data/` existe pero está **vacío**: D5 y fases f2.0–f2.8 mandaban JSON versionados + loader; la implementación final genera programáticamente. Residuo de diseño no ejecutado. |
| **DT2** | **Modelos duplicados y ya desviados**: el seed re-define los 8 modelos en vez de importarlos; usa `DATEONLY` en `fecha` mientras la app define `DataTypes.DATE` (`invoice.odata.model.ts:17`, `payment.odata.model.ts:12`, `supplierinvoice.odata.model.ts:12`). `pnpm db:reset` (sync force) crea esquema distinto del que mantiene la app (`sync({alter})`). |
| **DT3** | **`computeStatus` nunca se implementó**: F3 aparece ✅ en el índice pero sus checkboxes están sin marcar (`f3-relaciones-y-estados.md:43-48`) y no existe en `src/` (grep `computeStatus` sin resultados). El estado es un dato estático sin recálculo. |
| **DT4** | **Doc 16.5 desalineada con el código**: company "Grupo Demo Corp." (real: "Servicios TI Horizonte S.A."), cuentas "1000–10000" (real: `000100`–`001000`), "~100 items (2 por invoice)" (real: 1–4 aleatorio, media ~125), "no aleatoriedad" (falso). |
| **DT5** | Doc 16.2 afirma *"invoiceitem: línea de factura (invoice o supplierinvoice)"* pero el modelo solo tiene `invoiceId`; **`supplierinvoice` no tiene items ni pagos** (asimetría SD/MM no documentada). |
| **DT6** | f2.5 definía coherencia contable (`net+tax=gross`, IVA 21/10/0, `dueDate = +30/60d`, `createdAt` = fecha documento) que se descartó en la implementación (modelo simplificado a `importe` único) sin registrar la decisión. |

### 🟢 Mejoras

| ID | Hallazgo |
|----|----------|
| **M1** | Items de **facturas de venta** imputados a cuentas aleatorias entre las 10, incluidas "Gastos de personal", "Amortizaciones", "Impuesto sobre beneficios" — contablemente incoherente; deben ser cuentas de ingreso (`000100` Ventas mercancías, `000200` Prestación de servicios). |
| **M2** | Distribución cliente→facturas aleatoria: puede haber **clientes sin facturas** (el test F3 crea "Cliente Sin Facturas" ad hoc). Para demo/LLM interesa cobertura garantizada. |
| **M3** | El modelo admite N pagos por factura pero el seed solo genera clearing 1:1 — sin **pagos a plazos ni parciales** (escenarios ricos para el chatbot: "facturas con pago parcial"). |
| **M4** | `importe` de línea independiente de `cantidad` (10 uds × 3 € tan probable como 1 ud × 4.000 €). |
| **M5** | `createdAt/updatedAt = NOW()` en vez de la fecha del documento (f2.5 preveía `createdAt` = fecha de factura); las queries temporales del LLM no son realistas. |

---

## 4. Conclusión

El seed es **estructuralmente correcto** (integridad referencial, clearing exacto, idempotencia de
tablas) pero **semánticamente incoherente y no determinista**, en contradicción con la decisión
D5 del ciclo 06 y con la documentación viva (patrón 16). La corrección exige regenerar el dataset
completo con reglas explícitas de ciclo de vida — base sobre la que se amplía a +100 facturas en
este mismo ciclo.
