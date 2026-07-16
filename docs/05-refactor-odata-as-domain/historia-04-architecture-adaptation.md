# 04 — Adaptación de Arquitectura: OData + Modular Monolith

## 4.1 Principios de Integración

La integración de OData v4 en odata-server sigue los siguientes principios fundamentales:

1. **OData es opcional** — El endpoint OData es una vía de datos adicional que puede estar presente o no sin afectar el funcionamiento del sistema REST principal.
2. **OData es solo lectura** — El endpoint OData solo responde a peticiones GET. Las operaciones de escritura (POST, PUT, PATCH, DELETE) se gestionan exclusivamente a través de la API REST, siguiendo un patrón CQRS ligero.
3. **Sin dependencias de OData hacia los dominios** — La capa OData no debe importar ni depender de los módulos de negocio en `core/`. La relación de dependencia es unidireccional: los dominios no saben de la existencia de OData.
4. **Shared Kernel como contenedor** — Toda la infraestructura OData reside en el Shared Kernel (`common/service/odata/`), junto con el resto de la infraestructura transversal.

## 4.2 Ubicación de la Capa OData

```
src/common/service/odata/           # ← Capa OData en Shared Kernel
├── odata.service.ts                # Configura ExpressRouter de @phrasecode/odata
├── datasource.ts                   # DataSource PostgreSQL con variables de entorno
├── models/                         # Modelos @Table/@Column de @phrasecode/odata
│   └── product.odata.model.ts
├── controllers/                    # Controladores OData (extienden ODataControler)
│   └── product.odata.controller.ts
```

A diferencia de arquitecturas anteriores donde se usaba un pool MySQL2 separado para OData, odata-server utiliza un **DataSource unificado** de `@phrasecode/odata` que gestiona su propio pool de conexiones PostgreSQL. El DataSource se configura en `datasource.ts` con las mismas variables de entorno que Sequelize, pero con un pool independiente para evitar contención.

## 4.3 Reglas de Dependencia

| Dependencia | Permitido | Prohibido |
|-------------|-----------|-----------|
| OData Controller | → modelo OData, → `this.queryable()` | → dominio core (`src/core/`) |
| Modelo OData | → `@phrasecode/odata` decorators | → REST service (`src/common/service/ORM/`) |
| `@phrasecode/odata` ExpressRouter | → `common/odata/controllers` | → `core/domains/` |

**Regla fundamental**: La capa OData solo puede importar del Shared Kernel o de librerías externas. Nunca debe importar de los dominios de negocio. Si un controlador OData necesita datos que están encapsulados en un servicio de dominio, debe consultar la base de datos directamente a través del DataSource de `@phrasecode/odata`, no a través del servicio de dominio.

## 4.4 Flujo de Solicitudes

```
Cliente (SAPUI5 / Power BI / etc.)
  │
  ├── GET /odata/Products?$filter=precio gt 100   →  src/main.ts
  │       │                                            → middleware OData context (normaliza $metadata, set header)
  │       │                                            → oDataExpressApp (ExpressRouter de @phrasecode/odata)
  │       │                                            → ProductODataController.get()
  │       │                                            → query.getParams() / query.setTop(100)
  │       │                                            → this.queryable(query) → SQL nativo
  │       │                                            → Response OData v4 JSON
  │
  └── POST /api/core/products                    →  src/main.ts
          │                                            → helmet / cors / express.json / compression / morgan
          │                                            → GlobalRouter (/api)
          │                                            → CoreRouter (/api/core)
          │                                            → ProductRouter (/api/core/products)
          │                                            → ValidatorMiddleware (valida ProductCreateDTO)
          │                                            → productController.create()
          │                                            → productService.create(data)
          │                                            → ProductModel.create(data)
          │                                            → ApiResponse uniforme
```

El flujo diferencia claramente dos caminos de entrada:

- **Ruta OData** (`GET /odata/...`): Pasa primero por el middleware OData en `src/main.ts` que normaliza la URL de `$metadata` y fuerza el header `OData-Version: 4.0`. Luego llega al ExpressRouter de `@phrasecode/odata`, que enruta al controlador OData según el EntitySet. El controlador aplica un límite máximo de 100 registros (`setTop(100)`) y usa `this.queryable()` para traducir automáticamente el query OData a SQL.

