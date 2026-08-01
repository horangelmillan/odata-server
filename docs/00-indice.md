# Índice de documentación — odata-server

Este índice reorganiza la documentación de forma **semántica** para reflejar la evolución
del proyecto: desde los fundamentos, patrones y compatibilidad SAPUI5, hasta el ciclo de
refactorización en curso que convierte a **OData en el dominio único** (eliminando REST).

---

## 01 — Fundamentos
Documentación base de arquitectura, dependencias y andamiaje del proyecto.
- [`01-odata-architecture-reference.md`](01-fundamentos/01-odata-architecture-reference.md) — Referencia de arquitectura OData.
- [`02-dependency-research.md`](01-fundamentos/02-dependency-research.md) — Investigación de librerías OData.
- [`03-orm-analysis.md`](01-fundamentos/03-orm-analysis.md) — Análisis de ORMs (Sequelize vs otros).
- [`09-project-scaffolding.md`](01-fundamentos/09-project-scaffolding.md) — Andamiaje del proyecto.

## 02 — Patrones
Patrones de implementación y ejemplos de módulos.
- [`05-odata-module-pattern.md`](02-patrones/05-odata-module-pattern.md) — Patrón de módulo OData (`@phrasecode/odata`).
- [`10-best-practices-checklist.md`](02-patrones/10-best-practices-checklist.md) — Checklist de mejores prácticas.
- [`11-example-module-product.md`](02-patrones/11-example-module-product.md) — Ejemplo completo módulo Product (REST + OData).
- [`12-example-custom-odata-query.md`](02-patrones/12-example-custom-odata-query.md) — Consultas OData personalizadas (`@Query`).

## 03 — Seguridad y Datos
- [`07-security-middleware-setup.md`](03-seguridad-datos/07-security-middleware-setup.md) — Seguridad (Helmet, CORS, JWT).
- [`08-database-setup.md`](03-seguridad-datos/08-database-setup.md) — Configuración de Sequelize + PostgreSQL.

## 04 — Compatibilidad SAPUI5 / OpenUI5
Ciclo previo (`feat/odata-sapui5-compat`, tag `v1.1.0`): compatibilidad 100% con ODataModel v4.
- [`13-sapui5-integration-guide.md`](04-sapui5-compat/13-sapui5-integration-guide.md) — Guía de integración SAPUI5.
- [`14-sapui5-compatibility-plan.md`](04-sapui5-compat/14-sapui5-compatibility-plan.md) — Plan de compatibilidad (Fases A–R, X, G2, P).
- [`15-ui5-integration-plan.md`](04-sapui5-compat/15-ui5-integration-plan.md) — Plan de integración UI5.
- [`pruebas-odata-product.md`](04-sapui5-compat/pruebas-odata-product.md) — Pruebas OData de producto.

