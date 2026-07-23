# 00 — Plan Maestro: Calidad y ampliación de datos seed financieros

> **Ciclo:** `feature/seed-data-quality` (rama dedicada; merge a `master` solo vía PR, flujo `docs/07-workflow/GIT_WORKFLOW.md`).
> **Inicio:** 2026-07-23
> **Estado global:** ✅ F0–F4 implementadas; F5 (cierre documental + PR) en curso.
> **Depende de:** Ciclo 06 (`feature/financial-eco`) — ya en `master` como `v2.1.0-financial-eco`.

---

## 0. Resumen ejecutivo

El seed financiero (`scripts/seed/financial-seed.ts`) es el dato de arranque que alimenta las
demos UI5 y las consultas del LLM. La **evaluación exhaustiva de coherencia**
([`01-evaluacion-coherencia.md`](01-evaluacion-coherencia.md)) detectó que el dataset actual es
**referencialmente íntegro pero semánticamente incoherente**: estados que contradicen las fechas,
pagos anteriores a sus facturas, líneas de venta imputadas a cuentas de gasto y —crítico—
**aleatoriedad sin semilla** que viola la decisión D5 del ciclo 06 (*re-montable determinista*).

Este ciclo:

1. **Restaura el determinismo** (PRNG sembrado + fecha de referencia fija).
2. **Corrige la coherencia del ciclo de vida** (estado derivado de fecha + pagos).
3. **Amplía el ecosistema con +100 facturas de cliente** (`I00051`–`I00150`), sus líneas y pagos,
   más 4 clientes nuevos (`C0009`–`C0012`), todo con las mismas reglas de coherencia.

El modelo de dominio **no cambia** (sin columnas nuevas): la coherencia se garantiza por
convención documentada (vencimiento = `fecha + 30 días`).

---

## 1. Alcance y no-alcance

### En alcance
- Reescritura de `scripts/seed/financial-seed.ts` sobre un **generador puro determinista**
  (`scripts/seed/financial-seed-data.ts`, sin IO) testeable sin base de datos.
- Reglas de coherencia: estado derivado; pagos ≥ fecha de factura; Σ líneas = importe;
  líneas de venta solo con cuentas de ingreso; importe de línea coherente con cantidad;
  `createdAt` = fecha del documento; cobertura garantizada de clientes.
- Ampliación: 150 facturas cliente (50 → 150), 8 → 12 clientes, pagos a plazos y parciales.
- Validación de invariantes post-seed + tests unitarios del generador.
- Documentación alineada (patrón 16, índice, backlog).

### Fuera de alcance
- Cambios de modelo/esquema (`dueDate`, `taxAmount`, `netAmount`): requieren migraciones
  (IF01 del ciclo 09) → investigación futura.
- `computeStatus` en la capa de servicio (recalcular estado en lectura): decisión
  arquitectónica pendiente (el seed persiste estados ya coherentes).
- Items/pagos para `supplierinvoice` (asimetría SD/MM): decisión arquitectónica pendiente.
- Dominio demo (`product`/`category`): su seed (`demo-seed.ts`) ya es determinista.

---

## 2. Decisiones (confirmadas con el usuario, 2026-07-23)

| # | Decisión | Opción elegida | Alternativa descartada |
|---|----------|----------------|------------------------|
| D1 | Alcance "+100 registros" | **+100 facturas de cliente** (`I00051`–`I00150`) con líneas (~375) y pagos coherentes, +4 clientes (`C0009`–`C0012`). | 100 filas distribuidas / refuerzo lado proveedor. |
| D2 | Determinismo | **PRNG sembrado** (mulberry32, semilla constante) + `REFERENCE_DATE` fija (`2026-07-15`). Generación programática mantenible; mismo dataset en cada ejecución. **Actualiza D5 del ciclo 06.** | JSON versionados en `scripts/seed/data/` (~700 registros estáticos inmantenibles). |
| D3 | Datos existentes | **Regeneración completa**: las 50 facturas actuales también se regeneran coherentes (IDs se conservan). | Solo los 100 nuevos coherentes (dataset mixto). |
| D4 | Testabilidad | **Generador puro separado del IO** (`financial-seed-data.ts` sin Sequelize) → tests unitarios Vitest sin Postgres. | Validación solo manual contra BD. |
| D5 | Modelo de dominio | **Sin cambios de esquema.** Coherencia por convención: `vencimiento = fecha + 30d`. | Añadir `dueDate`/impuestos (fuera de alcance, ver §1). |

---

## 3. Estructura resultante

```
scripts/seed/
├── financial-seed-data.ts     # NUEVO: generador puro determinista (PRNG + REFERENCE_DATE)
├── financial-seed.ts          # REESCRITO: IO (conexión, modelos, clear, insert, validación)
└── demo-seed.ts               # intacto
src/__tests__/unit/seed/
└── financial-seed-data.test.ts # NUEVO: invariantes del generador (sin BD)
```

El seed mantiene sus comandos: `pnpm seed` (truncate + seed) y `pnpm db:reset` (sync force + seed).

---

## 4. Fases

| Fase | Alcance | Criterio de aceptación | Estado |
|------|---------|------------------------|--------|
| **F0** | Rama + baseline (166 pass) + docs de iniciativa (plan, evaluación, backlog) + índice. | Rama creada desde `master`; baseline verde; docs presentes. | ✅ |
| **F1** | Determinismo: PRNG sembrado + `REFERENCE_DATE`; misma ejecución ⇒ mismo dataset. | Dos ejecuciones consecutivas del generador producen datos idénticos (test + hash md5 en BD tras re-seed). | ✅ |
| **F2** | Coherencia de ciclo de vida: estado derivado de fecha+pagos; pagos ≥ fecha; Σ líneas = importe; cuentas de ingreso; createdAt = fecha documento. | Invariantes verificados en tests unitarios y con queries SQL en BD (0 violaciones). | ✅ |
| **F3** | Ampliación: 150 facturas, 12 clientes, ~375 items, ~100 pagos; pagos a plazos y parciales. | `pnpm seed` inserta el volumen objetivo; conteos validados. | ✅ |
| **F4** | Validación: chequeo de invariantes post-seed en el propio script; `pnpm test` + `pnpm build` verdes. | Suite completa verde sin regresión (174 pass + 1 todo; baseline 166). | ✅ |
| **F5** | Cierre: patrón 16 actualizado, backlog resuelto, PR → `master`. | PR abierto con check verde. | 🚧 |

---

## 5. Condiciones de aceptación globales (gate de PR)

- [x] Generador determinista: dos ejecuciones producen el mismo dataset (IDs, importes, fechas, relaciones).
- [x] Invariantes de coherencia verificados automáticamente (tests + validación post-seed).
- [x] Volumen: 150 invoices, 12 customers, ≥360 invoiceitems, ≥95 payments, 20 supplierinvoices.
- [x] `pnpm test` verde (baseline 166 + nuevos tests del generador).
- [x] `pnpm build` verde.
- [x] Documentación alineada (16.5 describe el mecanismo real; índice y backlog cerrados).
