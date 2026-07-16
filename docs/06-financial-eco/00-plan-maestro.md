# 00 — Plan Maestro: Ecosistema Financiero Simulado tipo S/4HANA Cloud (datos coherentes y re-montables)

> **Ciclo:** `feature/financial-eco` (rama dedicada; NO se hace merge a `master` hasta cumplir todas las condiciones de aceptación).
> **Inicio:** 2026-07-16
> **Estado global:** 📋 Planificado — pendiente ejecución de F0.
> **Depende de:** Ciclo 05 (`refactor/odata-as-domain`) — ya en `master` como `v2.0.0-odata-domain`.
> El dominio es agnóstico a todo artefacto periférico; la arquitectura define la organización
> (domain layer + shared kernel + adapters). Hoy el servidor expone el dominio vía un único
> protocolo de exposición; `common/service/odata/` es shared kernel; `src/core/<dominio>/` es domain layer.

---

## 0. Resumen ejecutivo

El servidor expone un **dominio agnóstico a todo artefacto periférico** (hoy vía un único
protocolo de exposición, con `product`/`category` como ejemplo de demostración). Este ciclo
**añade un ecosistema financiero coherente** que simula registros de **SAP S/4HANA Cloud Public**:
sociedades, clientes, proveedores, cuentas mayor, facturas de venta (SD), facturas de proveedor
(MM), líneas de factura y pagos con *clearing*.

Para mantener el orden simétrico, los dominios se agrupan por **namespace semántico en la ruta
OData** (decisión D8):
- `/odata/demo/<entidad>` — dominios de demostración ya existentes (`product`, `category`).
- `/odata/finance/<entidad>` — dominios financieros nuevos de este ciclo.

Objetivo de negocio (del usuario): servir de backend de datos para un frontend UI5 (chatbot)
que, vía un backend orquestador externo + LLM local, consulta "datos de facturación/clientes/
proveedores como si fuera SAP". El servidor **no cambia su naturaleza**: sigue siendo solo
`/odata`, domain layer en `core/`, shared kernel intacto. Solo se **añaden dominios
financieros** y un **seed idempotente re-montable**.

Principio clave pedido por el usuario: **los datos deben ser re-montables**. Si la base de datos
se elimina, `pnpm seed` (o `pnpm db:reset`) la recrea **idéntica** (mismos IDs, mismas relaciones,
mismos importes) para no perder el rumbo de las pruebas del LLM.

---

## 1. Alcance y no-alcance

### En alcance
- Modelos OData (`@phrasecode/odata`, `@Table/@Column`) de 8 dominios financieros en `core/`.
- Relaciones reales (`@HasMany`/`@BelongsTo`) para `$expand` y `$filter` que usará el LLM.
- **Seed idempotente determinista** (IDs fijos tipo SAP, datos en JSON versionados).
- Comandos `pnpm seed` y `pnpm db:reset` (drop + sync + seed).
- Estados coherentes de ciclo de vida (PENDIENTE / PAGADA / VENCIDA) calculables.
- Tests de integración del ecosistema (queries representativas del chatbot).
- Documentación alineada (índice, patrón de módulo financiero, README).

### Fuera de alcance (lo tiene el usuario en otros repos)
- Backend orquestador / LLM local / frontend UI5 chatbot (viven en otro repo, ya adaptados para
  leer este servidor OData, no nordwind).
- Autenticación, multi-tenant real, volúmenes productivos.

---

## 2. Decisiones de arquitectura (confirmadas con el usuario)

