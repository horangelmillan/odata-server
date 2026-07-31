# Implementation Backlog — DAP2 Simetría SupplierInvoice

> **Ciclo:** `14-dap2`
> **Última actualización:** 2026-07-31

## Propósito

Centraliza los hallazgos de la iniciativa DAP2 (simetría estructural de
`supplierinvoice`: items + pagos), origen DT5 (ciclo 11) / N17 (ciclo 13).

Estados válidos: Pendiente · En evaluación · Aprobado · Implementado · Descartado · Movido a una iniciativa futura.

---

# Riesgos

| ID | Detectado en | Descripción | Impacto | Estado | Resolución |
| -- | ------------ | ----------- | ------- | ------ | ---------- |
| R1 | F1 (migrador) | Bug Windows en `migrator.ts`: `glob` usaba `new URL().pathname` (`/C:/...`) → `pending` siempre vacío → **ninguna migración se aplicaba en dev** (las tablas las creaba `sync`) | Alto — migraciones inoperantes en Windows | **Implementado** | `fileURLToPath` para el `cwd` del glob + `pathToFileURL` para el `import()` del resolve (el loader ESM rechaza rutas nativas Windows) |

---

# Mejoras

| ID | Detectado en | Descripción | Prioridad | Estado |
| -- | ------------ | ----------- | --------- | ------ |
| M1 | F1 | Marcadas 001/002 como aplicadas en la BD dev (esquema ya existente por `sync`) para permitir aplicar solo la 003 | Media | Implementado (operación puntual sobre BD dev) |

---

# Deuda Técnica

| ID | Detectado en | Descripción | Impacto | Estado |
| -- | ------------ | ----------- | ------- | ------ |
| DT1 | F1 | El `dataSource` lista los modelos hardcodeados (2 nuevos añadidos); un registro automático evitaría olvidos | Bajo — mantenibilidad | Pendiente (fuera de alcance) |
| DT2 | F2 | `financial-seed.ts` mantiene definiciones Sequelize locales duplicadas de los modelos de dominio (patrón preexistente, extendido a las 2 tablas nuevas) | Bajo — deuda aceptada (seed standalone) | Registrado — se mantiene |

---

# Decisiones Arquitectónicas Pendientes

| ID | Tema | Motivo | Estado |
| -- | ---- | ------ | ------ |
| D1–D6 | Ver `00-plan-maestro.md` §1 | Tablas dedicadas, dominios write, cuentas de gasto, estado derivado, UI5 | **APROBADAS (2026-07-31)** por el usuario |

---

# Registro de Resoluciones

| Fecha | ID | Acción realizada |
| ----- | -- | ---------------- |
| 2026-07-31 | D1–D6 | Aprobadas por el usuario (plan de iniciativa presentado con alternativas). |
| 2026-07-31 | R1 | Migrator corregido: `fileURLToPath` (glob cwd) + `pathToFileURL` (resolve/import). Migración 003 aplicada e idempotente en BD dev. |
| 2026-07-31 | — | F1: modelos + relaciones `@HasMany`/`@BelongsTo`; `$metadata` expone ambos EntityTypes; endpoints 200. |
| 2026-07-31 | — | F2: seed determinista (2 ejecuciones idénticas): 20 SI / 49 items / 16 pagos; coherencia PAGADA=Σ pagos, PENDIENTE parcial, VENCIDA=0. |
| 2026-07-31 | — | F3: CRUD 201/200/204 en ambos dominios; `$expand=items,payments` con datos reales. |
| 2026-07-31 | — | F4: suite **188/188** (176 + 6 unit seed + 8 integration simetría + 2 ajustes). |
| 2026-07-31 | — | F5: UI5 detalle (PR #3 ui5-odata-demo): SI00001 con items y 2 pagos visibles; navegación lista↔detalle OK; 0 errores consola. |
