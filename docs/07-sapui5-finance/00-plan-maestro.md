# 00 — Plan Maestro: Integración SAPUI5 con Dominio Finance

> **Ciclo:** `docs/finance-ui5-integration-plan` (rama dedicada; documentación + análisis arquitectónico).
> **Inicio:** 2026-07-16
> **Estado global:** 📋 F0 completada — análisis y documentación de la iniciativa.
> **Depende de:** Ciclo 06 (`feature/financial-eco`) — 8 dominios financieros ya implementados en el servidor.

---

## 0. Resumen ejecutivo

El servidor OData ya dispone de un dominio **finance** con 8 entidades (company, customer, supplier, glaccount, invoice, supplierinvoice, invoiceitem, payment) completamente implementadas y funcionales vía OData V4.

Sin embargo, estas entidades carecen de integración con la aplicación SAPUI5 de prueba (`ui5-odata-demo`), la cual actualmente solo valida el dominio **demo** (product, category).

Este ciclo tiene dos objetivos:

1. **Documentar** el análisis técnico completo necesario para la integración SAPUI5 + finance.
2. **Rediseñar** un punto de acoplamiento arquitectónico detectado en el Shared Kernel: el registro hardcodeado de servicios de dominio en `odata-write.routes.ts`, reemplazándolo por un mecanismo de **Domain Registration Object** que permita agregar nuevos dominios sin modificar el kernel.

El resultado de este ciclo es exclusivamente documentación y definición arquitectónica. La implementación del código corresponde a ciclos posteriores.

---

## 1. Diagnóstico actual

### 1.1 Servidor OData — dominio demo

| Aspecto | Estado |
|---------|--------|
| `product-odata` (endpoint sin prefijo) | ✅ CRUD completo |
| `category-odata` (endpoint sin prefijo) | ✅ CRUD completo |
| Navegaciones `$expand` (belongsTo, hasMany) | ✅ |
| Write services registrados en kernel | ✅ `productService`, `categoryService` |
| Exportado desde `src/core/main.ts` | ✅ |

### 1.2 Servidor OData — dominio finance

| Aspecto | Estado |
|---------|--------|
| 8 entidades con modelos `@Table/@Column` | ✅ Completado (F1) |
| Seed idempotente re-montable | ✅ Completado (F2) |
| Relaciones y navegaciones `$expand` | ✅ Completado (F3) |
| Tests de integración del ecosistema | ✅ Completado (F4) |
| Controladores OData registrados en `odata.service.ts` | ✅ |
| Modelos registrados en `datasource.ts` | ✅ |
| Write services NO registrados en el kernel | ❌ Pendiente |
| Exportados desde `src/core/main.ts` | ❌ Pendiente |

### 1.3 SAPUI5 — aplicación de prueba

| Aspecto | Estado |
|---------|--------|
| Vista de product-odata con tabla | ✅ |
| Tests de compatibilidad (list, by-key, expand, CRUD) | ✅ 6/7 pass |
| $batch con changeset | ❌ No funciona (servidor rechaza) |
| Vistas para entidades finance | ❌ No existen |

---

## 2. Decisiones de arquitectura

| # | Decisión | Opción elegida | Alternativa descartada |
|---|---|---|---|
| D1 | Registro de servicios de dominio en el kernel | **Domain Registration Object**: cada dominio exporta un objeto `{ model, controller, service }` desde su `main.ts`; `core/main.ts` los agrega a un array; el kernel itera genéricamente. Ver `01-arquitectura-propuesta.md`. | Modificar el kernel manualmente por cada dominio (viola Open/Closed, genera acoplamiento). |
| D2 | Modelo OData en SAPUI5 para finance | **Mismo modelo `""` existente**: todas las entidades (demo + finance) comparten el servicio `/odata/`. SAPUI5 bindea por path: `/finance/company-odata`, etc. | Crear un segundo `ODataModel` separado para finance (innecesario: mismo serviceUrl, misma instancia). |
| D3 | Estrategia de escritura SAPUI5 | **Continuar con `groupId="$direct"`** (POST/PATCH/DELETE planos) hasta que el servidor soporte changesets `$batch` correctamente. | Usar `updateGroupId="changes"` (falla porque el servidor rechaza changesets multipart/mixed). |
| D4 | Navegación entre dominios en SAPUI5 | **Routing SAPUI5 estándar** (`sap.m.routing.Router`) con rutas separadas para demo y finance. | Navegación manual vía eventos (menos mantenible, sin deep linking). |
| D5 | Metadatos finance en SAPUI5 | **Usar `$metadata` dinámico del servidor**: el servidor ya genera EDMX XML estándar que incluye todas las entidades (demo + finance). El proxy-to-server.js lo reenvía correctamente. | Metadata estática en `webapp/model/metadata.xml` (obsoleto, no escala). |

