# Implementation Backlog — Seed Data Quality

## Propósito

Centraliza los hallazgos de la [evaluación de coherencia](01-evaluacion-coherencia.md) del seed
financiero (ciclo `feature/seed-data-quality`), según las reglas de `AGENTS.md`.

Estados válidos: Pendiente · En evaluación · Aprobado · Implementado · Descartado · Movido a una iniciativa futura.

---

# Riesgos

| ID | Detectado en | Descripción | Impacto | Estado | Resolución |
| -- | ------------ | ----------- | ------- | ------ | ---------- |
| R1 | Evaluación F0 | Determinismo roto vs D5/doc 16.5: `Math.random()` en todo el seed ⇒ dataset distinto en cada ejecución. | Alto | Implementado | F1: PRNG mulberry32 con semilla constante (`SEED_CONSTANT = 20260715`) en `financial-seed-data.ts`. Verificado end-to-end: hash md5 del dataset idéntico tras re-seed. |
| R2 | Evaluación F0 | Fechas derivan con el reloj (`dateStr` usa `new Date()`). | Alto | Implementado | F1: `REFERENCE_DATE = "2026-07-15"` fija; todas las fechas se calculan en UTC relativo a ella. |
| R3 | Evaluación F0 | `estado` aleatorio contradice `fecha` (VENCIDA de ayer, PENDIENTE de 180 días). | Alto | Implementado | F2: estado derivado de fecha + pagos (vencimiento = fecha + 30d); ventanas de fecha por ciclo de vida. Verificado en BD: 0 estados incoherentes. |
| R4 | Evaluación F0 | Pagos con fecha anterior a su factura. | Medio | Implementado | F2: `payment.fecha ∈ (invoice.fecha, min(fecha+45d, REFERENCE_DATE)]`. Verificado en BD: 0 pagos anteriores. |

---

# Mejoras

| ID | Detectado en | Descripción | Prioridad | Estado | Observaciones |
| -- | ------------ | ----------- | --------- | ------ | ------------- |
| M1 | Evaluación F0 | Items de venta imputados a cuentas de gasto/impuestos. | Alta | Implementado | F2: catálogo de líneas con cuenta derivada del tipo (material→`000100`, servicio→`000200`). BD: 0 líneas en cuentas no-ingreso. |
| M2 | Evaluación F0 | Clientes potencialmente sin facturas. | Media | Implementado | F3: pool de asignación con cobertura garantizada. BD: los 12 clientes tienen 10–18 facturas. |
| M3 | Evaluación F0 | Sin pagos a plazos ni parciales (solo clearing 1:1). | Media | Implementado | F3: 10 facturas PAGADAS con 2 pagos (60/40); 4 PENDIENTES con pago parcial. |
| M4 | Evaluación F0 | Importe de línea independiente de cantidad. | Media | Implementado | F2: líneas primero (precio catálogo ±10% × cantidad) y `importe = Σ líneas`. BD: 0 facturas descuadradas. |
| M5 | Evaluación F0 | `createdAt/updatedAt = NOW()` en vez de la fecha del documento. | Baja | Implementado | F2: `createdAt = fecha` del documento; maestros con alta fija (`2025-07-15`). |

---

# Refactorizaciones

| ID | Detectado en | Descripción | Motivo | Estado |
| -- | ------------ | ----------- | ------ | ------ |
| RF01 | Evaluación F0 | Lógica de generación mezclada con IO en `financial-seed.ts`. | Separar generador puro (`financial-seed-data.ts`) para testear sin BD (decisión D4) | Implementado — generador puro + seed como IO (validación previa fail-fast, `bulkCreate`, chequeo de conteos post-inserción) |

---

# Deuda Técnica

