# 01 — Análisis de Arquitectura OData (Proyecto Referencia)

## 1.1 Resumen del Proyecto Referencia

El proyecto **SmartInventory-backend-main** sirve como referencia principal para implementar un endpoint OData v4 dentro de una arquitectura Modular Monolith con Node.js. Este proyecto fue desarrollado como backend de inventario de activos con integración SAP.

**Stack tecnológico del proyecto referencia:**

| Componente | Versión |
|------------|---------|
| Node.js | 20 LTS |
| Express | 4.18.x |
| TypeScript | 5.x |
| Sequelize | 6.37+ |
| MySQL2 | 3.x |
| `odata-v4-server` | 0.2.13 |
| `odata-v4-mysql` | 0.2.x |

La arquitectura general sigue el patrón **Modular Monolith con REST API + OData v4 endpoint**, donde el endpoint OData se utiliza exclusivamente como vía de consulta de solo lectura para integraciones externas (SAPUI5).

## 1.2 Estructura del Proyecto Referencia

La estructura del proyecto referencia organiza claramente la separación entre el Shared Kernel (`common/`) y los dominios de negocio (`core/`), con la capa OData ubicada dentro del Shared Kernel:

```
SmartInventory-backend-main/
├── server.ts                        # Bootstrap: DB auth + sync → monta Express
├── src/
│   ├── main.ts                      # Fábrica Express: middlewares + routers + OData
│   ├── common/                      # Shared Kernel
│   │   ├── dto/                     # BaseDTO
│   │   ├── exception/               # HttpException, NotFoundException, etc.
│   │   ├── helper/nestjs/           # OmitType, PartialType, PickType
│   │   ├── interface/               # BaseController, BaseService, ApiResponse
│   │   ├── middleware/              # GlobalError, JSONValidator, Security
│   │   ├── model/                   # BaseModel
│   │   ├── router/                  # GlobalRouter
│   │   ├── service/
│   │   │   ├── ORM/                 # Sequelize singleton + models + relations
│   │   │   ├── database/            # MySQL2 pool (para OData)
│   │   │   └── odata/               # ★ CAPA OData
│   │   │       ├── odata.service.ts # Servidor OData con @odata.controller()
│   │   │       ├── controllers/     # 16 controladores OData
│   │   │       └── helper/          # patchDuplicateOptions
│   │   └── type/                    # Type declarations
│   └── core/                        # Dominios de negocio
│       ├── main.ts                  # CoreRouter (monta dominios)
│       ├── authentication/
│       ├── master-data/
│       ├── people/
│       ├── asset-inventory/
│       └── logger/
```

## 1.3 Flujo OData (Análisis Detallado)

### Configuración del contexto OData (`src/main.ts`, líneas 25-35)

El fichero `src/main.ts` inyecta un middleware de contexto que asegura que el header `OData-Version` esté presente y parchea la URL del `$metadata` para que apunte correctamente al servicio OData. Este middleware se aplica antes de montar el enrutador OData.

### Servidor OData (`odata.service.ts`)

La clase principal del servidor OData utiliza decoradores de `odata-v4-server`:

- `@odata.controller(Entidad)` para registrar cada entidad
- `@odata.cors` para habilitar CORS
- Extiende la clase `ODataServer`
- Expone el servidor como middleware Express mediante `.create()`

El servidor se monta en la ruta `/odata` del enrutador Express global.

### Controlador OData típico

Cada controlador OData sigue una estructura consistente:

1. **Definición de la entidad**: Clase decorada con `@Edm.OpenType` y decoradores de tipo (`@Edm.Int32`, `@Edm.String`, `@Edm.Decimal`, etc.) para describir el esquema de datos.
2. **Registro del EntitySet**: `@Edm.EntitySet("Nombre")` + `@odata.type(Entidad)`.
3. **Controlador**: Clase que extiende `ODataController`.
4. **Método `find`**: Decorado con `@odata.GET` y `@odata.query`, recibe un parámetro `query: ODataQuery`.
5. **Ejecución de la consulta**:
   - Obtiene una conexión del pool MySQL2 separado (no utiliza Sequelize).
   - Usa `createQuery` de `odata-v4-mysql` para traducir el query OData (`$filter`, `$orderby`, `$top`, `$skip`, `$select`) a SQL nativo.
   - Ejecuta dos queries en paralelo: `COUNT(*)` para el total de registros y la consulta `SELECT` paginada.
   - Asigna `inlinecount` al resultado para que el cliente conozca el total de registros disponibles.
   - Libera la conexión al pool en el bloque `finally`.

### Helper `patchDuplicateOptions`

Este helper recorre el query OData entrante y elimina opciones duplicadas que puedan causar errores de sintaxis SQL. Es un parche necesario debido a que `odata-v4-server` no normaliza correctamente ciertos parámetros cuando el cliente envía múltiples veces el mismo operador de filtro.

## 1.4 Patrones Identificados

| ID | Patrón | Descripción |
|----|--------|-------------|
| **P13** | Controlador OData sobre vista SQL | Los controladores OData consultan vistas SQL (`VIEW_*`) predefinidas que agregan datos de múltiples tablas |
| **CQRS ligero** | Separación de vías de datos | REST usa Sequelize (escritura/lectura); OData usa MySQL2 pool directo (solo lectura) |
| **Solo lectura** | OData restringido a GET | Ningún controlador OData implementa POST, PUT, PATCH o DELETE |
| **Vistas SQL** | `VIEW_*` como fuente | Las vistas SQL sirven como capa de abstracción entre el esquema relacional complejo y el cliente OData |

## 1.5 Problemas / Deuda Técnica

| Problema | Impacto | Prioridad |
|----------|---------|-----------|
| `odata-v4-server` abandonado desde julio 2018 | Sin actualizaciones de seguridad ni correcciones | Alta |
| `odata-v4-mysql` solo soporta MySQL | Imposibilita migrar a PostgreSQL | Alta |
| Pool MySQL2 duplicado (bypassea Sequelize) | Dos pools de conexión, inconsistencia transaccional | Media |
| `helmet` comentado en middlewares | Riesgo de seguridad (headers HTTP desprotegidos) | Alta |
| `ResponsibleController` registrado dos veces | Error en tiempo de ejecución al iniciar el servidor | Media |
| `inlinecount` sin tipado (`(<any>results).inlinecount`) | TypeScript unsafe, propenso a errores en refactors | Baja |
| Mezcla español/inglés en naming de clases y variables | Inconsistencia, dificulta el mantenimiento | Baja |
