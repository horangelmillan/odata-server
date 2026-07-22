# G5 — CRUD desde Vistas SAPUI5

> **Fase:** G5 · **Esfuerzo:** Alto · **Estado:** ✅ Completada
> **Depende de:** G4 ($batch funcional recomendado pero no obligatorio).
> **Actualiza:** `webapp/controller/InvoiceList.controller.js`, `webapp/controller/CustomerList.controller.js`
> **Crea:** Fragmentos XML de diálogo en `webapp/fragment/`

---

## 0. Objetivo

Agregar capacidad de creación, edición y eliminación de facturas y clientes directamente desde las vistas de lista, utilizando diálogos modales que se comunican con el servidor OData vía writes.

---

## 1. Decisiones técnicas

### 1.1 Fragmentos modulares reutilizables

Cada operación CRUD se implementa como un **fragmento XML** que se abre como diálogo modal. Esto evita crear vistas completas con navegación separada y permite reutilizar la lógica de validación.

```
webapp/fragment/
├── InvoiceCreate.fragment.xml    # Diálogo de creación de factura
├── InvoiceEdit.fragment.xml      # Diálogo de edición de factura
└── CustomerCreate.fragment.xml   # Diálogo de creación de cliente
```

### 1.2 Estrategia de escritura

- Si G4 está completo: usar `updateGroupId="changes"` con `submitBatch`.
- Si G4 no está completo: usar `groupId="$direct"` para writes individuales (sin agrupación).

### 1.3 Validación

**Cliente (formulario SAPUI5):**
- Campos requeridos: cliente, sociedad, importe, moneda
- Importe debe ser decimal positivo
- Fecha no puede ser futura

**Servidor:**
- `JSONValidatorException` capturada por `odata-write.routes.ts` (ya implementada)
- Errores devueltos como `400 Bad Request` con mensaje descriptivo

### 1.4 Manejo de errores

Usar `MessageManager` + `MessageStrip` dentro del diálogo para mostrar errores del servidor sin cerrar el formulario, permitiendo al usuario corregir y reintentar.

### 1.5 Refresco de lista

Tras una operación exitosa:
- Cerrar el diálogo.
- Refrescar la tabla: `oBinding.refresh()` en la lista.

---

## 2. Cambios detallados

### 2.1 Crear `webapp/fragment/InvoiceCreate.fragment.xml`

Diálogo con formulario:
- Campo ID (editable solo en creación)
- ComboBox para seleccionar Cliente (bind a `/finance/customer-odata`)
- ComboBox para seleccionar Sociedad (bind a `/finance/company-odata`)
- Input para Importe
- ComboBox para Moneda (EUR, USD)
- DatePicker para Fecha
- Botones: Guardar, Cancelar

### 2.2 Crear `webapp/fragment/InvoiceEdit.fragment.xml`

Similar a InvoiceCreate pero:
- ID no editable (solo lectura)
- Campos precargados con datos existentes
- Botón "Eliminar" adicional (confirma antes de borrar)

### 2.3 Crear `webapp/fragment/CustomerCreate.fragment.xml`

Diálogo más simple:
- Campo ID
- Input para Nombre
- Input para País
- Botones: Guardar, Cancelar

### 2.4 Modificar `webapp/controller/InvoiceList.controller.js`

Agregar métodos:
- `onCreateInvoice`: abre fragmento InvoiceCreate, maneja evento de confirmación
- `onEditInvoice`: abre fragmento InvoiceEdit con datos de la fila seleccionada
- `onDeleteInvoice`: confirmación + delete

Agregar botones en el `headerContent` de la vista:
- "Nueva Factura" → `onCreateInvoice`
- "Editar" → `onEditInvoice`
- "Eliminar" → `onDeleteInvoice`

### 2.5 Modificar `webapp/controller/CustomerList.controller.js`

Análogo a InvoiceList pero solo con `onCreateCustomer`.

---

## 3. Archivos afectados

| Archivo | Acción |
|---|---|
| `webapp/fragment/InvoiceCreate.fragment.xml` | **CREAR** — diálogo de creación |
| `webapp/fragment/InvoiceEdit.fragment.xml` | **CREAR** — diálogo de edición |
| `webapp/fragment/CustomerCreate.fragment.xml` | **CREAR** — diálogo de creación |
| `webapp/controller/InvoiceList.controller.js` | **MODIFICAR** — agregar métodos CRUD |
| `webapp/controller/CustomerList.controller.js` | **MODIFICAR** — agregar métodos CRUD |
| `webapp/view/InvoiceList.view.xml` | **MODIFICAR** — agregar botones en header |
| `webapp/view/CustomerList.view.xml` | **MODIFICAR** — agregar botones en header |

---

## 4. Criterios de aceptación

- [x] `ui5lint` sin errores.
- [ ] Botón "Nueva Factura" abre diálogo con formulario. *(Requiere servidor SAPUI5 corriendo para validación visual)*
- [ ] Crear factura con datos válidos → 201, factura visible en lista. *(Requiere servidor corriendo + BD)*
- [ ] Crear factura con datos inválidos → error mostrado en diálogo. *(Requiere servidor corriendo)*
- [ ] Botón "Editar" abre diálogo precargado con datos de la factura seleccionada. *(Requiere servidor corriendo)*
- [ ] Editar y guardar → PATCH exitoso, datos actualizados en lista. *(Requiere servidor corriendo)*
- [ ] Botón "Eliminar" pide confirmación → DELETE exitoso, factura eliminada. *(Requiere servidor corriendo)*
- [ ] Cliente: crear funciona análogamente. *(Requiere servidor corriendo)*
- [x] `pnpm test` en verde (166/166, sin regresión en writes del servidor).
- [ ] Sin errores de consola en SAPUI5. *(Requiere servidor corriendo — validación visual)*

---

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| ComboBox para seleccionar cliente/sociedad requiere `$expand` o bindings adicionales | Verificar que el binding de ComboBox funciona con el modelo OData v4; usar `sap.ui.model.odata.v4.ODataModel` con `$select` para reducir payload |
| La validación de importe decimal puede diferir entre SAPUI5 y el servidor | Usar `step="0.01"` en el input, validar con regex antes de enviar; el servidor es la autoridad final |
| Si G4 no está completo, writes individuales pueden tener problemas de concurrencia | Usar `groupId="$direct"` con writes secuenciales; documentar que writes agrupados no están disponibles |

---

## 6. Alcance y no-alcance

### En alcance
- Crear, editar y eliminar **facturas** (Invoice).
- Crear **clientes** (Customer).
- Diálogos modales con formularios de entrada.
- Validación básica del lado cliente.
- Manejo de errores del servidor.

### Fuera de alcance (mejoras futuras)
- Editar y eliminar clientes (solo creación).
- CRUD de pagos (Payment).
- CRUD de sociedades (Company), proveedores (Supplier), cuentas mayor (GlAccount).
- Paginación avanzada, búsqueda difusa en ComboBox.
- Historial de cambios / auditoría.

---

## 7. Siguientes pasos

Una vez completada G5, se debe:

1. Ejecutar `pnpm test` completo en servidor.
2. Ejecutar `ui5lint` en SAPUI5.
3. Validar con Playwright (cargar skill `playwright-testing` primero, luego ejecutar flujo completo: crear factura → ver en lista → editar → eliminar).
4. Ejecutar validación completa de navegación Demo ↔ Finance ↔ listas ↔ detalles.
5. Documentar cualquier ajuste necesario.
6. Proceder con PR a `master`.