| ID | Detectado en | Descripción | Impacto | Estado |
| -- | ------------ | ----------- | ------- | ------ |
| DT1 | Evaluación F0 | `scripts/seed/data/` vacío: diseño D5 (JSON versionados) no ejecutado. | Residuo confuso | Implementado — directorio eliminado; decisión D2 de este ciclo actualiza D5 (PRNG sembrado en lugar de JSON). |
| DT2 | Evaluación F0 | Modelos duplicados en el seed con deriva real (`DATEONLY` vs `DATE` en `fecha`). | Esquema divergente según quién crea las tablas | Implementado — tipos alineados con los modelos de dominio (`DATE`) + comentario de fuente de verdad en `financial-seed.ts`. Importar los modelos `@phrasecode/odata` queda descartado: acoplaría el script standalone al dataSource de la app. |
| DT3 | Evaluación F0 | `computeStatus` (F3, ciclo 06) nunca implementado; F3 marcada ✅ con checkboxes abiertos. | Estado persistido puede quedar obsoleto tras escrituras API | Movido a decisión arquitectónica (DAP1) — fuera de alcance del seed. |
| DT4 | Evaluación F0 | Doc 16.5 desalineada (nombre company, rango cuentas, items/factura, "no aleatoriedad"). | Documentación no confiable | Implementado — 16.5 reescrito (F5) con mecanismo, volúmenes y reglas reales. |
| DT5 | Evaluación F0 | Doc 16.2: invoiceitem "(invoice o supplierinvoice)" falso; supplierinvoice sin items/pagos no documentado. | Documentación engañosa | Implementado — 16.2 corregido (F5). Asimetría estructural → DAP2. |
| DT6 | Evaluación F0 | Reglas contables de f2.5 (net+tax=gross, IVA, dueDate) descartadas sin registrar. | Decisión implícita perdida | Implementado — registrado como decisión D5 de este ciclo (modelo simplificado confirmado). |

---

# Investigaciones Futuras

| ID | Detectado en | Tema | Motivo | Estado |
| -- | ------------ | ---- | ------ | ------ |
| IF01 | Evaluación F0 | Modelo financiero rico (`dueDate`, `netAmount`, `taxAmount`, IVA) según f2.5 original | Requiere cambio de esquema + migraciones (depende de IF01 del ciclo 09) | Movido a una iniciativa futura |

---

# Decisiones Arquitectónicas Pendientes

| ID | Tema | Motivo | Estado |
| -- | ---- | ------ | ------ |
| DAP1 | ¿Recalcular `estado` en lectura (`computeStatus` en service) o mantenerlo persistido? | El seed ahora persiste estados coherentes, pero escrituras API posteriores pueden degradarlo | Pendiente |
| DAP2 | ¿Dotar a `supplierinvoice` de items/pagos (simetría SD/MM)? | Asimetría actual documentada (DT5); implica nuevos modelos | Pendiente |

---

# Registro de Resoluciones

| Fecha | ID | Acción realizada |
| ----- | -- | ---------------- |
| 2026-07-23 | R1–R4, M1–M5, RF01, DT1–DT6 | Hallazgos clasificados y aprobados por el usuario (evaluación F0). |
| 2026-07-23 | R1, R2 | F1: generador determinista (`financial-seed-data.ts`): mulberry32 sembrado + `REFERENCE_DATE` fija. Hash md5 del dataset idéntico tras re-seed (maestros + transacciones). |
| 2026-07-23 | R3, R4, M1, M4, M5 | F2: coherencia de ciclo de vida en el generador. Verificado en BD: 0 pagos anteriores, 0 estados incoherentes, 0 descuadres, 0 líneas en cuentas no-ingreso, 0 huérfanos. |
| 2026-07-23 | M2, M3 | F3: 150 facturas (90/37/23 exacto), 12 clientes (10–18 facturas cada uno), 10 pagos a plazos, 4 parciales. Volumen final: 1/12/6/10/150/20/387/104. |
| 2026-07-23 | RF01, DT1 | Generador puro separado del IO; `scripts/seed/data/` eliminado. |
| 2026-07-23 | DT2, DT6 | Tipos `fecha` alineados (`DATE`); decisión D5 registra el modelo simplificado. |
| 2026-07-23 | F4 | Validación: `validateSeedData` (8 tests unitarios sin BD) + chequeo post-inserción en el seed. Suite: 174 pass + 1 todo (baseline 166, sin regresión). `pnpm build` verde. |
| 2026-07-23 | DT4, DT5 | F5: patrón 16 actualizado (16.2 asimetría SD/MM, 16.5 mecanismo real), README ampliado. |

---

# Cierre de la iniciativa

Elementos **Implementados**: R1–R4, M1–M5, RF01, DT1, DT2, DT4, DT5, DT6.
Elementos movidos: **DT3 → DAP1** (computeStatus en service), **DT5 (parte estructural) → DAP2**
(items/pagos para supplierinvoice), **IF01** (modelo financiero rico con impuestos/dueDate)
— todos a iniciativa futura, dependientes de migraciones de esquema (IF01 del ciclo 09).
No quedan elementos en "Pendiente" ni "En evaluación".
