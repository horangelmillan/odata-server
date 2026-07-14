# 13 — Integración con SAPUI5 / OpenUI5

## 13.1 Configuración del Modelo OData v4 en SAPUI5

```javascript
// En el manifest.json de SAPUI5
{
    "sap.ui5": {
        "models": {
            "Products": {
                "type": "sap.ui.model.odata.v4.ODataModel",
                "settings": {
                    "synchronizationMode": "None",
                    "serviceUrl": "http://localhost:3000/odata/"
                }
            }
        }
    }
}
```

O programáticamente en Component.js / controller:

```javascript
sap.ui.define([
    "sap/ui/model/odata/v4/ODataModel"
], function (ODataModel) {
    "use strict";

    const oModel = new ODataModel({
        serviceUrl: "http://localhost:3000/odata/",
        synchronizationMode: "None",
        groupId: "$direct",
    });

    // Bind a list
    const oListBinding = oModel.bindList("/Products", undefined, undefined, undefined, {
        $$groupId: "$direct",
    });

    // Read data
    oListBinding.requestContexts().then(function (aContexts) {
        aContexts.forEach(function (oContext) {
            const oProduct = oContext.getObject();
            console.log(oProduct.nombre, oProduct.precio);
        });
    });
});
```

## 13.2 Bindings en Vistas XML

```xml
<mvc:View
    controllerName="myapp.controller.Products"
    xmlns="sap.m"
    xmlns:mvc="sap.ui.core.mvc">
    <Table
        id="productsTable"
        items="{
            path: '/Products',
            parameters: {
                $expand: 'category',
                $select: 'id,nombre,precio,categoria',
                $filter: 'precio gt 100',
                $orderby: 'nombre asc',
                $$groupId: '$direct'
            }
        }">
        <columns>
            <Column><Text text="Nombre"/></Column>
            <Column><Text text="Precio"/></Column>
            <Column><Text text="Categoría"/></Column>
        </columns>
        <items>
            <ColumnListItem>
                <cells>
                    <Text text="{nombre}"/>
                    <Text text="{precio}"/>
                    <Text text="{categoria}"/>
                </cells>
            </ColumnListItem>
        </items>
    </Table>
</mvc:View>
```

## 13.3 Smart Controls

```xml
<mvc:View
    xmlns="sap.m"
    xmlns:smartTable="sap.ui.comp.smarttable"
    xmlns:mvc="sap.ui.core.mvc">

    <smartTable:SmartTable
        id="smartProducts"
        entitySet="Products"
        smartFilterId="smartFilterBar"
        tableType="ResponsiveTable"
        useVariantManagement="false"
        useTablePersonalisation="false"
        persistencyKey="smartProducts"
        enableAutoBinding="true"
        beforeBinding="onBeforeBinding">
    </smartTable:SmartTable>
</mvc:View>
```

## 13.4 Filtros con Binding Parameters

```javascript
// Aplicar filtros dinámicos
onFilterProducts: function (sCategory) {
    const oModel = this.getView().getModel("Products");
    const oBinding = oModel.bindList("/Products", undefined, undefined, undefined, {
        $$groupId: "$direct",
    });

    oBinding.filter([
        new sap.ui.model.Filter({
            path: "categoria",
            operator: "EQ",
            value1: sCategory,
        }),
        new sap.ui.model.Filter({
            path: "precio",
            operator: "GT",
            value1: 50,
        }),
    ]);

    oBinding.requestContexts().then(function (aContexts) {
        // Procesar resultados filtrados
    });
}
```

## 13.5 Creación desde SAPUI5 (vía REST)

```javascript
// SAPUI5 crea un producto llamando a REST (NO OData)
sap.ui.define([
    "sap/ui/model/odata/v4/ODataModel"
], function (ODataModel) {
    const oModel = new ODataModel({ serviceUrl: "http://localhost:3000/odata/" });

    // Crear vía REST
    $.ajax({
        url: "http://localhost:3000/api/core/products",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            nombre: "Nuevo Producto",
            precio: 299.99,
            categoria: "Electrónica"
        }),
        success: function (response) {
            // Refrescar lista OData
            oModel.refresh("/Products");
        }
    });
});
```

## 13.6 Verificación de Endpoints

```
# 1. Verificar $metadata (base de todo binding SAPUI5)
curl http://localhost:3000/odata/$metadata

# 2. Verificar entity set
curl http://localhost:3000/odata/Products

# 3. Verificar filtros
curl "http://localhost:3000/odata/Products?$filter=precio gt 100"

# 4. Verificar select
curl "http://localhost:3000/odata/Products?$select=id,nombre,precio"

# 5. Verificar headers
curl -I http://localhost:3000/odata/Products
# Buscar: OData-Version: 4.0, Content-Type: application/json
```

## 13.7 Troubleshooting Común

| Problema | Causa | Solución |
|----------|-------|----------|
| `$metadata` vacío o 404 | Servidor OData no registrado | Verificar `ExpressRouter` en `odata.service.ts` |
| "No provider for service" | ServiceUrl incorrecta | Verificar URL base (sin `/Products`) |
| CORS error | OData-Version header no expuesto | Agregar `exposedHeaders: ["OData-Version"]` |
| Smart Table no carga | EntitySet no coincide | Verificar nombre exacto del EntitySet |
| Filtros no funcionan | Operador OData incorrecto | Usar `eq`, `gt`, `lt` (no `=`, `>`, `<`) |
| Binding "400 Bad Request" | Sintaxis OData inválida | Verificar caracteres especiales en URL (codificar) |
