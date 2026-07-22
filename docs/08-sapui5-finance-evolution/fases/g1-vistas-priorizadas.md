# G1 — Vistas Priorizadas: CustomerDetail y PaymentList

> **Fase:** G1 · **Esfuerzo:** Bajo · **Estado:** 📋 Pendiente
> **Depende de:** F4 (InvoiceList, InvoiceDetail, CustomerList, routing base).
> **Actualiza:** `webapp/manifest.json`, `webapp/view/CustomerList.view.xml`, `webapp/controller/CustomerList.controller.js`, `webapp/view/Finance.view.xml`
> **Crea:** `webapp/view/CustomerDetail.view.xml`, `webapp/controller/CustomerDetail.controller.js`, `webapp/view/PaymentList.view.xml`, `webapp/controller/PaymentList.controller.js`

---

## 0. Objetivo

Completar las vistas de las tres entidades priorizadas en F4 añadiendo el detalle de cliente y la lista de pagos, cerrando el ciclo de navegación básico del ecosistema finance en SAPUI5.

---

## 1. Decisiones técnicas

### 1.1 CustomerDetail con `$expand=invoices`

Sigue el mismo patrón que InvoiceDetail:
- `bindElement` con `$expand`: el controlador expande `invoices` al navegar.
- La vista muestra cabecera del cliente + tabla de facturas asociadas.

### 1.2 PaymentList con `$expand=invoice`

Análogo a InvoiceList:
- `sap.ui.table.Table` bindeada a `/finance/payment-odata`.
- Columnas: ID, Factura (expandida), Importe, Método, Fecha.
- Navegación a detalle de factura al seleccionar (reutiliza ruta `invoiceDetail` existente).

### 1.3 CustomerList con selección

CustomerList actual no tiene `rowSelectionChange`. G1 agrega navegación a `customerDetail`.

---

## 2. Cambios detallados

### 2.1 Modificar `webapp/manifest.json`

Agregar rutas y targets:

```json
"routes": [
    // ... rutas existentes ...
    {
        "pattern": "finance/customer-odata/{customerId}",
        "name": "customerDetail",
        "target": ["customerDetail"]
    },
    {
        "pattern": "finance/payment-odata",
        "name": "paymentList",
        "target": ["paymentList"]
    }
],
"targets": {
    // ... targets existentes ...
    "customerDetail": {
        "type": "View",
        "name": "CustomerDetail",
        "controlAggregation": "pages"
    },
    "paymentList": {
        "type": "View",
        "name": "PaymentList",
        "controlAggregation": "pages"
    }
}
```

### 2.2 Crear `webapp/view/CustomerDetail.view.xml`

```xml
<mvc:View
    controllerName="ui5.odata.demo.controller.CustomerDetail"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:core="sap.ui.core"
    xmlns:f="sap.ui.layout.form">

    <Page title="Detalle de Cliente" showNavButton="true" navButtonPress=".onNavBack">
        <content>
            <f:Form editable="false">
                <f:title><core:Title text="Datos del Cliente"/></f:title>
                <f:layout><f:ResponsiveGridLayout/></f:layout>
                <f:formContainers>
                    <f:FormContainer>
                        <f:formElements>
                            <f:FormElement label="ID">
                                <f:fields><Text text="{id}"/></f:fields>
                            </f:FormElement>
                            <f:FormElement label="Nombre">
                                <f:fields><Text text="{nombre}"/></f:fields>
                            </f:FormElement>
                            <f:FormElement label="País">
                                <f:fields><Text text="{pais}"/></f:fields>
                            </f:FormElement>
                        </f:formElements>
                    </f:FormContainer>
                </f:formContainers>
            </f:Form>

            <Panel headerText="Facturas del Cliente">
                <Table items="{invoices}">
                    <columns>
                        <Column><Label text="ID"/></Column>
                        <Column><Label text="Importe"/></Column>
                        <Column><Label text="Estado"/></Column>
                        <Column><Label text="Fecha"/></Column>
                    </columns>
                    <items>
                        <ColumnListItem>
                            <cells>
                                <Text text="{id}"/>
                                <ObjectNumber number="{importe}" unit="{moneda}"/>
                                <Text text="{estado}"/>
                                <Text text="{fecha}"/>
                            </cells>
                        </ColumnListItem>
                    </items>
                </Table>
            </Panel>
        </content>
    </Page>
</mvc:View>
```

### 2.3 Crear `webapp/controller/CustomerDetail.controller.js`