## 05 — Ciclo de Refactorización: OData como Dominio Único
**Ciclo completado.** Estado global: ✅ **Completado (v2.0.0-odata-domain)**. Release tag: [`v2.0.0-odata-domain`](https://github.com/horangelmillan/odata-server/releases/tag/v2.0.0-odata-domain). Merge a `master` vía PR #1 (flujo PR: protección de rama + check `test` + merge por GitHub). Elimina REST y promueve OData a dominio de primera clase, con la misma
estructura de carpetas que usaba REST (interface / model / dto / service / controller), y
convirtiendo `common/service/odata/` en shared kernel. Ver detalle y ejecución fase a fase:
- [`00-plan-maestro.md`](05-refactor-odata-as-domain/00-plan-maestro.md) — Plan maestro y decisión de arquitectura.
- [`historia-04-architecture-adaptation.md`](05-refactor-odata-as-domain/historia-04-architecture-adaptation.md) — Doc original `04` (OData en Shared Kernel). **Contexto previo al cambio.**
- [`historia-06-rest-vs-odata-separation.md`](05-refactor-odata-as-domain/historia-06-rest-vs-odata-separation.md) — Doc original `06` (CQRS ligero REST/OData). **Filosofía que este ciclo revierte.**
- [`fases/f0-ramificacion-baseline.md`](05-refactor-odata-as-domain/fases/f0-ramificacion-baseline.md)
- [`fases/f1-product-como-dominio-odata.md`](05-refactor-odata-as-domain/fases/f1-product-como-dominio-odata.md) ✅
- [`fases/f2-category-como-dominio-odata.md`](05-refactor-odata-as-domain/fases/f2-category-como-dominio-odata.md) ✅
- [`fases/f3-eliminar-capa-rest.md`](05-refactor-odata-as-domain/fases/f3-eliminar-capa-rest.md) ✅
- [`fases/f4-consolidar-shared-kernel-odata.md`](05-refactor-odata-as-domain/fases/f4-consolidar-shared-kernel-odata.md) ✅
- [`fases/f5-documentacion.md`](05-refactor-odata-as-domain/fases/f5-documentacion.md) ✅
- [`fases/f6-validacion-e2e-benchmark.md`](05-refactor-odata-as-domain/fases/f6-validacion-e2e-benchmark.md) ✅
- [`fases/f6.1-batch-created-correlation.md`](05-refactor-odata-as-domain/fases/f6.1-batch-created-correlation.md) ✅ — Sub-fase: correlación `created()` en `$batch` de UI5 (check #8 quirk de cliente).
- [`fases/f7-merge-a-master.md`](05-refactor-odata-as-domain/fases/f7-merge-a-master.md) ✅ — Merge a `master` vía PR #1, tag `v2.0.0-odata-domain`.

> **Cómo leer este ciclo:** cada fase en `fases/` es autónoma y ejecutable en una sesión
> distinta. Cada una contiene: objetivo, pasos detallados, comandos, criterios de aceptación
> y la documentación a actualizar al cerrar. El `00-plan-maestro.md` es el contrato global.

## 06 — Ciclo de Ecosistema Financiero Simulado (tipo S/4HANA Cloud)
**Ciclo completado.** Estado global: ✅ **F0–F6 completadas** — merge a `master` vía [PR #5](https://github.com/horangelmillan/odata-server/pull/5) (2026-07-16). [Issue #3](https://github.com/horangelmillan/odata-server/issues/3) resuelto vía [PR #4](https://github.com/horangelmillan/odata-server/pull/4). Añade al
servidor un ecosistema financiero coherente (sociedades, clientes, proveedores, cuentas
mayor, facturas de venta/proveedor, líneas y pagos con clearing) y un **seed idempotente
re-montable** (`pnpm seed` / `pnpm db:reset` recrea los mismos datos). El dominio es
**agnóstico al protocolo**; el servidor lo expone solo vía OData v4. Namespaces:
`/odata/*` plano para demo (product, category — prefijo `demo/` eliminado en PR #8) y
`/odata/finance/*` (ecosistema). Rama dedicada:
`feature/financial-eco`.
- [`00-plan-maestro.md`](06-financial-eco/00-plan-maestro.md) — Plan maestro y decisión de arquitectura.
- [`fases/f0-ramificacion-baseline.md`](06-financial-eco/fases/f0-ramificacion-baseline.md) — F0.0 ✅ (rama + baseline 143 pass).
- [`fases/f0.1-prefijo-demo-bloqueado.md`](06-financial-eco/fases/f0.1-prefijo-demo-bloqueado.md) — ✅ F0.1 resuelta (issue #3 cerrado vía PR #4).
- [`fases/f1-modelos-financieros.md`](06-financial-eco/fases/f1-modelos-financieros.md) — 8 dominios (sub-fases `f1.1`–`f1.8`)
- [`fases/f2-seed-remontable.md`](06-financial-eco/fases/f2-seed-remontable.md) — Seed idempotente (sub-fases `f2.0`–`f2.8`)
- [`fases/f3-relaciones-y-estados.md`](06-financial-eco/fases/f3-relaciones-y-estados.md) ✅
- [`fases/f4-tests-ecosistema.md`](06-financial-eco/fases/f4-tests-ecosistema.md) ✅
- [`fases/f5-documentacion.md`](06-financial-eco/fases/f5-documentacion.md) ✅
- [`../02-patrones/16-financial-module.md`](02-patrones/16-financial-module.md) — Patrón de módulo financiero con entidades, navegaciones, seed y ejemplos `$expand`/`$filter`.
- [`fases/f6-merge-a-master.md`](06-financial-eco/fases/f6-merge-a-master.md) ✅ — Merge a `master` vía PR #5 (2026-07-16). Tag `v2.1.0-financial-eco` aplicado.

## 07 — Ciclo de Integración SAPUI5 con Dominio Finance
**Ciclo completado.** Estado global: ✅ **F0–F4 implementadas** — integración completa del dominio
finance en SAPUI5 incluyendo rediseño del Domain Registration Object, vistas detalladas con
`$expand`, y navegación Demo ↔ Finance. Rama: `docs/finance-ui5-integration-plan`.
Merge a `master` completado (PRs #10–#12).

- [`00-plan-maestro.md`](07-sapui5-finance/00-plan-maestro.md) — Plan maestro y decisiones de arquitectura.
- [`01-arquitectura-propuesta.md`](07-sapui5-finance/01-arquitectura-propuesta.md) — Diseño del Domain Registration Object.
- [`fases/f0-documentacion-y-analisis.md`](07-sapui5-finance/fases/f0-documentacion-y-analisis.md) ✅ — F0 completada: investigación, hallazgos, alcance.
- [`fases/f1-rediseno-write-routes.md`](07-sapui5-finance/fases/f1-rediseno-write-routes.md) ✅ — Refactor del Shared Kernel: write routes genérico.
- [`fases/f2-exports-core-main.md`](07-sapui5-finance/fases/f2-exports-core-main.md) ✅ — Refactor de barriales y composición en `core/main.ts`.
- [`fases/f3-vista-finance-base-sapui5.md`](07-sapui5-finance/fases/f3-vista-finance-base-sapui5.md) ✅ — Vista base Finance en SAPUI5 con routing.
- [`fases/f4-vistas-finance-detalladas.md`](07-sapui5-finance/fases/f4-vistas-finance-detalladas.md) ✅ — Vistas detalladas de entidades finance.

## 08 — Ciclo de Evolución de la Integración SAPUI5 con Dominio Finance
**Ciclo completado.** Estado global: ✅ **G1–G5 implementadas** — vistas priorizadas, filtros
nativos OpenUI5, internacionalización, `$batch` validado, CRUD desde vistas. Rama:
`docs/finance-ui5-integration-plan`. Merge a `master` vía PRs #11 y #12 completado.
Proyecto SAPUI5 externo en `C:/Users/Horan/Desktop/ui5-odata-demo/`.

- [`00-plan-maestro.md`](08-sapui5-finance-evolution/00-plan-maestro.md) — Plan maestro: roadmap G1–G5, dependencias, condiciones de aceptación.
- [`01-arquitectura-propuesta.md`](08-sapui5-finance-evolution/01-arquitectura-propuesta.md) — Análisis arquitectónico de cada mejora.
- [`fases/g1-vistas-priorizadas.md`](08-sapui5-finance-evolution/fases/g1-vistas-priorizadas.md) ✅ — CustomerDetail, PaymentList, navegación completa.
- [`fases/g2-filtros-avanzados.md`](08-sapui5-finance-evolution/fases/g2-filtros-avanzados.md) ✅ — Toolbar nativo OpenUI5 (reemplaza SmartFilterBar no disponible en OpenUI5).
- [`fases/g3-internacionalizacion.md`](08-sapui5-finance-evolution/fases/g3-internacionalizacion.md) ✅ — i18n: 47 claves, modelo ResourceModel en manifest.json.
- [`fases/g4-batch-changeset.md`](08-sapui5-finance-evolution/fases/g4-batch-changeset.md) ✅ — Tests Content-ID formato SAPUI5 (0.0/1.0), atomicidad.
- [`fases/g5-crud-vistas.md`](08-sapui5-finance-evolution/fases/g5-crud-vistas.md) ✅ — Diálogos CRUD: InvoiceCreate, InvoiceEdit, CustomerCreate.

## 09 — Ciclo de Production Readiness
**Ciclo completado.** Estado global: ✅ **P0–P3 ejecutadas** — limpieza de archivos innecesarios,
reubicación de utilidades huérfanas, hardening de producción (`sync({alter})` solo en dev,
`docker-compose.prod.yml`, gate `pnpm build` en CI), **reparación del build `tsc` de producción**
(preexistente roto en `master`) y alineación documental (`version: 2.1.0`,
README sin enlaces rotos). Rama: `chore/production-readiness`.

- [`00-plan-maestro.md`](09-production-readiness/00-plan-maestro.md) — Plan maestro: decisiones D1–D5, fases P0–P3, condiciones de aceptación.
- [`02-implementation-backlog.md`](09-production-readiness/02-implementation-backlog.md) — Hallazgos R01–R02, M01–M03, RF01–RF02, DT01, **IF01 (migraciones Umzug)** y **DT02 (type-check tests)** implementados.

## 10 — Tooling: MCP y Skills del entorno
**Ciclo completado.** Estado global: ✅ — reglas de uso documentadas para los 4 MCP
(`github`, `context7`, `codebase-memory`, `playwright`) y las skills instaladas;
investigación de skills de terceros en skills.sh con decisiones (instaladas `vitest` y
`sapui5`; 8 rechazadas con motivo). Incluye la creación del `AGENTS.md` global del entorno
(antes referenciado pero inexistente). Rama: `docs/tooling-mcp-skills`.

- [`00-plan-maestro.md`](10-herramientas-mcp-skills/00-plan-maestro.md) — Plan maestro: decisiones D1–D6, entregables, aceptación.
- [`01-guia-de-uso.md`](10-herramientas-mcp-skills/01-guia-de-uso.md) — Guía práctica: reglas por MCP/skill y escenarios típicos del proyecto.
- [`02-implementation-backlog.md`](10-herramientas-mcp-skills/02-implementation-backlog.md) — R01, M01–M02 implementados; IF01–IF03 movidos a iniciativa futura.

## 11 — Ciclo de Calidad y Ampliación de Datos Seed Financieros
**Ciclo completado.** Estado global: ✅ **F0–F5 implementadas** — evaluación exhaustiva de
coherencia del seed financiero (4 riesgos, 6 deudas técnicas, 5 mejoras), determinismo
restaurado (PRNG sembrado + fecha de referencia fija, actualiza D5 del ciclo 06), coherencia
de ciclo de vida (estado derivado de fecha + pagos) y ampliación de 50 → 150 facturas de
cliente con líneas y pagos coherentes (+4 clientes). Merge a `master` vía PR #16.
Rama: `feature/seed-data-quality`.

- [`00-plan-maestro.md`](11-seed-data-quality/00-plan-maestro.md) — Plan maestro: decisiones D1–D5, fases F0–F5, aceptación.
- [`01-evaluacion-coherencia.md`](11-seed-data-quality/01-evaluacion-coherencia.md) — Evaluación exhaustiva: coherencias confirmadas e incoherencias con evidencia.
- [`02-implementation-backlog.md`](11-seed-data-quality/02-implementation-backlog.md) — Backlog: R1–R4, M1–M5, RF01, DT1–DT6, **IF01 (modelo financiero rico) y DAP1 implementados**; DAP2 diferido.

## 12 — Ciclo de Validación Financiera UI5 + OData v4
**Ciclo completado.** Estado global: ✅ **P0–P3 + F3b completados** — prueba integral de los
8 dominios financieros del servidor OData a través de la app UI5 (`ui5-odata-demo`) usando
Playwright como harness de navegador real: navegación, filtros, CRUD desde diálogos,
`$expand` profundo y edge cases. **24/24 checks PASS** en la suite interactiva. Merge a
`master` vía PR #18. Además, en ramas posteriores se resolvieron los backlogs del ciclo
(B1–B19) y los de ciclos previos: DAP1 (computeInvoiceStatus), IF01 C09 (migraciones Umzug),
IF01 C11 (modelo financiero rico: dueDate/netAmount/taxAmount/grossAmount/docNumber),
DT02 (type-check tests) — PRs #19, #20, #21.
Rama: `docs/financial-ui5-testing` (cerrada).

- [`00-test-plan.md`](12-financial-ui5-testing/00-test-plan.md) — Plan de pruebas: checklist P0–P3, backlog, fases de ejecución.
- [`02-implementation-backlog.md`](12-financial-ui5-testing/02-implementation-backlog.md) — Backlog: B1–B19 todos resueltos (implementados/descartado B2).

## 13 — Ciclo de Pulido Total
**Ciclo completado.** Estado global: ✅ **F0–F4 + hallazgos N1–N21 resueltos** (merge PRs #22–#27, tag `v2.2.0`).
Pulido integral: bugs de consola UI5 (FormatException, i18n_en 404), gate de type-check en CI,
bump de versión 2.2.0, documentación desalineada (índice, checkboxes f3, backlogs C09/C11),
higiene de repos (artefactos Playwright, logs, `.tsbuildinfo`), repo remoto para
`ui5-odata-demo` (main/dev protegidas + CI real) y deuda técnica evaluada (helper `modelOf()`, DAP2).
Rama: `feat/pulido-total`. Resoluciones posteriores: N18 (bindings por-key), N19 ($batch CRLF RFC 2046),
N21 (timers test bench).

- [`00-plan-de-ejecucion.md`](13-pulido-total/00-plan-de-ejecucion.md) — Plan con sistema de checklist (fases 0–F).
- [`02-implementation-backlog.md`](13-pulido-total/02-implementation-backlog.md) — Hallazgos N1–N21 categorizados.

## 14 — Ciclo DAP2: Simetría SupplierInvoice (items + pagos)
**Ciclo completado.** Estado global: ✅ **F0–F7 completadas** — merge a `master` vía PR #28 (CI verde),
cierre documental PR #29 y refactor DT1/DT2 (listas de modelos centralizadas + tests de consistencia)
PR #30. Simetría estructural de `supplierinvoice` frente a `invoice` (origen DT5/N17): tabla
`supplierinvoiceitems` (líneas de gasto) y `supplierpayments` (pagos), dominios write completos,
seed coherente (estado derivado de fecha + pagos), detalle UI5 con items y pagos, y corrección
del migrator Umzug en Windows (las migraciones nunca se aplicaban en dev). Rama:
`feature/dap2-supplierinvoice-symmetry`.

- [`00-plan-maestro.md`](14-dap2/00-plan-maestro.md) — Plan maestro: decisiones D1–D6, fases F0–F7, aceptación.
- [`02-implementation-backlog.md`](14-dap2/02-implementation-backlog.md) — Hallazgos R1, M1, DT1–DT2.

## 15 — Ciclo de Consolidación Post-DAP2
**Ciclo completado.** Estado global: ✅ **F0–F4 ejecutadas y validadas** — merge a `master`
vía [PR #31](https://github.com/horangelmillan/odata-server/pull/31) (2026-07-31). Sin
funcionalidad nueva: alinea documentación (índice, checklist de patrones, checkboxes de
fases 05–08, comentarios obsoletos), elimina restos de la era REST (mount `/api`, middleware de
seguridad huérfano, git hooks obsoletos), corrige encoding de comentarios en `batch.middleware.ts`
y alinea la versión de Node (22). Rama: `docs/consolidacion-post-dap2` (cerrada).

- [`00-plan-maestro.md`](15-consolidacion/00-plan-maestro.md) — Plan maestro: decisiones D1–D5, fases F0–F5, aceptación.
- [`02-implementation-backlog.md`](15-consolidacion/02-implementation-backlog.md) — Hallazgos R1, M1, RF1–RF3, DT1–DT5, IF01-10–IF03-10, decisiones D1–D5.

## 16 — Ciclo de Producción Segura
**Ciclo completado.** Estado global: ✅ **F0–F5 completadas** — merge a `master`
vía [PR #32](https://github.com/horangelmillan/odata-server/pull/32) (2026-08-01),
tag `v2.3.0`. Cierra las brechas de producción
identificadas tras el ciclo 15: arranque productivo (`pnpm start`/Docker: puente
CJS `odata-runtime.ts` + gate CI), migraciones en `dist` (lista explícita por
dominio), **modularidad Shared Kernel ↔ dominios**
(common 100% genérico, composición en bootstrap, test estructural en CI),
**seguridad por entorno** (dev/test abiertos, prod estricto: JWT + usuarios,
CORS, rate-limit, fail-fast de entorno) y observabilidad mínima (`/healthz`).
Incluye la plantilla de ciclo
(`02-patrones/17`) y bump `2.3.0`. Rama: `feat/produccion-segura` (cerrada).

- [`00-plan-maestro.md`](16-produccion-segura/00-plan-maestro.md) — Plan maestro: decisiones D1–D8, fases F0–F5, aceptación.
- [`02-implementation-backlog.md`](16-produccion-segura/02-implementation-backlog.md) — Hallazgos R1–R8, M1–M4, RF1–RF4, DT1–DT5, IF1–IF2, DA1.

## 17 — Ciclo de Operación Segura
**Ciclo completado.** Estado global: ✅ **F0–F6 completadas** — merge a `master`
vía [PR #34](https://github.com/horangelmillan/odata-server/pull/34) (2026-08-01),
tag `v2.3.1`. Hardening operativo derivado
de la evaluación de madurez productiva (2026-08-01): **backups/DR de la BD** (`pnpm
backup:db`: pg_dump + retención + restore verificado), **CI** (job de build de la imagen
Docker + gate `pnpm audit` con allowlist documentada), arranque robusto (`exit(1)` si
falla BD/migraciones), **conexión/BD** (`DB_STATEMENT_TIMEOUT`, pool configurable,
`DB_SSL_REJECT_UNAUTHORIZED` — parche SSL v2, mensajes 500 genéricos en prod),
**dependencias** (override `uuid@^11.1.1`; 13 advisories de build de bcrypt documentados),
**runbook de operación** (despliegue, secrets + rotación, SSL, backups, rollout,
troubleshooting). Decisiones: single-instance como modelo objetivo (D1 — R4/R5 cerrados
con nota), observabilidad cerrada como Descartado (D2 — IF1 del ciclo 16). Rama:
`feat/operacion-segura` (cerrada).

- [`00-plan-maestro.md`](17-operacion-segura/00-plan-maestro.md) — Plan maestro: decisiones D1–D6, fases F0–F6, aceptación.
- [`01-arquitectura-propuesta.md`](17-operacion-segura/01-arquitectura-propuesta.md) — Decisiones de arquitectura (single-instance, observabilidad, backups, bcrypt, uuid, versión).
- [`02-implementation-backlog.md`](17-operacion-segura/02-implementation-backlog.md) — Hallazgos R1–R9, M1–M4, DT1–DT2, IF1, DA1–DA6 (todos cerrados).
- [`runbook.md`](17-operacion-segura/runbook.md) — Procedimientos operativos (despliegue, secrets, backups, SSL, rollout, troubleshooting).

## 18 — Subproyectos del ecosistema

Repos independientes (patrón `ui5-odata-demo`) clonados en `subproyectos/` de la raíz.
Cada uno con su propio git, CI, harness IA (AGENT.md + skills) y docs (plantilla de ciclo).
**Estado de fundación (F0):** 2026-08-01.

| Subproyecto | Repo | Propósito |
|---|---|---|
| [`01-plugin-odata`](../subproyectos/01-plugin-odata/) | [horangelmillan/odata-plugin](https://github.com/horangelmillan/odata-plugin) | Plugin instalable para `@phrasecode/odata`: parches declarativos (compat SAPUI5 + arranque prod) y puente runtime CJS. CLI: `install/uninstall/verify/status` |
| [`02-odata-query-rules`](../subproyectos/02-odata-query-rules/) | [horangelmillan/odata-query-rules](https://github.com/horangelmillan/odata-query-rules) | Reglas de consulta lógica declarativas para dominios OData (demo + finance): schema por entidad, coherencia de negocio, sinónimos, contrato ampliado de intención para chatbots con IA local (patrón `chatbot-ia-local`) |
| [`03-odata-domain-generator`](../subproyectos/03-odata-domain-generator/) | [horangelmillan/odata-domain-generator](https://github.com/horangelmillan/odata-domain-generator) | Generador de dominios OData asistido por IA: spec JSON canónica → dominio completo (modelos, DTOs, servicios, controladores, migraciones, seed, tests). Doble modo: servidor OData embebido (ecosistema autónomo con frontend/backend/BD/chatbot propios) o solo código para servidores compatibles |
