# G2 — Filtros Avanzados (Toolbar nativo OpenUI5)

> **Fase:** G2 · **Esfuerzo:** Medio · **Estado:** ✅ Completada
> **Depende de:** G1 (vistas estables).
> **Actualiza:** `webapp/view/InvoiceList.view.xml`, `webapp/controller/InvoiceList.controller.js`, `webapp/view/CustomerList.view.xml`, `webapp/controller/CustomerList.controller.js`

---

## 0. Objetivo

Agregar filtros contextuales a las listas de facturas y clientes (por estado, moneda, nombre, país) usando controles nativos de OpenUI5, sin depender de librerías SAPUI5 no disponibles en OpenUI5.

---

## 1. Decisiones técnicas

### 1.1 Toolbar nativo OpenUI5 (reemplazo de SmartFilterBar)

**Problema detectado durante validación:** `sap.ui.comp` (SmartFilterBar) **no existe en OpenUI5**. Es una librería exclusiva de SAPUI5 (comercial). Al cargar la aplicación, el runtime intenta descargar `sap/ui/comp/library.js` de OpenUI5 CDN y recibe 404, causando que `Component.create()` falle y la aplicación no cargue.

**Solución:** Reemplazar SmartFilterBar por controles nativos de OpenUI5 (Toolbar + ComboBox + Input + Filter/FilterOperator).

```xml
<Toolbar id="filterToolbar">
    <Label text="Estado" />
    <ComboBox id="filterEstado" placeholder="Todos">
        <core:Item key="" text="Todos" />
        <core:Item key="PENDIENTE" text="PENDIENTE" />
        <core:Item key="PAGADA" text="PAGADA" />
        <core:Item key="VENCIDA" text="VENCIDA" />
    </ComboBox>
    <Button text="Filtrar" press=".onFilter" />
    <Button text="Limpiar" press=".onClearFilter" />
</Toolbar>
```

### 1.2 Implementación de filtros

Los filtros se aplican mediante `sap.ui.model.Filter` + `FilterOperator` sobre el binding `rows` de la tabla:

**InvoiceList:** Filtros por `estado` (EQ) y `moneda` (EQ)
**CustomerList:** Filtros por `nombre` (Contains) y `pais` (Contains)

### 1.3 Sin dependencias adicionales

No se requiere `sap.ui.comp` en `manifest.json` ni en `ui5.yaml`.

---

## 2. Cambios detallados

### 2.1 Modificar `webapp/manifest.json`

Eliminar dependencia `sap.ui.comp` (nunca debió agregarse — no existe en OpenUI5).

### 2.2 Modificar `webapp/view/InvoiceList.view.xml`

Reemplazar SmartFilterBar por Toolbar nativo con ComboBox para estado y moneda.
Eliminar namespace `xmlns:smartFilterBar="sap.ui.comp.smartfilterbar"`.
Agregar `xmlns:core="sap.ui.core"`.

### 2.3 Modificar `webapp/controller/InvoiceList.controller.js`

Reemplazar handlers `_onFilterSearch`/`_onFilterClear` por `onFilter`/`onClearFilter` que:
- `onFilter`: Lee valores de ComboBox, construye array de `Filter` con `FilterOperator.EQ`, aplica a `oBinding.filter(aFilters)`.
- `onClearFilter`: Resetea ComboBox a "", aplica `oBinding.filter([])`.

Agregar dependencias `sap/ui/model/Filter` y `sap/ui/model/FilterOperator`.

### 2.4 Modificar `webapp/view/CustomerList.view.xml`

Análogo a InvoiceList pero con Inputs para nombre y país.

### 2.5 Modificar `webapp/controller/CustomerList.controller.js`

Análogo a InvoiceList.controller.js — filtros por `nombre` (FilterOperator.Contains) y `pais` (FilterOperator.Contains).

---

## 3. Archivos afectados

| Archivo | Acción |
|---|---|
| `webapp/manifest.json` | **MODIFICAR** — eliminar dependencia `sap.ui.comp` |
| `webapp/view/InvoiceList.view.xml` | **MODIFICAR** — SmartFilterBar → Toolbar nativo |
| `webapp/controller/InvoiceList.controller.js` | **MODIFICAR** — Filter/FilterOperator natives |
| `webapp/view/CustomerList.view.xml` | **MODIFICAR** — SmartFilterBar → Toolbar nativo |
| `webapp/controller/CustomerList.controller.js` | **MODIFICAR** — Filter/FilterOperator natives |

---

## 4. Criterios de aceptación

- [x] `ui5lint` sin errores.
- [x] Toolbar con filtros visible en InvoiceList (ComboBox estado + moneda).
- [x] Filtrar facturas por estado actualiza la tabla.
- [x] Toolbar con filtros visible en CustomerList (Input nombre + país).
- [x] Al seleccionar una fila en la tabla, navega al detalle correspondiente (se mantiene `rowSelectionChange`).
- [x] Sin errores de consola en SAPUI5 — `sap.ui.comp` eliminado, aplicación carga correctamente.

---

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| SmartFilterBar requiere `sap.ui.comp` que **no existe en OpenUI5** | Reemplazar por Toolbar nativo + Filter/FilterOperator. No hay dependencia externa. |
| Filtros nativos requieren escribir lógica manual | Compensado por simplicidad: ~10 líneas de filtro por controlador. Sin dependencias frágiles. |

---

## 6. Validación con Playwright

Antes de declarar G2 como completada, cargar la skill `playwright-testing` y
ejecutar las validaciones de filtros:

- Filtrar facturas por estado PENDIENTE/PAGADA/VENCIDA — verificar tabla actualizada
- Filtrar facturas por moneda EUR/USD — verificar tabla actualizada
- Limpiar filtros — verificar que la tabla muestra todos los registros
- Filtrar clientes por nombre (contains) — verificar tabla actualizada
- Filtrar clientes por país (contains) — verificar tabla actualizada
- Verificar que no hay errores de consola durante las operaciones de filtro

---

## 7. Siguiente fase

➡️ [`g3-internacionalizacion.md`](g3-internacionalizacion.md) — Internacionalización de textos visibles.
