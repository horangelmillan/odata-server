# 04 — Adaptación de Arquitectura: OData + Modular Monolith

## 4.1 Principios de Integración

La integración de OData v4 en la arquitectura Modular Monolith sigue los siguientes principios fundamentales:

1. **OData es opcional** — El endpoint OData es una vía de datos adicional que puede estar presente o no sin afectar el funcionamiento del sistema REST principal.
2. **OData es solo lectura** — El endpoint OData solo responde a peticiones GET. Las operaciones de escritura (POST, PUT, PATCH, DELETE) se gestionan exclusivamente a través de la API REST, siguiendo un patrón CQRS ligero.
3. **Sin dependencias de OData hacia los dominios** — La capa OData no debe importar ni depender de los módulos de negocio en `core/`. La relación de dependencia es unidireccional: los dominios no saben de la existencia de OData.
4. **Shared Kernel como contenedor** — Toda la infraestructura OData reside en el Shared Kernel (`common/service/odata/`), junto con el resto de la infraestructura transversal.

## 4.2 Ubicación de la Capa OData

```
src/common/service/odata/           # ← Capa OData en Shared Kernel
├── odata.service.ts                # Configura ExpressRouter de @phrasecode/odata
├── models/                         # Modelos @Table/@Column @phrasecode/odata
│   └── product.odata.model.ts
├── controllers/                    # Controladores OData (extienden ODataControler)
│   └── product.odata.controller.ts
└── helper/
    └── odata-utils.ts              # Utilidades compartidas
```

**Nota sobre los modelos OData**: `@phrasecode/odata` puede leer modelos Sequelize directamente, lo que elimina la necesidad de modelos OData duplicados en la mayoría de los casos. Solo se requiere un modelo OData independiente cuando se necesita exponer una vista SQL que no corresponde directamente a una tabla del modelo Sequelize.

## 4.3 Reglas de Dependencia (nuevas)

| Dependencia | Permitido | Prohibido |
|-------------|-----------|-----------|
| OData Controller | → modelo OData, → Sequelize raw query | → dominio core (`src/core/`) |
| Modelo OData | → `@phrasecode/odata` decorators | → REST service (`src/common/service/`) |
| `@phrasecode/odata` ExpressRouter | → `common/odata/controllers` | → `core/domains/` |

**Regla fundamental**: La capa OData solo puede importar del Shared Kernel o de librerías externas. Nunca debe importar de los dominios de negocio. Si un controlador OData necesita datos que están encapsulados en un servicio de dominio, debe consultar la base de datos directamente a través de Sequelize, no a través del servicio de dominio.

## 4.4 Flujo de Solicitudes

```
Cliente (SAPUI5)
  │
  ├── GET /odata/Products?$filter=...   →  @phrasecode/odata ExpressRouter
  │       │                                   → ODataController.get()
  │       │                                   → rawQueryable() / custom SQL
  │       │                                   → Response OData v4 JSON
  │
  └── POST/PUT/DELETE /api/core/products →  Express Router
          │                                   → ValidatorMiddleware
          │                                   → Controller → Service → Model
          │                                   → ApiResponse uniforme
```

El flujo diferencia claramente dos caminos de entrada:

- **Ruta OData** (`GET /odata/...`): Las peticiones llegan al ExpressRouter de `@phrasecode/odata`, que enruta al controlador OData correspondiente según el EntitySet. El controlador ejecuta la consulta OData traducida a SQL y devuelve la respuesta en formato JSON OData v4 con `@odata.context`, `value`, y opcionalmente `@odata.count` para paginación.

- **Ruta REST** (`/api/core/...`): Las peticiones pasan por el pipeline Express estándar: middleware de validación → controlador REST → servicio de dominio → modelo Sequelize. La respuesta sigue el formato `ApiResponse` uniforme definido en el Shared Kernel.

## 4.5 Anti-patrones a Evitar

1. ❌ **Pool de base de datos duplicado** — En el proyecto referencia existía un pool MySQL2 separado para OData que bypasseaba Sequelize. Con `@phrasecode/odata` y Sequelize integrados, esto ya no es necesario. Se debe usar un único pool gestionado por Sequelize.

2. ❌ **Modelos OData que importan de core/dominios** — Esto crearía una dependencia circular encubierta y rompería el principio de capas. Si un modelo OData necesita datos de dominio, debe consultar la base de datos directamente.

3. ❌ **Escribir desde OData** — Implementar operaciones de escritura en OData violaría el principio CQRS ligero y mezclaría responsabilidades. Toda escritura debe pasar por la API REST con su validación y lógica de negocio correspondiente.

4. ❌ **Mezclar español/inglés en naming** — El proyecto referencia mezclaba idiomas en nombres de clases y variables. Se debe elegir una convención (inglés, por coherencia con el ecosistema Node.js/TypeScript) y mantenerla consistentemente.

5. ❌ **Helmet desactivado** — En el proyecto referencia, `helmet` estaba comentado en la configuración de middlewares. Helmet protege contra ataques como clickjacking, MIME sniffing, y XSS. Debe estar siempre activo en producción.

## 4.6 Mapeo con node-modular-monolith Checklist

| Regla Skill | Cómo se cumple en OData |
|-------------|------------------------|
| R1: Dominio en `core/<domain>/` | OData NO crea dominios; solo extiende `common/service/odata/` |
| R5: Controller implements BaseController | ODataController NO implementa BaseController (es decorativo con `@odata.GET`) |
| R11: Service findById/findAll/create/update/delete | OData solo implementa READ (`find`), el resto sigue siendo REST |
| R13: Controlador OData sobre vista SQL (P13) | Se usa para exponer datos agregados de solo lectura |
| R24: Excepciones tipadas | `@phrasecode/odata` maneja errores OData internamente (código 4xx/5xx con `@odata.error`) |
| R25: ApiResponse | OData usa su propio formato JSON (`{ "@odata.context": "...", "value": [...] }`), NO usa `ApiResponse` |
| R26: Imports con `.js` | Se mantiene la extensión `.js` en los imports ESM |
