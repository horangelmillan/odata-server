# 09 — Andamiaje del Proyecto

## 9.1 Creación del Proyecto

El proyecto se inicializa desde cero con npm, instalando tanto las dependencias de producción como las de desarrollo necesarias para TypeScript con ESM.

```bash
mkdir servidor-odata
cd servidor-odata
npm init -y
npm install @phrasecode/odata express sequelize pg pg-hstore helmet morgan compression cors dotenv reflect-metadata http-status-codes class-validator class-transformer class-transformer-validator bcrypt jsonwebtoken
npm install -D typescript ts-node @types/node @types/express @types/compression @types/cors @types/morgan @types/jsonwebtoken
```

La instalación incluye las librerías fundamentales para el patrón Modular Monolith: Express como framework HTTP, Sequelize + pg como stack de base de datos, `@phrasecode/odata` para el middleware OData, `helmet` y `cors` para seguridad, `class-validator` y `class-transformer` para validación de DTOs, y `jsonwebtoken` + `bcrypt` para autenticación.

## 9.2 Scripts package.json

| Script | Comando | Uso |
|--------|---------|-----|
| `dev` | `node --watch --loader ts-node/esm ./server.ts` | Desarrollo con hot reload |
| `build` | `tsc --build` | Compilar a JS |
| `start` | `node ./dist/server.js` | Producción |
| `clean` | `tsc --build --clean` | Limpiar build |

El script `dev` usa `--watch` (Node 18+) combinado con `ts-node/esm` para recargar automáticamente el servidor ante cualquier cambio en los archivos TypeScript. En producción se compila primero con `npm run build` y luego se ejecuta el JavaScript resultante con `start`.

## 9.3 Variables de Entorno (.env)

```
NODE_ENV=development
PORT=3000

# PostgreSQL
DEV_DIALECT=postgres
DEV_HOST=localhost
DEV_PORT=5432
DEV_USERNAME=postgres
DEV_PASSWORD=postgres
DEV_DB=odata_dev

# PostgreSQL (Producción)
DB_DIALECT=postgres
DB_HOST=prod-host
DB_PORT=5432
DB_USERNAME=prod_user
DB_PASSWORD=prod_pass
DB=odata_prod

# JWT
SECRET_KEY=generate-a-strong-random-secret-here

# CORS
CORS_ORIGIN=http://localhost:4200
```

Las variables de entorno se cargan mediante `dotenv` al inicio de `server.ts`. Se distinguen dos grupos de configuración de base de datos: las prefijadas con `DEV_` para desarrollo local y las prefijadas con `DB_` para producción. El archivo `.env` no se versiona; en su lugar se provee un `.env.example` con valores de ejemplo.

## 9.4 Estructura Completa de Carpetas

```
servidor-odata/
├── docs/                          # Documentación
├── src/
│   ├── common/                    # Shared Kernel
│   │   ├── dto/
│   │   ├── exception/
│   │   ├── helper/
│   │   │   └── nestjs/
│   │   ├── interface/
│   │   ├── middleware/
│   │   ├── model/
│   │   ├── router/
│   │   ├── service/
│   │   │   ├── ORM/
│   │   │   └── odata/
│   │   │       ├── models/
│   │   │       ├── controllers/
│   │   │       ├── datasource.ts
│   │   │       └── odata.service.ts
│   │   └── type/
│   ├── core/
│   │   ├── main.ts
│   │   └── <domain>/
│   │       ├── route/
│   │       ├── controller/
│   │       ├── service/
│   │       ├── model/
│   │       ├── dto/
│   │       ├── interface/
│   │       ├── query/
│   │       └── main.ts
│   └── main.ts
├── server.ts
├── tsconfig.json
├── package.json
└── .env.example
```

La estructura separa claramente el Shared Kernel (`common/`) de los dominios de negocio (`core/`). Cada dominio contiene sus propias capas (route, controller, service, model, dto, interface) y un archivo `main.ts` que expone los componentes públicos del módulo. La configuración de OData vive dentro de `common/service/odata/` para mantenerla aislada de los dominios.

## 9.5 Bootstrap (server.ts)

El archivo `server.ts` es el punto de entrada de la aplicación y sigue una secuencia de inicialización definida:

1. **Carga de variables de entorno**: `dotenv.config()` lee el archivo `.env` y popula `process.env`.
2. **Autenticación de base de datos**: Se invoca `db.authenticate()` para verificar que la conexión a PostgreSQL sea válida antes de continuar.
3. **Sincronización de modelos**: En desarrollo se ejecuta `db.sync()` para crear o ajustar tablas automáticamente; en producción se omiten las migraciones automáticas y se delega en migraciones manuales.
4. **Creación de la fábrica Express**: Se construye la aplicación Express con middleware global: `cors()`, `helmet()`, `compression()`, `morgan()`, y el parseo de JSON.
5. **Montaje de módulos**: Se registran los routers REST de cada dominio (`core/<domain>/route/`) y el middleware OData en sus respectivas rutas base.
6. **Inicio del servidor**: `app.listen(PORT)` pone la aplicación a escuchar en el puerto configurado.

Este flujo asegura que la base de datos esté operativa antes de aceptar peticiones y que todos los módulos estén registrados correctamente.