| # | Decisión | Opción elegida | Alternativa descartada |
|---|---|---|---|
| D1 | Naturaleza del servidor | **Solo `/odata`** (dominio único, intacto del ciclo 05). | Exponer `/api` para el chatbot (rompe la regla del ciclo 05). |
| D2 | Ubicación de los dominios | **Domain layer** `core/<dominio>/` (mismo patrón `product`/`category`). | Dejar modelos en `common/service/odata/` (rompe shared-kernel). |
| D3 | Fuente de verdad del modelo | **Solo `@phrasecode/odata`** (`@Table/@Column`). | `db.define` de Sequelize (eliminado en ciclo 05). |
| D4 | Rama y merge | Rama `feature/financial-eco`; **sin merge a `master`** hasta cumplir todas las condiciones de aceptación. Merge vía **PR + checks + merge por GitHub** (flujo cerrado en ciclo 05, F7). | Merge incremental / DELETE de protección (descartado en ciclo 05). |
| D5 | Re-montabilidad | **Seed idempotente determinista**: IDs fijos tipo SAP, datos en `scripts/seed/data/*.json`, `pnpm seed` reproduce siempre lo mismo. | UUIDs aleatorios / autoincrement (no reproducible). |
| D6 | Volumen vs complejidad | Priorizar **complejidad de datos coherente** (relaciones, transacciones, clearing) sobre volumen. ~50 facturas pero con ecosistema denso (~200-300 filas). | Miles de filas sin relaciones. |
| D7 | Ejecución por fases + sub-fases | Una fase por sesión; donde el esfuerzo sea grande, **sub-fases** (`fN.M`). Docs al cerrar cada fase. | Ejecutar todo de golpe. |
| D8 | Namespace semántico simétrico | Dominios agrupados por prefijo en la ruta OData: `/odata/demo/<entidad>` (demostración: `product`, `category`) y `/odata/finance/<entidad>` (ecosistema S/4HANA). El `getEndpoint()` del controlador define el prefijo. | Dejar todo en raíz (mezcla demo y ERP sin separación) o prefijar solo un grupo. |

---

## 3. Estructura objetivo (añadidos sobre el ciclo 05)

```
src/
├── common/service/odata/           # SHARED KERNEL (infra OData, intacto del ciclo 05)
│   ├── datasource.ts               # registra modelos de demo + finance
│   └── odata.service.ts            # registra controladores de demo + finance
├── core/                           # DOMAIN LAYER (agnóstico al protocolo)
│   ├── demo/                       # dominios de demostración (prefijo /odata/demo)
│   │   ├── product/  category/     # (existentes; F0 les aplica prefijo demo/)
│   ├── finance/                    # ecosistema S/4HANA (prefijo /odata/finance)
│   │   ├── company/                    # Sociedad (1000)
│   │   ├── customer/                   # Cliente (KUNNR-like)
│   │   ├── supplier/                   # Proveedor (LIFNR-like)
│   │   ├── glaccount/                  # Cuenta mayor (0000123400)
│   │   ├── invoice/                    # Factura cliente (SD)
│   │   ├── supplierinvoice/            # Factura proveedor (MM)
│   │   ├── invoiceitem/                # Línea / posición de factura
│   │   └── payment/                    # Pago / transacción (clearing)
scripts/
└── seed/
    ├── financial-seed.ts           # seed idempotente (delete-in-reverse + bulkCreate determinista)
    └── data/                       # JSON versionados (company.json, customer.json, ...)
```

Cada dominio sigue el patrón de `docs/02-patrones/05-odata-module-pattern.md`:
`interface/`, `model/*.odata.model.ts`, `dto/*.dto.ts`, `service/*.service.ts`,
`controller/*.odata.controller.ts` (con `getEndpoint()` que define el prefijo `demo/` o
`finance/`), `main.ts`. El namespace en la ruta OData refleja el grupo semántico (D8).

---

## 4. Fases (una por sesión) y Sub-fases

