# 01 — Arquitectura Propuesta: Evolución de la Integración SAPUI5

---

## 1. Estado actual (post-F4)

La arquitectura actual del proyecto tras completar el ciclo 07 es:

### Servidor
```
src/
├── core/
│   ├── main.ts                     # domainRegistrations[] (10 dominios)
│   ├── demo/   (product, category)
│   └── finance/ (8 entidades)
├── common/service/odata/
│   ├── odata.service.ts            # consume domainRegistrations
│   ├── odata-write.routes.ts       # registerWriteRoutes(router, controllers, services)
│   ├── odata-registration.interface.ts
│   └── ...
```

### SAPUI5
```
webapp/
├── manifest.json                   # routing: demo + finance + invoiceList + invoiceDetail + customerList
├── view/
│   ├── App.view.xml               # botones Demo/Finance
│   ├── Finance.view.xml            # navegación a listas
│   ├── InvoiceList.view.xml        # sap.ui.table → /finance/invoice-odata
│   ├── InvoiceDetail.view.xml      # Form + items table con $expand
│   └── CustomerList.view.xml       # sap.ui.table → /finance/customer-odata
├── controller/ (análogo)
```

### Patrón de vistas SAPUI5
Todas las vistas siguen el mismo patrón:
- `sap.ui.table.Table` con binding directo (`rows="{/finance/...}"`)
- Controladores con `Controller.extend("ui5.odata.demo.controller.Xxx", ...)`
- `groupId="$direct"` para writes
- Strings hardcodeados en español en las vistas

---

## 2. Cambios arquitectónicos por fase

### 2.1 G1 — Sin cambios arquitectónicos

G1 añade vistas que siguen **exactamente el mismo patrón** que InvoiceDetail y CustomerList:
- `CustomerDetail.view.xml` + `CustomerDetail.controller.js`
- `PaymentList.view.xml` + `PaymentList.controller.js`
- Una ruta nueva en `manifest.json` para cada una

No se introducen nuevos patrones, librerías ni cambios en el Shared Kernel.

### 2.2 G2 — Migración a SmartTable/SmartFilterBar (cambio significativo)

**Problema detectado:** Las vistas actuales usan `sap.ui.table.Table` con binding directo. SmartFilterBar requiere un `SmartTable` para funcionar correctamente, y `SmartTable` envuelve `sap.m.Table` o `sap.ui.table.Table`.

**Análisis de alternativas:**

| Alternativa | Ventajas | Desventajas |
|---|---|---|
| **A: SmartTable + SmartFilterBar** (elegida) | Filtros contextuales, variante management, binding automático | Requiere reemplazar el binding `rows` por `entitySet`, pérdida de control granular sobre columnas |
| **B: Filtros manuales con VBox + Input** | Control total, sin dependencias nuevas | Más código, sin variante management, sin persistencia de filtros |
| **C: Mantener `sap.ui.table` + filtros vía binding parameters** | Mínimo cambio | No hay UI de filtros; el usuario debe escribir la URL manualmente |

**Decisión:** Usar SmartTable + SmartFilterBar (Alternativa A). El cambio es localizado:
- Reemplazar `<table:Table rows="{...}">` por `<smartTable:SmartTable entitySet="finance/invoice-odata"...>`
- Envolver en `<SmartFilterBar>`
- Los controladores existentes (`onInvoiceSelect`) deben adaptarse al modelo de eventos de SmartTable

**Impacto en el Shared Kernel:** Ninguno. Todo es del lado SAPUI5.

### 2.3 G3 — Internacionalización (sin cambios arquitectónicos)

i18n en SAPUI5 sigue el patrón estándar:
1. Archivo `webapp/i18n/i18n.properties` con claves/valores
2. Modelo `i18n` en `manifest.json`
3. Reemplazar strings literales por `{i18n>key}` en las vistas XML

No hay cambios en el servidor ni en la arquitectura de la aplicación.

### 2.4 G4 — Corrección de `$batch` (verificación y documentación)

**Hallazgo:** El servidor **ya es 100% OData v4 `$batch`-compliant**, verificado en F6.1 del ciclo anterior. El pipeline de `$batch` es un middleware Express custom (`src/common/middleware/batch.middleware.ts`) que no depende de `@phrasecode/odata`. Soporta changesets multipart/mixed, correlaciona `Content-ID`, y provee atomicidad transaccional.

**Quirk conocido:** SAPUI5 `ODataContext.created()` no resuelve tras un `$batch` changeset exitoso, incluso con una respuesta OData v4 perfectamente válida. Es un quirk de correlación del runtime cliente UI5 (cargado por CDN, no depurable localmente). Ver F6.1 para detalles.

**Impacto en el Shared Kernel:** Ninguno. El middleware batch ya está implementado y funcionando. No requiere cambios.

### 2.5 G5 — CRUD desde vistas (extensión del patrón actual)

**Patrón propuesto para diálogos CRUD:**

```
Vista lista (InvoiceList)
  └── Botón "Crear" → abre Fragmento "InvoiceCreate.fragment.xml"
        └── Usuario llena formulario → botón "Guardar"
              ├── oList.create({...}) en grupo "$direct" (o "changes" si G4 está completo)
              ├── Éxito → cerrar diálogo, refrescar lista
              └── Error → MessageStrip en el diálogo
```

**Estructura de fragmentos:**

```
webapp/
├── fragment/
│   ├── InvoiceCreate.fragment.xml
│   ├── InvoiceEdit.fragment.xml
│   └── CustomerCreate.fragment.xml
├── controller/
│   ├── InvoiceList.controller.js  (extendido con onCreate/onEdit/onDelete)
│   └── ...
```

**Validación:**
- Del lado cliente: campos requeridos, formato de importe, selección de cliente/sociedad
- Del lado servidor: `JSONValidatorException` (clase existente) capturada por `odata-write.routes.ts`

---

## 3. Diagrama de flujo de navegación objetivo (post-G1)

```
App (Demo/Finance)
  │
  ├── "Demo" → #/ (test bench existente)
  │
  └── "Finance" → #/finance
        │
        ├── Facturas (Invoice) → #/finance/invoice-odata
        │     └── seleccionar fila → #/finance/invoice-odata/{id}
        │           └── "Atrás" → #/finance/invoice-odata
        │
        └── Clientes (Customer) → #/finance/customer-odata
              └── seleccionar fila → #/finance/customer-odata/{id}
                    └── "Atrás" → #/finance/customer-odata

[Nuevo en G1]
        └── Pagos (Payment) → #/finance/payment-odata
              └── seleccionar fila → #/finance/payment-odata/{id}
                    └── "Atrás" → #/finance/payment-odata
```

---

## 4. Resumen de cambios por capa

| Capa | G1 | G2 | G3 | G4 | G5 |
|---|---|---|---|---|---|
| **Servidor (`src/`)** | ❌ | ❌ | ❌ | ❌ (ya compliant) | ❌ |
| **SAPUI5 vistas** | ✅ (2 nuevas) | ✅ (modificar 2 existentes) | ✅ (modificar todas) | ❌ | ✅ (3 fragmentos nuevos) |
| **SAPUI5 controladores** | ✅ (2 nuevos) | ✅ (modificar 2) | ❌ | ❌ | ✅ (extender 2) |
| **SAPUI5 manifest.json** | ✅ (rutas) | ❌ | ✅ (modelo i18n) | ❌ | ❌ |
| **SAPUI5 i18n** | ❌ | ❌ | ✅ (nuevo archivo) | ❌ | ❌ |
