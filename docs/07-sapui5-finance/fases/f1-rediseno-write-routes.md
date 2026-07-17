# F1 — Refactor del Shared Kernel: Write Routes Genérico

> **Fase:** F1 · **Esfuerzo:** Medio · **Estado:** 📋 Pendiente
> **Depende de:** F0.
> **Actualiza:** `src/common/service/odata/odata-write.routes.ts`, `src/common/service/odata/odata.service.ts`
> **Crea:** `src/common/service/odata/odata-registration.interface.ts`

---

## 0. Objetivo

Eliminar los imports directos a servicios de dominio dentro del Shared Kernel, reemplazándolos por un mecanismo de inyección de dependencias basado en el patrón **Domain Registration Object**. El kernel debe quedar completamente agnóstico a qué dominios existen.

---

## 1. Cambios detallados

### 1.1 Crear interfaz `DomainRegistration`

Nuevo archivo: `src/common/service/odata/odata-registration.interface.ts`

```typescript
import { ODataControler } from "@phrasecode/odata";
import { WriteResult } from "./odata-write.service.js";

export interface DomainWriteService {
    create(data: unknown): Promise<WriteResult>;
    update(id: string | number, data: unknown): Promise<WriteResult>;
}

export interface DomainRegistration {
    model: { new (...args: unknown[]): unknown };
    controller: ODataControler;
    writeService?: DomainWriteService;
}
```

**Nota:** `update(id: string | number)` — se cambia de `number` a `string | number` para
soportar tanto las PK numéricas de demo (product, category) como las PK string de finance
(company, customer, etc.).

### 1.2 Modificar `odata-write.routes.ts`

**Eliminar:**
```typescript
import { productService } from "../../../core/demo/product/service/product.service.js";
import { categoryService } from "../../../core/demo/category/service/category.service.js";

const modelServices: Record<string, DomainWriteService> = {
    ProductOData: productService,
    CategoryOData: categoryService,
};
```

**Modificar la firma de `registerWriteRoutes`:**
```typescript
export function registerWriteRoutes(
    router: Router,
    controllers: ODataControler[],
    modelServices: Record<string, DomainWriteService>
): void {
```

El resto de la función permanece igual: itera sobre `controllers`, busca `modelServices[modelName]`,
y responde 404 si no hay service registrado para ese modelo. La única diferencia es que
`modelServices` ahora es un parámetro.

### 1.3 Modificar `odata.service.ts`

**Importar desde `core/main.ts` en lugar de imports individuales:**
```typescript
import { domainRegistrations } from "../../../core/main.js";
```

**Construir controllers y services a partir del registro:**
```typescript
const controllers: ODataControler[] = [];
const services: Record<string, DomainWriteService> = {};

for (const reg of domainRegistrations) {
    controllers.push(reg.controller);
    const modelName = reg.controller.getBaseModel().getModelName();
    if (reg.writeService) {
        services[modelName] = reg.writeService;
    }
}
```

**Pasar services a `registerWriteRoutes`:**
```typescript
registerWriteRoutes(oDataExpressApp, controllers, services);
```

---

## 2. Archivos afectados

| Archivo | Acción |
|---|---|
| `src/common/service/odata/odata-registration.interface.ts` | **CREAR** — interfaz `DomainRegistration` y `DomainWriteService` |
| `src/common/service/odata/odata-write.routes.ts` | **MODIFICAR** — eliminar imports a core, cambiar firma, `id: string \| number` |
| `src/common/service/odata/odata.service.ts` | **MODIFICAR** — consumir `domainRegistrations` en lugar de imports individuales |
| `src/common/exception/json-validator.exception.ts` | sin cambios (ya usado) |
| `src/common/service/odata/odata-write.service.ts` | sin cambios |

---

## 3. Criterios de aceptación

- [ ] `pnpm test` en verde (sin regresión).
- [ ] `tsc --build` sin errores nuevos.
- [ ] `registerWriteRoutes` acepta `Record<string, DomainWriteService>` como parámetro.
- [ ] `odata-write.routes.ts` sin imports a `core/`.
- [ ] `odata.service.ts` solo importa `core/main.js` (no imports individuales por dominio).
- [ ] `odata-registration.interface.ts` creada con `DomainWriteService.update(id: string | number)`.

---

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cambiar `id: number` a `id: string \| number` rompe la tipificación | Todos los services de demo usan `number` internamente, que es asignable a `string \| number`. Finance usa `string`. No hay pérdida de tipo. |
| `domainRegistrations` aún no exportado desde `core/main.ts` | Esta fase solo prepara el kernel. `core/main.ts` se actualiza en F2. Mientras tanto, se pasa un map vacío o el map hardcodeado temporal. |

---

## 5. Dependencia con F2

F1 hace al kernel capaz de recibir services como parámetro, pero F2 es quien realmente construye
el `domainRegistrations[]` y hace que los writes de finance funcionen. Entre F1 y F2,
se puede pasar el map hardcodeado actual como valor temporal mientras F2 se completa.

---

## 6. Siguiente fase

➡️ [`f2-exports-core-main.md`](f2-exports-core-main.md) — Refactor de barriales de dominio y composición en `core/main.ts`.
