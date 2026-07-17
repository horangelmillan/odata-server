# G3 — Internacionalización (i18n)

> **Fase:** G3 · **Esfuerzo:** Medio · **Estado:** ✅ Completada
> **Depende de:** G1, G2 (vistas estables, textos definitivos).
> **Actualiza:** `webapp/manifest.json`, todas las vistas XML.
> **Crea:** `webapp/i18n/i18n.properties`

---

## 0. Objetivo

Externalizar todos los strings visibles al usuario (títulos de página, etiquetas de columna, textos de botón, mensajes) a archivos de propiedades i18n, siguiendo el estándar SAPUI5.

---

## 1. Decisiones técnicas

### 1.1 Modelo i18n estándar SAPUI5

SAPUI5 soporta i18n de forma nativa mediante:
1. Archivo `webapp/i18n/i18n.properties` con pares `clave=valor`.
2. Modelo `i18n` declarado en `manifest.json` con tipo `sap.ui.model.resource.ResourceModel`.
3. Binding en vistas XML: `{i18n>key}`.

### 1.2 Separación por dominio funcional

Se organizan las claves con prefijos semánticos para mantener el archivo ordenado:

```
# Títulos de página
page.finance.title=Finance — Ecosistema S/4HANA
page.invoiceList.title=Facturas (Invoice)
page.invoiceDetail.title=Detalle de Factura

# Botones
button.demo=Demo
button.finance=Finance

# Columnas de tabla
invoice.column.id=ID
invoice.column.cliente=Cliente
invoice.column.importe=Importe
```

### 1.3 Textos generados por binding

Los textos que provienen del modelo OData (nombres de entidad, estados como PAGADA/VENCIDA) NO se externalizan — se mantienen como datos del servidor.

---

## 2. Cambios detallados

### 2.1 Crear `webapp/i18n/i18n.properties`

Archivo con todas las claves y sus valores en español.

### 2.2 Modificar `webapp/manifest.json`

Agregar modelo i18n:

```json
"models": {
    "": { /* modelo OData existente */ },
    "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": {
            "bundleName": "ui5.odata.demo.i18n.i18n"
        }
    }
}
```

### 2.3 Reemplazar strings en todas las vistas XML

Para cada vista, reemplazar:
- `title="Texto"` → `title="{i18n>page.xxx.title}"`
- `Label text="Texto"` → `Label text="{i18n>xxx.label.yyy}"`
- `Button text="Texto"` → `Button text="{i18n>button.xxx}"`

---

## 3. Archivos afectados

| Archivo | Acción |
|---|---|
| `webapp/i18n/i18n.properties` | **CREAR** — todas las claves i18n |
| `webapp/manifest.json` | **MODIFICAR** — agregar modelo `i18n` |
| `webapp/view/Finance.view.xml` | **MODIFICAR** — reemplazar strings |
| `webapp/view/InvoiceList.view.xml` | **MODIFICAR** — reemplazar strings |
| `webapp/view/InvoiceDetail.view.xml` | **MODIFICAR** — reemplazar strings |
| `webapp/view/CustomerList.view.xml` | **MODIFICAR** — reemplazar strings |
| `webapp/view/CustomerDetail.view.xml` | **MODIFICAR** — reemplazar strings (de G1) |
| `webapp/view/PaymentList.view.xml` | **MODIFICAR** — reemplazar strings (de G1) |
| `webapp/view/App.view.xml` | **MODIFICAR** — reemplazar strings |

---

## 4. Criterios de aceptación

- [x] `ui5lint` sin errores.
- [x] Todos los títulos de página visibles se cargan desde i18n.
- [x] Todas las etiquetas de columna y botón se cargan desde i18n.
- [x] El texto en la UI es idéntico al anterior (mismos valores en español).
- [ ] Sin errores "ResourceModel: key not found" en consola (requiere verificación con servidor corriendo).

---

## 5. Siguiente fase

➡️ [`g4-batch-changeset.md`](g4-batch-changeset.md) — Corrección de `$batch` en el servidor.
