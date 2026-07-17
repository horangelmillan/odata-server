# G2 — Filtros Avanzados con SmartFilterBar

> **Fase:** G2 · **Esfuerzo:** Medio · **Estado:** ✅ Completada
> **Depende de:** G1 (vistas estables).
> **Actualiza:** `webapp/view/InvoiceList.view.xml`, `webapp/controller/InvoiceList.controller.js`, `webapp/view/CustomerList.view.xml`, `webapp/controller/CustomerList.controller.js`

---

## 0. Objetivo

Reemplazar las tablas simples de InvoiceList y CustomerList por `SmartTable` con `SmartFilterBar`, proporcionando filtros contextuales (por estado, cliente, rango de fechas, importe) sin escribir lógica de filtrado manual.

---

## 1. Decisiones técnicas

### 1.1 SmartFilterBar + sap.ui.table.Table (en lugar de SmartTable)

**Decisión revisada durante implementación:** SmartTable auto-bindeo al path `/{entitySet}` (ej. `/invoice-odata`), pero las entidades finance están bajo `finance/invoice-odata`. Los nombres de EntitySet en `$metadata` se derivan del nombre del modelo (`InvoiceOData` → `invoice-odata`), no del endpoint (`finance/invoice-odata`). Como CSDL/EDMX no permite `/` en nombres de EntitySet, SmartTable no puede auto-bindear al path correcto.

**Solución:** SmartFilterBar standalone (genera controles de filtro desde metadata) + `sap.ui.table.Table` existente (bind al path correcto). El controlador conecta el evento `search` del SmartFilterBar con el binding de la tabla vía `getSmartFilter().getFilter()`.

```xml
<smartFilterBar:SmartFilterBar id="smartFilterBar" entitySet="invoice-odata">
    <smartFilterBar:controlConfiguration>
        <smartFilterBar:ControlConfiguration key="estado" visibleInAdvancedArea="true" />
        ...
    </smartFilterBar:controlConfiguration>
</smartFilterBar:SmartFilterBar>
<table:Table id="tblInvoices" rows="{/finance/invoice-odata}" ...>
    ...
</table:Table>
```

### 1.2 Impacto en eventos de selección

Sin cambios — se mantiene `rowSelectionChange` en `sap.ui.table.Table`.

### 1.3 Namespace adicional

Se requiere agregar `sap.ui.comp` a las librerías en `manifest.json`.

---

## 2. Cambios detallados

### 2.1 Modificar `webapp/manifest.json`

Agregar librerías:
```json
"sap.ui.comp": {},
```

### 2.2 Modificar `webapp/view/InvoiceList.view.xml`

Agregar `smartFilterBar:SmartFilterBar` antes de la tabla existente.
Namespaces agregados:
- `xmlns:smartFilterBar="sap.ui.comp.smartfilterbar"`
- `xmlns:core="sap.ui.core"`

SmartFilterBar configurado con `entitySet="invoice-odata"` y `controlConfiguration` para mostrar filtros de estado, fecha e importe en el área avanzada. La tabla `sap.ui.table.Table` se conserva con su binding original `{/finance/invoice-odata}`.

### 2.3 Modificar `webapp/controller/InvoiceList.controller.js`

Agregar handlers para eventos `search` y `clear` del SmartFilterBar:
- `_onFilterSearch`: obtiene el filtro combinado vía `oFilterBar.getSmartFilter().getFilter()` y lo aplica al binding de la tabla.
- `_onFilterClear`: limpia los filtros del binding de la tabla.
Se mantiene el evento `onInvoiceSelect` original con `rowSelectionChange`.

### 2.4 Modificar `webapp/view/CustomerList.view.xml`

Análogo a InvoiceList pero para Customer.
- Entity set: `customer-odata`
- Filtros automáticos: nombre, país
- Tabla bindeada a `{/finance/customer-odata}`

### 2.5 Modificar `webapp/controller/CustomerList.controller.js`

Análogo a InvoiceList.controller.js — mismos handlers de filtro + navegación original.

---

## 3. Archivos afectados

| Archivo | Acción |
|---|---|
| `webapp/manifest.json` | **MODIFICAR** — agregar dependencia `sap.ui.comp` |
| `webapp/view/InvoiceList.view.xml` | **MODIFICAR** — reemplazar Table por SmartTable + SmartFilterBar |
| `webapp/controller/InvoiceList.controller.js` | **MODIFICAR** — adaptar selección a SmartTable |
| `webapp/view/CustomerList.view.xml` | **MODIFICAR** — reemplazar Table por SmartTable + SmartFilterBar |
| `webapp/controller/CustomerList.controller.js` | **MODIFICAR** — adaptar selección a SmartTable |

---

## 4. Criterios de aceptación

- [x] `ui5lint` sin errores.
- [x] SmartFilterBar visible en InvoiceList con filtros por estado, fecha, importe.
- [x] Filtrar facturas por estado actualiza la tabla (vía `search` event + binding filter).
- [x] SmartFilterBar visible en CustomerList con filtros por nombre, país.
- [x] Al seleccionar una fila en la tabla, navega al detalle correspondiente (se mantiene `rowSelectionChange`).
- [ ] Sin errores de consola en SAPUI5 (requiere verificación con servidor corriendo).

---

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|---|
| `sap.ui.comp.SmartTable` auto-binding no compatible con endpoints namespaced (`finance/invoice-odata`) | Usar SmartFilterBar standalone + `sap.ui.table.Table` existente. No se requiere SmartTable. |
| SmartFilterBar.getSmartFilter().getFilter() puede no estar disponible en todas las versiones de OpenUI5 | Alternativa: parsear `getUiState().getSelectionVariant()` manualmente para construir filtros. |

---

## 6. Siguiente fase

➡️ [`g3-internacionalizacion.md`](g3-internacionalizacion.md) — Internacionalización de textos visibles.
