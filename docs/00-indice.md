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
- [`02-implementation-backlog.md`](09-production-readiness/02-implementation-backlog.md) — Hallazgos R01–R02, M01–M03, RF01–RF02, DT01 implementados; IF01 (migraciones) y DT02 (type-check tests) movidos a iniciativa futura.
