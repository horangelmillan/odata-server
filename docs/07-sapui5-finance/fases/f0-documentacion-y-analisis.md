# F0 — Documentación y Análisis Arquitectónico

> **Fase:** F0 · **Esfuerzo:** Bajo · **Estado:** ✅ Completada
> **Depende de:** —
> **Entrega:** Documentación completa en `docs/07-sapui5-finance/`. Análisis del problema arquitectónico en `odata-write.routes.ts`. Validación de la alternativa de diseño (Domain Registration Object).

---

## 0. Objetivo

Documentar el análisis técnico completo necesario para integrar el dominio **finance** del servidor OData con la aplicación SAPUI5 de prueba, y proponer un rediseño arquitectónico que elimine el acoplamiento actual entre el Shared Kernel y los dominios.

No se modifica código de la aplicación. El resultado es exclusivamente documentación.

---

## 1. Investigación realizada

### 1.1 Documentación revisada

| Documento | Hallazgo principal |
|---|---|
| `docs/00-indice.md` | Estructura general del proyecto, ciclos anteriores. |
| `docs/02-patrones/05-odata-module-pattern.md` | El dominio debe ser agnóstico al protocolo. Shared kernel = infra pura. |
| `docs/04-sapui5-compat/13-sapui5-integration-guide.md` | Configuración de ODataModel v4, bindings, smart controls. |
| `docs/05-refactor-odata-as-domain/00-plan-maestro.md` | Decisión D3: OData en core/, common/ = shared kernel. |
| `docs/05-refactor-odata-as-domain/fases/f4-consolidar-shared-kernel-odata.md` | Nota explícita: `odata-write.routes.ts` mapea endpoint->service manualmente. |
| `docs/06-financial-eco/00-plan-maestro.md` | Decisión D8: namespace semántico demo/ y finance/ en rutas OData. |
| `docs/02-patrones/16-financial-module.md` | Documentación completa de las 8 entidades finance. |
| `docs/07-workflow/GIT_WORKFLOW.md` | Flujo Git del proyecto: ramas desde master, PR a master, una tarea = una rama. |

### 1.2 Código analizado

| Componente | Archivos clave |
|---|---|
| Shared Kernel OData | `src/common/service/odata/` (8 archivos) |
| Demo domain | `src/core/demo/product/`, `src/core/demo/category/` |
| Finance domain | `src/core/finance/{company,customer,supplier,glaccount,invoice,supplierinvoice,invoiceitem,payment}/` |
| Composición | `src/core/main.ts`, `src/main.ts` |
| SAPUI5 app | `ui5-odata-demo/webapp/` (manifest, view, controller, Component) |
| Middleware UI5 | `ui5-odata-demo/middleware/proxy-to-server.js`, `metadata-shim.js` (obsoleto) |

### 1.3 Codebase Memory consultado

- Arquitectura general del proyecto (658 nodos, 1110 aristas).
- Paquetes: `common` (107 nodos), `core` (28 nodos).
- Rutas registradas: incluye product-odata, category-odata, finance endpoints.
- Hotspots: `registerWriteRoutes`, `modelServices`, `validate`.

### 1.4 Context7 consultado

- SAPUI5 ODataModel v4: configuración en manifest.json, bindings, routing.
- OpenUI5: navegación con `sap.m.routing.Router`, bindings con `$expand`.
- Confirmación: un solo ODataModel sirve para múltiples entity sets del mismo servicio.

---

## 2. Hallazgos principales

### 2.1 El Shared Kernel conoce los dominios

`src/common/service/odata/odata-write.routes.ts` importa directamente servicios de dominio:

```typescript
import { productService } from "../../../core/demo/product/service/product.service.js";
import { categoryService } from "../../../core/demo/category/service/category.service.js";
```

Esto viola el principio de que el Shared Kernel debe ser infrastructura pura, sin conocimiento de dominios concretos. Ver `01-arquitectura-propuesta.md` para el análisis completo y la solución propuesta.