---

## 3. Estructura objetivo

### 3.1 Servidor (post-refactor)

```
src/
├── common/service/odata/           # SHARED KERNEL (sin imports a dominios)
│   ├── datasource.ts               # modelos registrados (se mantiene)
│   ├── odata.service.ts            # consume domainRegistrations[], construye controllers + services map
│   ├── odata-write.routes.ts       # registerWriteRoutes(router, controllers, services) — genérico
│   └── ...
├── core/                           # DOMAIN LAYER
│   ├── main.ts                     # compose domainRegistrations[] (único punto de registro)
│   ├── demo/
│   │   ├── product/main.ts         # exporta productRegistration
│   │   └── category/main.ts        # exporta categoryRegistration
│   ├── finance/
│   │   ├── company/main.ts         # exporta companyRegistration
│   │   ├── customer/main.ts        # exporta customerRegistration
│   │   └── ... (6 restantes)
```

### 3.2 SAPUI5 (post-implementación)

```
webapp/
├── manifest.json                   # routing: rutas demo + finance
├── view/
│   ├── App.view.xml                # navegación entre Demo y Finance
│   ├── Finance.view.xml            # dashboard / selector de entidad finance
│   ├── InvoiceList.view.xml        # lista de facturas
│   ├── InvoiceDetail.view.xml      # detalle de factura (+ $expand navegaciones)
│   └── CustomerList.view.xml       # lista de clientes
├── controller/
│   ├── App.controller.js           + navegación
│   ├── Finance.controller.js
│   ├── InvoiceList.controller.js
│   ├── InvoiceDetail.controller.js
│   └── CustomerList.controller.js
```

---

## 4. Fases

| Fase | Alcance | Entregable | Esfuerzo | Depende de |
|---|---|---|---|---|
| **F0** | Documentación + análisis arquitectónico. Creación de `docs/07-sapui5-finance/`. Propuesta de Domain Registration Object. | Documentación completa en `docs/07-sapui5-finance/`. Análisis arquitectónico validado. | Bajo | — |
| **F1** | Refactor del Shared Kernel: interfaz `DomainRegistration`, modificar `registerWriteRoutes` para aceptar service map como parámetro, consumir `domainRegistrations[]` desde `odata.service.ts`. | Kernel sin imports a dominios; tests existentes en verde. | Medio | F0 |
| **F2** | Refactor de `core/main.ts` y `main.ts` de cada dominio: exportar registration objects, componer `domainRegistrations[]`. Agregar registrations de finance. | `core/main.ts` como único punto de composición; writes finance habilitados. | Medio | F1 |
| **F3** | SAPUI5: agregar routing, vista base Finance con navegación por entidad. | Vista Finance navegable, bindeando datos reales del servidor. | Medio | F2 |
| **F4** | SAPUI5: vistas detalladas (InvoiceList, InvoiceDetail, CustomerList). | Listas y detalles funcionales con `$expand`. | Medio-Alto | F3 |

---

## 5. Condiciones de aceptación globales

- [ ] F0–F4 documentadas y validadas.
- [ ] `pnpm test` en verde tras F1–F2 (sin regresión).
- [ ] `common/service/odata/` sin imports directos a `core/` (salvo `core/main.ts`).
- [ ] `registerWriteRoutes` genérica: acepta `Record<string, DomainWriteService>` como parámetro.
- [ ] Nuevo dominio = agregar línea en `core/main.ts` (sin tocar `common/`).
- [ ] Vista finance en SAPUI5 funcional (datos visibles, navegaciones `$expand` operativas).
- [ ] Documentación alineada (`docs/00-indice.md`, `docs/02-patrones/05-odata-module-pattern.md`).

---

## 6. Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| `01-arquitectura-propuesta.md` | Diseño del Domain Registration Object, diagramas, justificación |
| `fases/f0-documentacion-y-analisis.md` | Esta fase: investigación, hallazgos, alcance |
| `fases/f1-rediseno-write-routes.md` | Refactor de `registerWriteRoutes` y `odata.service.ts` |
| `fases/f2-exports-core-main.md` | Refactor de barriales de dominio y composición en `core/main.ts` |
| `fases/f3-vista-finance-base-sapui5.md` | Routing SAPUI5 + vista Finance base |
| `fases/f4-vistas-finance-detalladas.md` | Vistas detalladas Invoice, Customer, etc. |