| Fase | Alcance | Entregable / Criterio de aceptación | Esfuerzo | Doc detallado |
|---|---|---|---|---|
| **F0** | Rama `feature/financial-eco`; baseline de tests (143 pass); plan maestro; **aplicar prefijo `demo/` a `product`/`category`** (getEndpoint → `/odata/demo/...`). | Rama creada; tests verdes; demo UI5 sigue funcionando contra `/odata/demo/product-odata`; docs del ciclo 06 iniciadas. | Bajo | `fases/f0-ramificacion-baseline.md` |
| **F1** | Modelos OData del ecosistema finance (8 dominios, prefijo `/odata/finance/`). Esfuerzo grande → **sub-fases por dominio**. | 8 modelos `@Table/@Column` + controladores (endpoint `finance/...`) + registro en datasource/odata.service; `pnpm test` verde. | Alto | `fases/f1-modelos-financieros.md` + sub-fases `f1.1`…`f1.8` |
| **F2** | Seed idempotente re-montable. Esfuerzo grande → **sub-fases por dominio**. | `pnpm seed` reproduce datos idénticos (IDs fijos); `pnpm db:reset` drop+sync+seed. | Alto | `fases/f2-seed-remontable.md` + sub-fases `f2.1`…`f2.8` |
| **F3** | Relaciones, navegaciones y estados coherentes (`$expand`/`$filter`, clearing de pagos). | `$expand` profundo funcional; facturas PENDIENTE/PAGADA/VENCIDA calculadas; tests de navegación. | Medio | `fases/f3-relaciones-y-estados.md` |
| **F4** | Tests de integración del ecosistema (queries que usará el LLM). | Tests verdes para filtros/$expand representativos del chatbot. | Medio | `fases/f4-tests-ecosistema.md` |
| **F5** | Documentación: patrón de módulo financiero, índice, README. | Docs alineadas al ecosistema. | Medio | `fases/f5-documentacion.md` |
| **F6** | Merge a `master` vía PR (flujo ciclo 05) + tag `v2.1.0-financial-eco`. | PR abierto, check `test` verde, merge por GitHub, tag aplicado. | Bajo | `fases/f6-merge-a-master.md` |

**Sub-fases de F1 (modelos):**
- `f1.1-company` · `f1.2-customer` · `f1.3-supplier` · `f1.4-glaccount`
- `f1.5-invoice` · `f1.6-supplierinvoice` · `f1.7-invoiceitem` · `f1.8-payment`

**Sub-fases de F2 (seed):** `f2.1`…`f2.8` espejan los dominios; `f2.0` = infra de seed
(JSON loader + orden de delete/sync determinista).

**Orden intencional:** F1 (modelos) antes de F2 (seed, necesita tablas). F3 tras F2 (datos
reales para validar relaciones). F4/F5 validan y documentan. F6 cierra.

---

## 5. Uso de MCP por fase (herramientas de apoyo)

- **context7**: F1 para confirmar la API de `@phrasecode/odata` (`@Table`/`@Column`,
  `@HasMany`/`@BelongsTo`, `ODataControler`) antes de crear los 8 dominios.
- **codebase-memory**: F1/F3 para trazar `CALLS` desde `odata.service.ts`/`datasource.ts` y
  asegurar que el registro de los 8 controladores no rompe el router existente.

---

## 6. Ejecución Docker vs terminal (evitar conflictos)

- **Desarrollo iterativo (F1–F3):** `pnpm dev` en terminal (hot-reload).
- **Seed/reset:** `pnpm db:reset` (terminal) tras `docker compose up -d db` para tener Postgres.
- **Tests de integración (F4):** `docker compose up -d db` + `pnpm test`.

---

## 7. Condiciones de aceptación globales (gate de merge a master — F6)

- [ ] F0–F5 ejecutadas y verificadas.
- [ ] `pnpm test` en verde (sin regresión; nuevos tests de ecosistema en verde).
- [ ] `GET /api/*` no expuesto; solo `/odata` (intacto del ciclo 05).
- [ ] `pnpm db:reset` reproduce el ecosistema idéntico (re-montable verificado).
- [ ] `$expand`/`$filter` financieros funcionan (queries del chatbot resueltas).
- [ ] Documentación (`README.md`, `AGENTS.md`, `docs/`) alineada al ecosistema.
- [ ] `master` protegida: el merge se hace vía PR + check `test` (flujo ciclo 05).
