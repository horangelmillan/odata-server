# F3 — Vista Base Finance en SAPUI5

> **Fase:** F3 · **Esfuerzo:** Medio · **Estado:** 📋 Pendiente
> **Depende de:** F2 (writes finance habilitados).
> **Actualiza:** `webapp/manifest.json`, `webapp/view/App.view.xml`, `webapp/controller/App.controller.js`
> **Crea:** `webapp/view/Finance.view.xml`, `webapp/controller/Finance.controller.js`

---

## 0. Objetivo

Agregar una vista base **Finance** en la aplicación SAPUI5, con navegación entre el dominio
Demo (existente) y el dominio Finance (nuevo), y un listado seleccionable de las 8 entidades
financieras.

Todo el código SAPUI5 se escribe en JavaScript plano (estilo SAPUI5 estándar), sin
frameworks adicionales.

---

## 1. Decisiones técnicas

### 1.1 Un solo modelo OData

No se crea un segundo `ODataModel`. El modelo `""` existente (apuntando a `/odata/`) sirve
para bindear tanto `/product-odata` como `/finance/invoice-odata` porque ambas viven bajo
el mismo servicio OData.

Configuración actual en `manifest.json`:
```json
"models": {
    "": {
        "dataSource": "main",
        "type": "sap.ui.model.odata.v4.ODataModel",
        "settings": {
            "operationMode": "Server",
            "groupId": "$direct",
            "updateGroupId": "changes"
        }
    }
}
```

### 1.2 Routing con `sap.m.routing.Router`

Se configura el router estándar de SAPUI5 para navegar entre las vistas Demo (test bench
existente) y Finance (nueva). Esto permite URLs con hash del tipo:

- `#/demo` — test bench actual
- `#/finance` — selector de entidad finance
- `#/finance/invoice-odata` — lista de facturas (F4)

### 1.3 groupId="$direct" para writes

Se mantiene la configuración actual de `groupId="$direct"` como workaround mientras el
servidor no soporte correctamente changesets `$batch`.

---

## 2. Cambios detallados

### 2.1 Modificar `webapp/manifest.json`

Agregar `sap.ui5/routing`:

```json
"sap.ui5": {
    "routing": {
        "config": {
            "routerClass": "sap.m.routing.Router",
            "viewType": "XML",
            "viewPath": "ui5.odata.demo.view",
            "controlId": "app",
            "controlAggregation": "pages",
            "clearControlAggregation": true,
            "async": true
        },
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
            }
        ],
        "targets": {
            "demo": {
                "type": "View",
                "name": "App",
                "controlAggregation": "pages"
            },
            "finance": {
                "type": "View",
                "name": "Finance",
                "controlAggregation": "pages"
            }
        }
    }
}
```

**Nota:** La vista `App` existente pasa a llamarse vía routing como `demo`. La nueva vista
`Finance` se carga al navegar a `#/finance`.

### 2.2 Modificar `webapp/view/App.view.xml`

Agregar un `IconTabBar` o botones de navegación en el encabezado para alternar entre
Demo y Finance:

```xml
<headerContent>
    <Button text="Demo" press=".onNavToDemo" type="Emphasized"/>
    <Button text="Finance" press=".onNavToFinance"/>
    <!-- botones existentes: Run all tests, Reset log -->
    <Button id="btnRun" text="Run all tests" press=".onRunAll"/>
    <Button id="btnReset" text="Reset log" press=".onResetLog"/>
</headerContent>
```

### 2.3 Modificar `webapp/controller/App.controller.js`

Agregar handlers de navegación:

```javascript
onNavToDemo: function () {
    this.getOwnerComponent().getRouter().navTo("demo");
},

onNavToFinance: function () {
    this.getOwnerComponent().getRouter().navTo("finance");
},
```

### 2.4 Crear `webapp/view/Finance.view.xml`

Vista base con selector de entidad finance (comboBox, lista o tiles):

```xml
<mvc:View
    controllerName="ui5.odata.demo.controller.Finance"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:core="sap.ui.core">

    <Page title="Finance — Ecosistema S/4HANA">
        <headerContent>
            <Button text="Demo" press=".onNavToDemo"/>
            <Button text="Finance" press=".onNavToFinance" type="Emphasized"/>
        </headerContent>
        <content>
            <List id="entityList" items="{ path: '/finance/company-odata', parameters: { $top: 5 } }"
                  itemPress=".onEntityPress">
                <items>
                    <StandardListItem title="{nombre}" description="{id}"/>
                </items>
            </List>
        </content>
    </Page>
</mvc:View>
```

### 2.5 Crear `webapp/controller/Finance.controller.js`

```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ui5.odata.demo.controller.Finance", {

        onInit: function () {
            this.oRouter = this.getOwnerComponent().getRouter();
        },

        onNavToDemo: function () {
            this.oRouter.navTo("demo");
        },

        onNavToFinance: function () {
            this.oRouter.navTo("finance");
        },

        onEntityPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            // navegar a detalle (F4)
        }
    });
});
```

---

## 3. Archivos afectados

| Archivo | Acción |
|---|---|
| `webapp/manifest.json` | **MODIFICAR** — agregar routing (config, routes, targets) |
| `webapp/view/App.view.xml` | **MODIFICAR** — agregar botones Demo/Finance en header |
| `webapp/controller/App.controller.js` | **MODIFICAR** — agregar `onNavToDemo`, `onNavToFinance` |
| `webapp/view/Finance.view.xml` | **CREAR** — vista base con selector de entidad |
| `webapp/controller/Finance.controller.js` | **CREAR** — lógica de navegación |

---

## 4. Criterios de aceptación

- [ ] Al navegar a `#/finance` se muestra la vista Finance.
- [ ] La vista Demo sigue funcionando (test bench).
- [ ] Los botones Demo/Finance alternan correctamente entre vistas.
- [ ] `$metadata` del servidor incluye entidades finance (se verifica con `ui5lint`).
- [ ] Se muestran datos reales de `finance/company-odata` (u otra entidad).
- [ ] Sin errores de consola en SAPUI5.

---

## 5. Dependencias

| Dependencia | Detalle |
|---|---|
| F2 | Los writes finance deben estar habilitados para pruebas CRUD desde SAPUI5 |
| Servidor corriendo | `pnpm dev` en `servidor-odata` |
| UI5 server | `pnpm serve` en `ui5-odata-demo` |

---

## 6. Siguiente fase

➡️ [`f4-vistas-finance-detalladas.md`](f4-vistas-finance-detalladas.md) — Vistas detalladas de entidades finance.