- **Ruta REST** (`/api/core/...`): Pasa por todo el pipeline Express (helmet, cors, json, compression, morgan) antes de llegar al GlobalRouter. Dentro del dominio, pasa por el ValidatorMiddleware que valida el DTO con class-validator, luego al controlador REST, al servicio de dominio, y finalmente al modelo Sequelize. La respuesta se envuelve en el formato `ApiResponse` uniforme.

## 4.5 Decisiones Arquitectónicas Específicas de odata-server

### 4.5.1 DataSource Independiente para OData

A diferencia de enfoques que comparten el pool de Sequelize o que usaban un pool MySQL2 separado para OData, odata-server utiliza un **DataSource propio de `@phrasecode/odata`** con pool PostgreSQL dedicado. Esto evita:

- Contención de conexiones entre consultas OData pesadas y transacciones REST.
- Dependencia del ORM para consultas OData que pueden requerir SQL optimizado.
- Acoplamiento entre la capa de consultas externas y el modelo de dominio.

### 4.5.2 Middleware OData Inline

La configuración del contexto OData se define directamente en `src/main.ts` como middleware inline, no como una clase separada montada en el router. Esto mantiene el bootstrap simple y evita una capa de indirección innecesaria para una funcionalidad que solo normaliza `$metadata` y el header de versión.

### 4.5.3 Límite Máximo en Consultas OData

El controlador OData (`product.odata.controller.ts`) fuerza un máximo de 100 registros por consulta:

```typescript
if (!params.top || params.top > 100) {
    query.setTop(100);
}
```

Esto protege el servidor contra consultas sin paginación (`$top` ausente) o con paginación excesiva que podrían saturar la base de datos.

### 4.5.4 Modelo OData Desacoplado del Modelo Sequelize

Aunque `@phrasecode/odata` puede leer modelos Sequelize directamente, odata-server define un modelo OData separado (`ProductOData`) usando los decoradores de `@phrasecode/odata`. Esto permite:

- Exponer solo los campos relevantes para consultas OData.
- Usar nombres y tipos específicos para la exposición externa.
- Mantener el modelo Sequelize (`ProductModel`) puro, sin decoradores de frameworks externos.

## 4.6 Anti-patrones Evitados

1. ✅ **Pool de base de datos duplicado** — No existe un pool separado para OData que bypasseara el ORM. El DataSource de `@phrasecode/odata` gestiona su propio pool PostgreSQL de forma independiente pero sin duplicar la configuración de conexión.

2. ✅ **Modelos OData que importan de core/dominios** — `ProductOData` solo usa decoradores de `@phrasecode/odata` y no importa nada de `src/core/`.

3. ✅ **Escribir desde OData** — `allowedMethod: ["get"]` restringe explícitamente el controlador OData a solo lectura.

4. ✅ **Helmet desactivado** — `helmet()` se aplica al inicio del pipeline Express en `src/main.ts`, protegiendo tanto el endpoint REST como el OData.

5. ✅ **Naming consistente** — Todo el código usa una convención uniforme (inglés en nombres de clases, métodos, interfaces).

## 4.7 Mapeo con node-modular-monolith

| Regla Skill | Cómo se cumple en odata-server |
|-------------|-------------------------------|
| R1: Dominio en `core/<domain>/` | OData NO crea dominios; solo extiende `common/service/odata/` |
| R5: Controller implements BaseController | ODataController NO implementa BaseController (hereda de `ODataControler` de `@phrasecode/odata`) |
| R11: Service findById/findAll/create/update/delete | OData solo implementa GET (`get`), el resto sigue siendo REST en `core/product/` |
| R13: Controlador sobre vista/tabla | `ProductODataController` expone la tabla `products` vía `ProductOData` model |
| R24: Excepciones tipadas | `@phrasecode/odata` maneja errores OData internamente; REST usa `HttpException` y sus subtipos |
| R25: ApiResponse | OData usa su propio formato JSON (`{ "@odata.context": "...", "value": [...] }`), NO usa `ApiResponse` |
| R26: Imports con `.js` | Se mantiene la extensión `.js` en todos los imports ESM |
