# F4 — Vistas Detalladas Finance en SAPUI5

> **Fase:** F4 · **Esfuerzo:** Medio-Alto · **Estado:** 📋 Pendiente
> **Depende de:** F3.
> **Crea:** Múltiples vistas y controladores para entidades finance.

---

## 0. Objetivo

Implementar vistas de listado y detalle para las entidades finance más representativas,
aprovechando las capacidades de `$expand` del servidor OData para navegar entre entidades
relacionadas.

No se crean vistas para las 8 entidades en esta fase. Se priorizan las que aportan mayor
valor de validación:

| Prioridad | Entidad | Why |
|-----------|---------|-----|
| 1 | Invoice | Entidad central (relacionada con company, customer, items, payments). |
| 2 | Customer | Navegación `$expand=invoices` |
| 3 | Payment | Navegación `$expand=invoice` |

---

## 1. Decisiones técnicas

### 1.1 Binding declarativo con `$expand`

SAPUI5 ODataModel v4 resuelve automáticamente las propiedades expandidas como si fueran
propiedades planas del modelo. No se necesita lógica adicional para acceder a
`{customer/nombre}` o `{company/nombre}` desde un contexto de factura.

### 1.2 Navegación por routing con parámetros

Se agregan rutas parametrizadas al router SAPUI5:

```
#/finance/invoice-odata          → lista de facturas
#/finance/invoice-odata/I00001   → detalle de factura
#/finance/customer-odata         → lista de clientes
```

### 1.3 Misma estrategia de escritura

Se mantiene `groupId="$direct"` para writes (POST/PATCH/DELETE planos).

---

## 2. Cambios detallados

### 2.1 Modificar `webapp/manifest.json`

Agregar nuevas rutas y targets al routing existente:

```json
"routes": [
    {
        "pattern": "",
        "name": "demo",
        "target": ["demo"]
    },
    {
        "pattern": "finance",
        "name": "finance",
        "target": ["finance"]
    },
    {
        "pattern": "finance/invoice-odata",
        "name": "invoiceList",
        "target": ["invoiceList"]
    },
    {
        "pattern": "finance/invoice-odata/{invoiceId}",
        "name": "invoiceDetail",
        "target": ["invoiceDetail"]
    },
    {
        "pattern": "finance/customer-odata",
        "name": "customerList",
        "target": ["customerList"]
    }
],
"targets": {
    "demo": { "type": "View", "name": "App" },
    "finance": { "type": "View", "name": "Finance" },
    "invoiceList": { "type": "View", "name": "InvoiceList" },
    "invoiceDetail": { "type": "View", "name": "InvoiceDetail" },
    "customerList": { "type": "View", "name": "CustomerList" }
}
```

### 2.2 Crear `webapp/view/InvoiceList.view.xml`

```xml
<mvc:View
    controllerName="ui5.odata.demo.controller.InvoiceList"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:table="sap.ui.table">

    <Page title="Facturas (Invoice)">
        <content>
            <table:Table id="tblInvoices"
                rows="{/finance/invoice-odata}"
                threshold="10"
                enableBusyIndicator="true"
                selectionMode="Single"
                selectionBehavior="Row"
                rowSelectionChange=".onInvoiceSelect">
                <table:columns>
                    <table:Column>
                        <Label text="ID"/>
                        <table:template><Text text="{id}"/></table:template>
                    </table:Column>
                    <table:Column>
                        <Label text="Cliente"/>
                        <table:template><Text text="{customer/nombre}"/></table:template>
                    </table:Column>
                    <table:Column>
                        <Label text="Importe"/>
                        <table:template>
                            <ObjectNumber number="{importe}" unit="{moneda}"/>
                        </table:template>
                    </table:Column>
                    <table:Column>
                        <Label text="Estado"/>
                        <table:template>
                            <ObjectStatus state="{= ${estado} === 'PAGADA' ? 'Success' : ${estado} === 'VENCIDA' ? 'Error' : 'Warning'}" text="{estado}"/>
                        </table:template>
                    </table:Column>
                    <table:Column>
                        <Label text="Fecha"/>
                        <table:template><Text text="{fecha}"/></table:template>
                    </table:Column>
                </table:columns>
            </table:Table>
        </content>
    </Page>
</mvc:View>
```

**Nota sobre bindings:** SAPUI5 ODataModel v4 resuelve `{customer/nombre}` automáticamente
porque la entidad Invoice tiene una NavigationProperty `customer` definida en el `$metadata`.
El servidor debe incluir `$expand=customer` en la request — esto se configura como binding
parameter en el controlador, no en la vista.

### 2.3 Crear `webapp/controller/InvoiceList.controller.js`

```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ui5.odata.demo.controller.InvoiceList", {

        onInit: function () {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oModel = this.getOwnerComponent().getModel();
        },

        onInvoiceSelect: function (oEvent) {
            var oCtx = oEvent.getParameter("rowContext");
            if (!oCtx) return;
            var sId = oCtx.getProperty("id");
            this.oRouter.navTo("invoiceDetail", {
                invoiceId: sId
            });
        }
    });
});
```

### 2.4 Crear `webapp/view/InvoiceDetail.view.xml`

Vista de detalle que muestra la factura con `$expand=customer,company,items($expand=glAccount)`:

