# F2 — Refactor de Barriales: Domain Registration Objects + Composición en core/main.ts

> **Fase:** F2 · **Esfuerzo:** Medio · **Estado:** 📋 Pendiente
> **Depende de:** F1.
> **Actualiza:** `src/core/main.ts`, todos los `main.ts` de demo y finance.

---

## 0. Objetivo

Transformar cada dominio para que exporte un objeto `DomainRegistration` desde su `main.ts`,
y componer todos los registros en `src/core/main.ts` como un array único `domainRegistrations[]`.

Al completar esta fase, los writes del dominio finance estarán habilitados sin necesidad de
modificar ningún archivo del Shared Kernel.

---

## 1. Cambios detallados

### 1.1 Refactor de `src/core/demo/product/main.ts`

**Actual:**
```typescript
import { ProductOData } from "./model/product.odata.model.js";
import { ProductODataController } from "./controller/product.odata.controller.js";

export { ProductOData, ProductODataController };
```

**Nuevo:**
```typescript
import { ProductOData } from "./model/product.odata.model.js";
import { ProductODataController } from "./controller/product.odata.controller.js";
import { productService } from "./service/product.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { ProductOData, ProductODataController, productService };

export const productRegistration: DomainRegistration = {
    model: ProductOData,
    controller: new ProductODataController(),
    writeService: productService,
};
```

**Nota:** Los exports individuales se mantienen para no romper imports existentes que
puedan referenciar `ProductOData` o `ProductODataController` directamente. El nuevo
`productRegistration` es adicional.

### 1.2 Refactor de `src/core/demo/category/main.ts`

Análogo a product:

```typescript
import { CategoryOData } from "./model/category.odata.model.js";
import { CategoryODataController } from "./controller/category.odata.controller.js";
import { categoryService } from "./service/category.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { CategoryOData, CategoryODataController, categoryService };

export const categoryRegistration: DomainRegistration = {
    model: CategoryOData,
    controller: new CategoryODataController(),
    writeService: categoryService,
};
```

### 1.3 Refactor de los 8 dominios finance

Cada dominio finance (company, customer, supplier, glaccount, invoice, supplierinvoice,
invoiceitem, payment) debe exportar su registration object. Ejemplo para company:

```typescript
// src/core/finance/company/main.ts
import { CompanyOData } from "./model/company.odata.model.js";
import { CompanyODataController } from "./controller/company.odata.controller.js";
import { companyService } from "./service/company.service.js";
import type { DomainRegistration } from "../../../common/service/odata/odata-registration.interface.js";

export { CompanyOData, CompanyODataController, companyService };

export const companyRegistration: DomainRegistration = {
    model: CompanyOData,
    controller: new CompanyODataController(),
    writeService: companyService,
};
```

El patrón se repite exactamente para los 7 dominios restantes, con sus respectivos
modelos, controladores y servicios.

### 1.4 Refactor de `src/core/main.ts`

**Actual:**
```typescript
import { ProductOData, ProductODataController } from "./demo/product/main.js";
import { CategoryOData, CategoryODataController } from "./demo/category/main.js";

export { ProductOData, ProductODataController, CategoryOData, CategoryODataController };
```

**Nuevo:**
```typescript
import { productRegistration } from "./demo/product/main.js";
import { categoryRegistration } from "./demo/category/main.js";
import { companyRegistration } from "./finance/company/main.js";
import { customerRegistration } from "./finance/customer/main.js";
import { supplierRegistration } from "./finance/supplier/main.js";
import { glAccountRegistration } from "./finance/glaccount/main.js";
import { invoiceRegistration } from "./finance/invoice/main.js";
import { supplierInvoiceRegistration } from "./finance/supplierinvoice/main.js";
import { invoiceItemRegistration } from "./finance/invoiceitem/main.js";
import { paymentRegistration } from "./finance/payment/main.js";
import type { DomainRegistration } from "../common/service/odata/odata-registration.interface.js";

export const domainRegistrations: DomainRegistration[] = [
    productRegistration,
    categoryRegistration,
    companyRegistration,
    customerRegistration,
    supplierRegistration,
    glAccountRegistration,
    invoiceRegistration,
    supplierInvoiceRegistration,
    invoiceItemRegistration,
    paymentRegistration,
];
```

---

## 2. Archivos afectados

| Archivo | Acción |
|---|---|
| `src/core/main.ts` | **MODIFICAR** — reemplazar exports individuales por `domainRegistrations[]` |
| `src/core/demo/product/main.ts` | **MODIFICAR** — agregar export `productRegistration` |
| `src/core/demo/category/main.ts` | **MODIFICAR** — agregar export `categoryRegistration` |
| `src/core/finance/company/main.ts` | **MODIFICAR** — agregar export `companyRegistration` |
| `src/core/finance/customer/main.ts` | **MODIFICAR** — agregar export `customerRegistration` |
| `src/core/finance/supplier/main.ts` | **MODIFICAR** — agregar export `supplierRegistration` |
| `src/core/finance/glaccount/main.ts` | **MODIFICAR** — agregar export `glAccountRegistration` |
| `src/core/finance/invoice/main.ts` | **MODIFICAR** — agregar export `invoiceRegistration` |
| `src/core/finance/supplierinvoice/main.ts` | **MODIFICAR** — agregar export `supplierInvoiceRegistration` |
| `src/core/finance/invoiceitem/main.ts` | **MODIFICAR** — agregar export `invoiceItemRegistration` |
| `src/core/finance/payment/main.ts` | **MODIFICAR** — agregar export `paymentRegistration` |

---

## 3. Criterios de aceptación

- [ ] `pnpm test` en verde (sin regresión).
- [ ] `tsc --build` sin errores.
- [ ] `POST /odata/finance/company-odata` → 201 (crea una sociedad).
- [ ] `PATCH /odata/finance/invoice-odata/I00001` → 200 (actualiza factura).
- [ ] `DELETE /odata/finance/payment-odata/P00001` → 204 (elimina pago).
- [ ] Todos los writes de demo siguen funcionando (sin regresión).
- [ ] `core/main.ts` exporta `domainRegistrations` como array completo.

---

## 4. Orden de ejecución

1. Refactorizar `demo/product/main.ts` y verificar writes demo.
2. Refactorizar `demo/category/main.ts` y verificar writes demo.
3. Refactorizar los 8 `main.ts` de finance (uno por uno o en paralelo).
4. Refactorizar `core/main.ts`.
5. Ejecutar `pnpm test` completo.

El paso 1 y 2 pueden ejecutarse incluso antes de F1 (como preparación), porque los exports
individuales se mantienen y el registration es adicional. Sin embargo, el paso 4
(`core/main.ts`) requiere que F1 esté completa para que `odata.service.ts` pueda consumir
`domainRegistrations`.

---

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Los services finance lanzan `JSONValidatorException` igual que demo | Ya lo hacen — el handler en `odata-write.routes.ts` captura `JSONValidatorException` genéricamente. |
| PKs string pueden causar problemas en rutas DELETE/PATCH | El parámetro `:id` en Express es string por defecto. `odataWriteService.remove` ya usa `req.params.id` como string. Solo `Number(req.params.id)` en `updateHandler` debe cambiarse (se hace en F1). |

---

## 6. Siguiente fase

➡️ [`f3-vista-finance-base-sapui5.md`](f3-vista-finance-base-sapui5.md) — Vista base Finance en SAPUI5 con routing.
