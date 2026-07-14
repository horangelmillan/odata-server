# odata-server — Reglas del proyecto

Sigue las reglas globales definidas en `~/.config/opencode/AGENTS.md`.

Usa la skill **node-modular-monolith** para crear nuevos módulos/dominios, endpoints REST, modelos ORM, y para revisar que el código nuevo respete las reglas y convenciones descritas.

## Stack

- Node 20 + TypeScript (ESM, NodeNext)
- Express + Sequelize + PostgreSQL
- OData v4 con `@phrasecode/odata`
- Tests: Vitest + supertest

## Convenciones

- Los módulos de dominio van en `src/core/<dominio>/` con su propia carpeta de interface, model, dto, service, controller, route
- Los endpoints REST van en `/api/core/<recurso>`
- Los endpoints OData van en `/odata/<entidad>` (kebab-case del nombre de clase)
- El controlador OData se registra en `src/common/service/odata/odata.service.ts`
- Usar `env.config.ts` para toda lectura de variables de entorno — nunca `process.env` directamente

## Parche conocido

`@phrasecode/odata` v0.3.1 tiene dos parches aplicados por `scripts/patch-odata.mjs` (vía `postinstall` y al inicio de `pnpm dev`):
- `SequelizerAdaptor`: no fuerza `dialectOptions.ssl` en dev.
- `ExpressRouter`: añade `GET /$count` (devuelve el total plano `text/plain` respetando `$filter`) y `GET /:id`. El query string se decodifica con `decodeURIComponent` antes de `URLSearchParams` para que `%26` (curl/CMD) se trate como separador de parámetros.
Los parches son idempotentes y **re-aplicables**: Parche 2 reemplaza el método `setUpODataRouters` completo por firma (marcador `// PATCHED-COUNT-v2`), así que actualizar el parche no requiere reinstalar node_modules desde cero.

### Docker
`docker-compose.yml` monta un volumen anónimo en `/app/node_modules` que cachea los node_modules de la primera build y los reutiliza. Por eso, tras cambiar el parche, `docker compose up` (sin `--build`) sirve código viejo. El `dev` script corre el parche en runtime, así que basta `docker compose up --build` para dejar el container al día sin `docker compose down -v` (que borraría la BD Postgres).

## Comandos

```bash
pnpm dev       # desarrollo con hot-reload
pnpm test      # tests unitarios + integración
pnpm build     # compilar a JS
```