```xml
<mvc:View
    controllerName="ui5.odata.demo.controller.InvoiceDetail"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:f="sap.ui.layout.form">

    <Page title="Detalle de Factura" showNavButton="true" navButtonPress=".onNavBack">
        <content>
            <f:Form editable="false">
                <f:title><core:Title text="Cabecera"/></f:title>
                <f:layout><f:ResponsiveGridLayout/></f:layout>
                <f:formContainers>
                    <f:FormContainer>
                        <f:formElements>
                            <f:FormElement label="ID">
                                <f:fields><Text text="{id}"/></f:fields>
                            </f:FormElement>
                            <f:FormElement label="Cliente">
                                <f:fields><Text text="{customer/nombre}"/></f:fields>
                            </f:FormElement>
                            <f:FormElement label="Sociedad">
                                <f:fields><Text text="{company/nombre}"/></f:fields>
                            </f:FormElement>
                            <f:FormElement label="Importe">
                                <f:fields><ObjectNumber number="{importe}" unit="{moneda}"/></f:fields>
                            </f:FormElement>
                            <f:FormElement label="Estado">
                                <f:fields><Text text="{estado}"/></f:fields>
                            </f:FormElement>
                            <f:FormElement label="Fecha">
                                <f:fields><Text text="{fecha}"/></f:fields>
                            </f:FormElement>
                        </f:formElements>
                    </f:FormContainer>
                </f:formContainers>
            </f:Form>

            <Panel headerText="Líneas (Items)">
                <Table items="{items}">
                    <columns>
                        <Column><Label text="Material"/></Column>
                        <Column><Label text="Cantidad"/></Column>
                        <Column><Label text="Importe"/></Column>
                        <Column><Label text="Cuenta Mayor"/></Column>
                    </columns>
                    <items>
                        <ColumnListItem>
                            <cells>
                                <Text text="{material}"/>
                                <Text text="{cantidad}"/>
                                <ObjectNumber number="{importe}"/>
                                <Text text="{glAccount/nombre}"/>
                            </cells>
                        </ColumnListItem>
                    </items>
                </Table>
            </Panel>
        </content>
    </Page>
</mvc:View>
```

### 2.5 Crear `webapp/controller/InvoiceDetail.controller.js`

```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ui5.odata.demo.controller.InvoiceDetail", {

        onInit: function () {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("invoiceDetail").attachPatternMatched(
                this._onRouteMatched, this
            );
        },

        _onRouteMatched: function (oEvent) {
            var sInvoiceId = oEvent.getParameter("arguments").invoiceId;
            this.getView().bindElement({
                path: "/finance/invoice-odata/" + sInvoiceId,
                parameters: {
                    $expand: {
                        customer: true,
                        company: true,
                        items: {
                            $expand: { glAccount: true }
                        }
                    }
                }
            });
        },

        onNavBack: function () {
            this.oRouter.navTo("invoiceList");
        }
    });
});
```

### 2.6 Crear `webapp/view/CustomerList.view.xml`

Análogo a InvoiceList pero para `customer-odata`:

- Columnas: ID, nombre, país
- Navegación a detalle con `$expand=invoices`

### 2.7 Crear `webapp/controller/CustomerList.controller.js`

Análogo a InvoiceList.controller pero navegando a ruta de clientes.

### 2.8 Modificar `webapp/controller/Finance.controller.js`

Agregar navegación a las listas de entidades:

```javascript
onEntityPress: function (oEvent) {
    var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
    var sEntity = oItem.data("entityName");
    this.oRouter.navTo(sEntity + "List");
}
```

---

## 3. Archivos afectados

| Archivo | Acción |
|---|---|
| `webapp/manifest.json` | **MODIFICAR** — agregar rutas invoiceList, invoiceDetail, customerList |
| `webapp/view/InvoiceList.view.xml` | **CREAR** — lista de facturas con expand a customer |
| `webapp/controller/InvoiceList.controller.js` | **CREAR** — lógica de selección y navegación |
| `webapp/view/InvoiceDetail.view.xml` | **CREAR** — detalle con expand a customer, company, items, glAccount |
| `webapp/controller/InvoiceDetail.controller.js` | **CREAR** — bindElement con $expand |
| `webapp/view/CustomerList.view.xml` | **CREAR** — lista de clientes |
| `webapp/controller/CustomerList.controller.js` | **CREAR** — lógica de navegación |
| `webapp/controller/Finance.controller.js` | **MODIFICAR** — agregar navegación a listas |

---

## 4. Criterios de aceptación

- [ ] Lista de facturas visible con datos reales.
- [ ] Las columnas `customer/nombre` y `company/nombre` se resuelven correctamente (expanden automáticamente).
- [ ] Al seleccionar una factura, navega al detalle.
- [ ] Detalle de factura muestra cabecera + líneas con cuenta mayor expandida.
- [ ] Lista de clientes visible.
- [ ] Navegación hacia atrás funciona.
- [ ] `ui5lint` sin errores.

---

## 5. Validación con Playwright

Antes de dar por cerrada la fase, se recomienda ejecutar una validación con Playwright
para verificar que las vistas cargan datos reales sin errores de consola:

```javascript
// tests/validate-finance.mjs (opcional)
await page.goto("http://localhost:8080/#/finance/invoice-odata");
await page.waitForSelector(".sapUiTableRow");  // esperar filas de tabla
const consoleErrors = await page.evaluate(() => window.__suite?.results);
// verificar sin errores
```

---

## 6. Siguientes pasos

Una vez completadas las fases F0–F4, se debe:

1. Ejecutar `pnpm test` en el servidor.
2. Ejecutar `ui5lint` en la app SAPUI5.
3. Verificar navegación completa Demo ↔ Finance.
4. Documentar cualquier ajuste necesario.
5. Proceder con PR a `master`.

---

## 7. Futuras mejoras (post-F4, fuera de alcance)

- Corregir `$batch` con changeset en el servidor para habilitar `updateGroupId="changes"`.
- Agregar SmartFilterBar para filtros avanzados.
- Agregar vistas para supplier, glaccount, supplierinvoice, invoiceitem, payment.
- Agregar operaciones CRUD desde las vistas (crear/editar facturas).
- Internacionalización (i18n).
- Tema Fiori (sap_horizon) — ya configurado.