### 2.2 Los dominios finance no tienen writes habilitados

El map `modelServices` en `odata-write.routes.ts` solo contiene `ProductOData` y `CategoryOData`. Las 8 entidades finance no pueden ser creadas/editadas/eliminadas vía OData directo.

Además, la interfaz `DomainWriteService` usa `id: number`, pero las entidades finance usan `id: string` (ej: `C0001`, `I00001`).

### 2.3 SAPUI5 no tiene vistas finance

La aplicación SAPUI5 solo tiene una vista que trabaja con `product-odata` y `category-odata`. No existen vistas para las entidades finance.

### 2.4 El modelo OData único funciona para ambos dominios

El `manifest.json` de SAPUI5 define un solo modelo `""` apuntando a `/odata/`. Como todas las entidades (demo y finance) comparten el mismo servicio OData, no es necesario crear un segundo modelo.

### 2.5 El proxy-to-server ya reenvía todo

El middleware `proxy-to-server.js` reenvía cualquier ruta `/odata/*` al servidor real. Las entidades finance son accesibles desde SAPUI5 sin cambios en el proxy.

---

## 3. Decisiones arquitectónicas (F0)

| Decisión | Opción | Justificación |
|---|---|---|
| Modelo OData SAPUI5 | Un solo modelo `""` existente | Mismo serviceUrl para demo y finance. |
| Estrategia writes | `groupId="$direct"` | El `$batch` con changeset no funciona en el servidor (issue conocido). |
| Metadata | Usar `$metadata` dinámico del servidor | El servidor ya genera EDMX XML estándar con todas las entidades. |
| Registro de dominios | **Domain Registration Object** (Alternativa B) | Ver `01-arquitectura-propuesta.md`. |

---

## 4. Riesgos detectados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `DomainWriteService.update(id: number)` incompatible con finance (string IDs) | Los writes directos fallarían para finance | Cambiar interfaz a `id: string \| number` en F1. |
| Refactor de `main.ts` puede romper imports | Build/rotura temporal | Mantener exports anteriores además del nuevo registration. |
| `$batch` no funcional | Writes agrupados no disponibles | Usar `$direct` como workaround. Documentado para ciclo futuro. |

---

## 5. Documentación generada

| Archivo | Contenido |
|---|---|
| `docs/07-sapui5-finance/00-plan-maestro.md` | Visión global, fases, decisiones, criterios de aceptación. |
| `docs/07-sapui5-finance/01-arquitectura-propuesta.md` | Diseño del Domain Registration Object: interfaz, implementación, diagrama de flujo. |
| `docs/07-sapui5-finance/fases/f0-documentacion-y-analisis.md` | Esta fase: investigación, hallazgos, alcance. |
| `docs/07-sapui5-finance/fases/f1-rediseno-write-routes.md` | Plan de refactor del Shared Kernel. |
| `docs/07-sapui5-finance/fases/f2-exports-core-main.md` | Plan de refactor de barriales de dominio. |
| `docs/07-sapui5-finance/fases/f3-vista-finance-base-sapui5.md` | Plan de vista base Finance en SAPUI5. |
| `docs/07-sapui5-finance/fases/f4-vistas-finance-detalladas.md` | Plan de vistas detalladas en SAPUI5. |

---

## 6. Criterios de aceptación de F0

- [x] Análisis completo del estado actual del proyecto.
- [x] Identificación del problema arquitectónico en `odata-write.routes.ts`.
- [x] Propuesta de rediseño (Domain Registration Object) validada.
- [x] Documentación estructurada por fases en `docs/07-sapui5-finance/`.
- [x] Rama `docs/finance-ui5-integration-plan` creada desde `master`.
- [x] Índice principal actualizado (`docs/00-indice.md`).

---

## 7. Siguiente fase

➡️ [`f1-rediseno-write-routes.md`](f1-rediseno-write-routes.md) — Refactor del Shared Kernel para soportar el Domain Registration Object.
