# 00 — Plan Maestro: Evolución de la Integración SAPUI5 con Dominio Finance

> **Ciclo:** `feature/sapui5-finance-evolution` (rama dedicada; sin merge a `master` hasta cumplir todas las condiciones de aceptación).
> **Inicio:** 2026-07-17
> **Estado global:** 📋 Pendiente — documentación aprobada.
> **Depende de:** Ciclo 07 (`docs/finance-ui5-integration-plan`) — F0–F4 completadas: vistas Finance, InvoiceList, InvoiceDetail, CustomerList; Domain Registration Object implementado; writes finance habilitados.

---

## 0. Resumen ejecutivo

El ciclo 07 (`07-sapui5-finance`) completó la integración base del dominio finance en SAPUI5: routing, vista dashboard Finance, listado de facturas con `$expand`, detalle de factura con navegaciones profundas y listado de clientes.

Esta nueva iniciativa **evoluciona** dicha integración añadiendo funcionalidades que transforman las vistas de consulta en una interfaz más completa, filtrable, internacionalizada y con capacidad de escritura.

No se modifica la arquitectura del servidor salvo en G4 (corrección de `$batch`). El resto son mejoras exclusivas del lado SAPUI5.

### Estado de partida

| Aspecto | Estado |
|---|---|---|
| Vistas InvoiceList, InvoiceDetail, CustomerList | ✅ Implementadas (F4) |
| `$expand` funcional (customer, company, items, glAccount) | ✅ |
| Routing Demo ↔ Finance | ✅ |
| Writes finance vía `$direct` | ✅ |
| `$batch` con changeset (servidor) | ✅ Servidor OData v4 `$batch`-compliant (F6.1) |
| `created()` en SAPUI5 tras `$batch` | ❌ Quirk de cliente UI5 (timeout) |
| Vistas CustomerDetail, PaymentList | ❌ No existen |
| Filtros avanzados en listas | ❌ |
| Internacionalización (i18n) | ❌ |
| CRUD desde vistas | ❌ |

---

## 1. Decisiones de arquitectura

| # | Decisión | Opción elegida | Alternativa descartada |
|---|---|---|---|
| D1 | Estrategia de escritura | **`$direct` hasta G4** — G4 corrige el servidor para soportar changesets; luego migrar a `updateGroupId="changes"` en G5 | Migrar a `changes` antes de corregir el servidor (rompería writes existentes) |
| D2 | Componentes de filtro | **SmartTable + SmartFilterBar** (G2) — reemplazar `sap.ui.table.Table` por `sap.ui.table.SmartTable` envuelto en `SmartFilterBar` | `sap.m.Table` con filtros manuales (pierde variante management y filtros contextuales del ODataModel v4) |
| D3 | Internacionalización | **Modelo i18n estándar SAPUI5** — archivo `i18n.properties` + modelo global en `manifest.json` | i18n en JSON externo (no es estándar SAPUI5) |
| D4 | Diálogos CRUD | **Fragmentos modulares reutilizables** — un fragmento XML por entidad (InvoiceCreate, CustomerEdit, etc.) con validación en controlador | Vistas completas con navegación separada (más overhead, peor UX en diálogos) |
| D5 | Gestión de errores en CRUD | **MessageManager + MessageStrip** — errores del servidor se muestran en el diálogo sin recargar la lista | `MessageToast` fugaz (no permite al usuario leer el error detallado) |

---

## 2. Fases

| Fase | Descripción | Esfuerzo | Depende de | Prioridad |
|---|---|---|---|---|
| **G1** | Vistas priorizadas: CustomerDetail (con `$expand=invoices`), PaymentList (con `$expand=invoice`), navegación CustomerList→CustomerDetail. Rutas en manifest.json. | Bajo | F4 | Alta |
| **G4** | Corrección de `$batch` changeset en el servidor. Verificación de cumplimiento OData v4 (F6.1), documentación del quirk `created()` en UI5, tests de regresión adicionales. | Bajo | G1 | Alta ✅ Completada |
| **G2** | Filtros avanzados: migrar InvoiceList y CustomerList a SmartTable, agregar SmartFilterBar con filtros contextuales. | Medio | G4 (opcional) | Media |
| **G3** | Internacionalización: crear `i18n.properties`, configurar modelo en manifest.json, reemplazar strings hardcodeados en todas las vistas. | Medio | G1, G2 | Media ✅ Completada |
| **G5** | CRUD desde vistas: diálogos de creación/edición de facturas, clientes y pagos. Validación, integración con writes, manejo de errores. | Alto | G4 | Baja ✅ Completada |

**Orden de ejecución recomendado:**

```
G1 ──→ G4 ──→ G2 ──→ G3 ──→ G5
```

G1 y G4 pueden ejecutarse secuencialmente (G1 es cliente, G4 es servidor). G2 y G3 son independientes de G4 pero se benefician de tener las vistas estables. G5 requiere G4 para writes agrupados, aunque `created()` timeout (quirk UI5) puede requerir usar `$direct` como fallback.

---

## 3. Dependencias entre fases

```
G1 (vistas)
  │
  ▼
G4 ($batch) ────→ G5 (CRUD) — G5 requiere changesets funcionales
  │
  ├──→ G2 (filtros) — sin dependencia fuerte de G4
  │        │
  │        ▼
  │     G3 (i18n) — G3 debe ejecutarse tras G2 para incluir nuevos textos
  │
  └──→ G3 (i18n) — ruta directa si G2 se omite
```

---

## 4. Condiciones de aceptación globales

- [ ] G1–G5 documentadas y validadas.
- [ ] `pnpm test` en verde tras cada fase (sin regresión).
- [ ] `ui5lint` sin errores tras cada fase.
- [ ] Navegación completa Demo ↔ Finance ↔ listas ↔ detalles funcional.
- [ ] `$expand` funcional en todas las vistas nuevas.
- [x] `$batch` con changeset funcional en el servidor (G4). Quirk `created()` en UI5 documentado.
- [ ] Strings visibles externalizados a i18n (G3).
- [x] CRUD básico operativo: crear, editar, eliminar facturas y clientes (G5). *(Requiere servidor corriendo para validación visual completa)*
- [ ] Documentación alineada (`docs/00-indice.md`).

---

## 5. Herramientas de apoyo por fase

- **Context7**: G2 (SmartTable/SmartFilterBar API), G3 (i18n en SAPUI5), G5 (diálogos modales, MessageManager).
- **Codebase Memory**: G4 (rastrear `CALLS` en el pipeline de batch del servidor), G5 (trazar flujo de writes desde `odata-write.routes.ts`).
- **Playwright**: G1, G2, G5 (validación visual y funcional de las nuevas vistas).

---

## 6. Riesgos globales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `created()` timeout en UI5 tras `$batch` changeset (quirk de cliente) | Medio — puede requerir `$direct` como fallback en G5 | Documentado en F6.1. G5 debe mitigar con timeout extendido o `$direct` como fallback |
| G2 (SmartFilterBar) puede ser incompatible con `sap.ui.table.Table` en OpenUI5 1.150.0 | Medio — requiere replantear la estrategia de filtros | Validar con Context7 la versión exacta antes de implementar; alternativa: filtros manuales con `VBox` + `Input` + bindings |
| G5 (CRUD) puede crecer en alcance si cada entidad requiere lógica muy diferente | Medio — esfuerzo estimado puede dispararse | Limitar G5 a Invoice CRUD; Customer y Payment quedan como mejora futura si el esfuerzo lo justifica |
