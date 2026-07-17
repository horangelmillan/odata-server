# 01 — Arquitectura Propuesta: Domain Registration Object

## 1. Problema arquitectónico detectado

### 1.1 Dependencia invertida en el Shared Kernel

El archivo `src/common/service/odata/odata-write.routes.ts` (perteneciente al Shared Kernel)
contiene imports directos a servicios del Domain Layer:

```typescript
// common/service/odata/odata-write.routes.ts — LÍNEA 7-8
import { productService } from "../../../core/demo/product/service/product.service.js";
import { categoryService } from "../../../core/demo/category/service/category.service.js";
```

Y un map hardcodeado de nombre de modelo a servicio:

```typescript
const modelServices: Record<string, DomainWriteService> = {
    ProductOData: productService,     // ← kernel conoce dominio concreto
    CategoryOData: categoryService,   // ← kernel conoce dominio concreto
};
```

### 1.2 Violaciones de principios

| Principio | Violación |
|---|---|
| **Domain-agnostic principle** (`docs/02-patrones/05-odata-module-pattern.md:5-7`) | El Shared Kernel debe ser infrastructura pura. Importar servicios de dominio lo contamina con conocimiento de negocio. |
| **Open/Closed Principle** | Agregar un nuevo dominio requiere modificar `odata-write.routes.ts` (abrir el kernel a modificación). |
| **Dependency Inversion** | El kernel depende de implementaciones concretas de dominio, no de abstracciones. |
| **Single Responsibility** | `odata-write.routes.ts` mezcla dos responsabilidades: definir rutas HTTP genéricas y conocer qué servicio corresponde a cada modelo. |

### 1.3 Contraste con el registro de controladores

El registro de controladores OData ya sigue el patrón correcto:

```typescript
// odata.service.ts — los controladores se pasan como parámetro
const odataControllers: ODataControler[] = [
    new ProductODataController(),
    new CategoryODataController(),
    new CompanyODataController(),
    // ...
];

new ExpressRouter(oDataExpressApp, {
    controllers: odataControllers,  // ← genérico: ExpressRouter no sabe qué dominios existen
    dataSource,
});
```

El `ExpressRouter` recibe un `ODataControler[]` y **no necesita conocer** qué dominios
específicos están registrados. El patrón para los servicios de escritura debe ser idéntico.

---

## 2. Solución propuesta: Domain Registration Object

### 2.1 Contrato (interfaz)

Se define una interfaz pública en el Shared Kernel que establece el contrato que cada
dominio debe cumplir para ser registrado:

```typescript
// common/service/odata/odata-registration.interface.ts (nuevo)
import { ODataControler } from "@phrasecode/odata";
import { WriteResult } from "./odata-write.service.js";

export interface DomainWriteService {
    create(data: unknown): Promise<WriteResult>;
    update(id: string | number, data: unknown): Promise<WriteResult>;
}

export interface DomainRegistration {
    model: { new (...args: unknown[]): unknown };  // clase del modelo OData
    controller: ODataControler;
    writeService?: DomainWriteService;  // opcional: solo si el dominio soporta escritura
}
```

### 2.2 Cada dominio exporta su registration

Cada `main.ts` de dominio pasa de exportar solo `{ Model, Controller }` a exportar
un objeto `DomainRegistration` completo:

```typescript
// core/finance/company/main.ts
import { CompanyOData } from "./model/company.odata.model.js";
import { CompanyODataController } from "./controller/company.odata.controller.js";
import { companyService } from "./service/company.service.js";

export { CompanyOData, CompanyODataController, companyService };

export const companyRegistration: DomainRegistration = {
    model: CompanyOData,
    controller: new CompanyODataController(),
    writeService: companyService,
};
```

### 2.3 Composición centralizada en `core/main.ts`

```typescript
// core/main.ts
import { productRegistration } from "./demo/product/main.js";
import { categoryRegistration } from "./demo/category/main.js";
import { companyRegistration } from "./finance/company/main.js";
import { customerRegistration } from "./finance/customer/main.js";
import { supplierRegistration } from "./finance/supplier/main.js";
// ... resto de dominios

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

### 2.4 El Shared Kernel itera genéricamente

```typescript
// odata.service.ts — ya no importa dominios individuales
import { domainRegistrations } from "../../../core/main.js";

// Construir arrays y maps a partir del registro único
const controllers = domainRegistrations.map(r => r.controller);
const services: Record<string, DomainWriteService> = {};
for (const reg of domainRegistrations) {
    const modelName = reg.controller.getBaseModel().getModelName();
    if (reg.writeService) {
        services[modelName] = reg.writeService;
    }
}

// Pasar services como parámetro a registerWriteRoutes
registerWriteRoutes(oDataExpressApp, controllers, services);
```

```typescript
// odata-write.routes.ts — completamente genérico
export function registerWriteRoutes(
    router: Router,
    controllers: ODataControler[],
    modelServices: Record<string, DomainWriteService>
): void {
    // ... mismo código, pero modelServices es parámetro
}
```

---

## 3. Diagrama de flujo

```
core/finance/company/main.ts
  └── export const companyRegistration: DomainRegistration
core/finance/customer/main.ts
  └── export const customerRegistration: DomainRegistration
...
      │
      ▼
core/main.ts
  └── export const domainRegistrations: DomainRegistration[]
      │
      ▼
common/service/odata/odata.service.ts
  ├── controllers = domainRegistrations.map(r => r.controller)
  ├── services = domainRegistrations.reduce(...)
  ├── new ExpressRouter(router, { controllers, dataSource })
  └── registerWriteRoutes(router, controllers, services)
      │
      ▼
common/service/odata/odata-write.routes.ts
  └── function(router, controllers, services)  // abstracto, sin imports a core
```

---

## 4. Beneficios

| Beneficio | Descripción |
|---|---|
| **Extensibilidad** | Nuevo dominio = crear carpeta + agregar línea en `core/main.ts`. |
| **Cero modificaciones al kernel** | `common/service/odata/` nunca se edita al agregar dominios. |
| **Consistencia** | Mismo patrón que el registro de controladores (array → parámetro). |
| **Testabilidad** | `registerWriteRoutes` acepta un map de servicios — puede testearse con mocks. |
| **Migración gradual** | Demo se refactoriza primero, finance se agrega después. |
| **Sin dependencias nuevas** | Solo TypeScript nativo, sin decoradores ni metaprogramación. |

---

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El `DomainWriteService.update(id)` usa `number` actualmente; finance usa `string` | Cambiar la interfaz a `id: string \| number`. Los services de dominio ya tipan correctamente su ID. |
| Refactorizar `main.ts` de product/category puede romper imports existentes | Los barriles actuales exportan `{ Model, Controller }` además del nuevo registration. Se mantiene compatibilidad hacia atrás. |
| `core/main.ts` crece con cada dominio | Es el punto de composición — es esperable y deseable. Si crece demasiado, se puede dividir por namespace. |

---

## 6. Criterios de aceptación del diseño

- [ ] `common/service/odata/odata-write.routes.ts` sin imports a `core/`.
- [ ] `common/service/odata/odata.service.ts` sin imports directos a dominios individuales (solo `core/main.ts`).
- [ ] `registerWriteRoutes` acepta `Record<string, DomainWriteService>` como tercer parámetro.
- [ ] `core/main.ts` exporta `domainRegistrations[]`.
- [ ] Cada dominio exporta un objeto `DomainRegistration`.
- [ ] `id: string | number` en la interfaz `DomainWriteService`.
