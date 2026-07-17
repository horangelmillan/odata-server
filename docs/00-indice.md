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
**Ciclo actual.** Estado global: ✅ **Completado (v2.0.0-odata-domain)**. Release tag: [`v2.0.0-odata-domain`](https://github.com/horangelmillan/odata-server/releases/tag/v2.0.0-odata-domain). Merge a `master` vía PR #1 (flujo PR: protección de rama + check `test` + merge por GitHub). Elimina REST y promueve OData a dominio de primera clase, con la misma
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
**Ciclo actual.** Estado global: ✅ **F0 completada** — [issue #3](https://github.com/horangelmillan/odata-server/issues/3) resuelto via [PR #4](https://github.com/horangelmillan/odata-server/pull/4), prefijo `demo/` aplicado a product/category. Añade al
servidor un ecosistema financiero coherente (sociedades, clientes, proveedores, cuentas
mayor, facturas de venta/proveedor, líneas y pagos con clearing) y un **seed idempotente
re-montable** (`pnpm seed` / `pnpm db:reset` recrea los mismos datos). El dominio es
**agnóstico al protocolo**; el servidor lo expone solo vía OData v4. Namespaces simétricos:
`/odata/demo/*` (product, category) y `/odata/finance/*` (ecosistema). Rama dedicada:
`feature/financial-eco`.
- [`00-plan-maestro.md`](06-financial-eco/00-plan-maestro.md) — Plan maestro y decisión de arquitectura.
- [`fases/f0-ramificacion-baseline.md`](06-financial-eco/fases/f0-ramificacion-baseline.md) — F0.0 ✅ (rama + baseline 143 pass).
- [`fases/f0.1-prefijo-demo-bloqueado.md`](06-financial-eco/fases/f0.1-prefijo-demo-bloqueado.md) — 🚧 F0.1 en pausa por issue #3.
- [`fases/f1-modelos-financieros.md`](06-financial-eco/fases/f1-modelos-financieros.md) — 8 dominios (sub-fases `f1.1`–`f1.8`)
- [`fases/f2-seed-remontable.md`](06-financial-eco/fases/f2-seed-remontable.md) — Seed idempotente (sub-fases `f2.0`–`f2.8`)
- [`fases/f3-relaciones-y-estados.md`](06-financial-eco/fases/f3-relaciones-y-estados.md) ✅
- [`fases/f4-tests-ecosistema.md`](06-financial-eco/fases/f4-tests-ecosistema.md) ✅
- [`fases/f5-documentacion.md`](06-financial-eco/fases/f5-documentacion.md) ✅
- [`../02-patrones/16-financial-module.md`](02-patrones/16-financial-module.md) — Patrón de módulo financiero con entidades, navegaciones, seed y ejemplos `$expand`/`$filter`.
- [`fases/f6-merge-a-master.md`](06-financial-eco/fases/f6-merge-a-master.md)

## 07 — Ciclo de Integración SAPUI5 con Dominio Finance
**Ciclo actual.** Estado global: 📋 **F0 completada** — documentación y análisis arquitectónico.
Rama dedicada: `docs/finance-ui5-integration-plan`. Define el plan para integrar el dominio
finance del servidor con la aplicación SAPUI5 de prueba, e incluye el rediseño del mecanismo
de registro de servicios de dominio (Domain Registration Object) para eliminar el acoplamiento
entre el Shared Kernel y los dominios.

- [`00-plan-maestro.md`](07-sapui5-finance/00-plan-maestro.md) — Plan maestro y decisiones de arquitectura.
- [`01-arquitectura-propuesta.md`](07-sapui5-finance/01-arquitectura-propuesta.md) — Diseño del Domain Registration Object.
- [`fases/f0-documentacion-y-analisis.md`](07-sapui5-finance/fases/f0-documentacion-y-analisis.md) ✅ — F0 completada: investigación, hallazgos, alcance.
- [`fases/f1-rediseno-write-routes.md`](07-sapui5-finance/fases/f1-rediseno-write-routes.md) 📋 — Refactor del Shared Kernel: write routes genérico.
- [`fases/f2-exports-core-main.md`](07-sapui5-finance/fases/f2-exports-core-main.md) 📋 — Refactor de barriales y composición en `core/main.ts`.
- [`fases/f3-vista-finance-base-sapui5.md`](07-sapui5-finance/fases/f3-vista-finance-base-sapui5.md) 📋 — Vista base Finance en SAPUI5 con routing.
- [`fases/f4-vistas-finance-detalladas.md`](07-sapui5-finance/fases/f4-vistas-finance-detalladas.md) 📋 — Vistas detalladas de entidades finance.