```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ui5.odata.demo.controller.CustomerDetail", {

        onInit: function () {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("customerDetail").attachPatternMatched(
                this._onRouteMatched, this
            );
        },

        _onRouteMatched: function (oEvent) {
            var sCustomerId = oEvent.getParameter("arguments").customerId;
            this.getView().bindElement({
                path: "/finance/customer-odata/" + sCustomerId,
                parameters: {
                    $expand: {
                        invoices: true
                    }
                }
            });
        },

        onNavBack: function () {
            this.oRouter.navTo("customerList");
        }
    });
});
```

### 2.4 Crear `webapp/view/PaymentList.view.xml`

```xml
<mvc:View
    controllerName="ui5.odata.demo.controller.PaymentList"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:table="sap.ui.table">

    <Page title="Pagos (Payment)">
        <content>
            <table:Table id="tblPayments"
                rows="{/finance/payment-odata}"
                threshold="10"
                enableBusyIndicator="true"
                selectionMode="Single"
                selectionBehavior="Row">
                <table:columns>
                    <table:Column>
                        <Label text="ID"/>
                        <table:template><Text text="{id}"/></table:template>
                    </table:Column>
                    <table:Column>
                        <Label text="Factura"/>
                        <table:template><Text text="{invoice/id}"/></table:template>
                    </table:Column>
                    <table:Column>
                        <Label text="Importe"/>
                        <table:template><ObjectNumber number="{importe}"/></table:template>
                    </table:Column>
                    <table:Column>
                        <Label text="Método"/>
                        <table:template><Text text="{metodo}"/></table:template>
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

### 2.5 Crear `webapp/controller/PaymentList.controller.js`

```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ui5.odata.demo.controller.PaymentList", {

        onInit: function () {
            this.oRouter = this.getOwnerComponent().getRouter();
        }
    });
});
```

### 2.6 Modificar `webapp/view/CustomerList.view.xml`

Agregar `rowSelectionChange=".onCustomerSelect"` a la tabla `tblCustomers`.

### 2.7 Modificar `webapp/controller/CustomerList.controller.js`

Agregar método `onCustomerSelect` que navega a `customerDetail` con el ID del cliente seleccionado.

### 2.8 Modificar `webapp/view/Finance.view.xml`

Agregar `ActionListItem` para `Payment` con `customData` `entityName="payment"`.

---

## 3. Archivos afectados

| Archivo | Acción |
|---|---|
| `webapp/manifest.json` | **MODIFICAR** — rutas `customerDetail`, `paymentList` + targets |
| `webapp/view/CustomerDetail.view.xml` | **CREAR** — detalle de cliente con `$expand=invoices` |
| `webapp/controller/CustomerDetail.controller.js` | **CREAR** — `bindElement` con expand |
| `webapp/view/PaymentList.view.xml` | **CREAR** — lista de pagos |
| `webapp/controller/PaymentList.controller.js` | **CREAR** — controlador base |
| `webapp/view/CustomerList.view.xml` | **MODIFICAR** — agregar `rowSelectionChange` |
| `webapp/controller/CustomerList.controller.js` | **MODIFICAR** — agregar `onCustomerSelect` |
| `webapp/view/Finance.view.xml` | **MODIFICAR** — agregar item Payment |

---

## 4. Criterios de aceptación

- [ ] `ui5lint` sin errores.
- [ ] Al seleccionar un cliente en CustomerList, navega a CustomerDetail.
- [ ] CustomerDetail muestra datos del cliente + facturas expandidas.
- [ ] PaymentList visible con datos reales.
- [ ] PaymentList muestra columna `invoice/id` expandida.
- [ ] Navegación hacia atrás desde CustomerDetail funciona.
- [ ] Nuevo item "Pagos (Payment)" en Finance.view.xml navega a PaymentList.

---

## 5. Dependencias

| Dependencia | Detalle |
|---|---|
| F4 | CustomerList, InvoiceList, InvoiceDetail existentes y funcionales |
| Servidor corriendo | `pnpm dev` en `servidor-odata` |
| UI5 server | `pnpm serve` en `ui5-odata-demo` |
| Playwright skill | Cargar `skill playwright-testing` antes de validación visual |

### Validación con Playwright

Antes de declarar G1 como completada, cargar la skill `playwright-testing` y
ejecutar las validaciones de navegación:

- CustomerList → CustomerDetail con `$expand=invoices`
- PaymentList con `$expand=invoice`
- Finance → PaymentList
- Navegación inversa (botón "Atrás") desde CustomerDetail

---

## 6. Siguiente fase

➡️ [`g4-batch-changeset.md`](g4-batch-changeset.md) — Corrección de `$batch` en el servidor.
