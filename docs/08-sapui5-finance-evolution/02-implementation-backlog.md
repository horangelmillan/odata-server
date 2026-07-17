# Implementation Backlog

## Propósito

Este documento centraliza todos los hallazgos detectados durante la implementación de esta iniciativa.

Su objetivo es evitar que riesgos, mejoras, refactorizaciones, investigaciones o decisiones pendientes queden únicamente registrados en los informes de una fase y posteriormente se pierdan.

Este documento es **vivo** y debe actualizarse durante toda la implementación.

---

# Reglas

* Ningún hallazgo puede permanecer únicamente en el informe de una fase.
* Todo hallazgo debe clasificarse en una de las categorías definidas en este documento.
* Todo elemento debe tener un estado.
* Ningún elemento puede quedar sin resolver al cerrar la iniciativa.

Estados válidos:

* Pendiente
* En evaluación
* Aprobado
* Implementado
* Descartado
* Movido a una iniciativa futura

---

# Riesgos

| ID | Detectado en | Descripción | Impacto | Estado | Resolución |
| -- | ------------ | ----------- | ------- | ------ | ---------- |
| R01 | G2 (implementación) | SmartTable auto-binding no compatible con endpoints namespaced (`finance/invoice-odata`). EntitySet names no pueden contener `/` en EDMX XML, por lo que SmartTable no puede auto-bindear al path correcto. | Medio — impide usar SmartTable estándar | Implementado | Se usó SmartFilterBar standalone + `sap.ui.table.Table` existente. El controlador conecta eventos de filtro manualmente vía `getSmartFilter().getFilter()`. |
| R02 | G4 (documentación) | Documentación de G4 obsoleta: describía un problema de servidor que ya fue resuelto en F6.1. El servidor es 100% OData v4 $batch-compliant. El `created()` timeout es un quirk de cliente UI5. | Bajo — no hay cambio de código requerido | Implementado | Documentación actualizada. Tests agregados para Content-ID formato SAPUI5 (0.0/1.0). |

---

# Mejoras

| ID | Detectado en | Descripción | Prioridad | Estado | Observaciones |
| -- | ------------ | ----------- | --------- | ------ | ------------- |

---

# Refactorizaciones

| ID | Detectado en | Descripción | Motivo | Estado |
| -- | ------------ | ----------- | ------ | ------ |

---

# Deuda Técnica

| ID | Detectado en | Descripción | Impacto | Estado |
| -- | ------------ | ----------- | ------- | ------ |

---

# Investigaciones Futuras

| ID | Detectado en | Tema | Motivo | Estado |
| -- | ------------ | ---- | ------ | ------ |

---

# Decisiones Arquitectónicas Pendientes

| ID | Tema | Motivo | Estado |
| -- | ---- | ------ | ------ |

---

# Registro de Resoluciones

Cada vez que un elemento cambie de estado debe registrarse aquí.

| Fecha | ID | Acción realizada |
| ----- | -- | ---------------- |
| 2026-07-17 | — | G3 completada. i18n.properties creado con 47 claves. Modelo i18n agregado a manifest.json. Strings reemplazados en App, Finance, InvoiceList, InvoiceDetail, CustomerList, CustomerDetail, PaymentList. ui5lint sin errores. |
| 2026-07-17 | R02 | G4 (documentación): detectada documentación obsoleta. El servidor ya es $batch-compliant desde F6.1. Se actualiza G4 para reflejar estado real, se agregan tests de integración para Content-ID formato SAPUI5 (0.0/1.0). |
| 2026-07-17 | — | G5 completada. Fragmentos InvoiceCreate, InvoiceEdit, CustomerCreate creados como diálogos modulares. InvoiceList.controller.js extendido con onCreateInvoice, onEditInvoice, onDeleteInvoice. CustomerList.controller.js extendido con onCreateCustomer. i18n.properties actualizado con 21 nuevas claves CRUD. Botones agregados en headerContent de ambas vistas. ui5lint sin errores (0/0). Server tests 166/166 sin regresión. |

---

# Cierre de la iniciativa

Antes de cerrar esta iniciativa se debe revisar completamente este documento.

Todos los elementos deben terminar en uno de estos estados:

* Implementado
* Descartado
* Movido a una iniciativa futura

No puede existir ningún elemento en estado "Pendiente" cuando la iniciativa sea declarada finalizada.
