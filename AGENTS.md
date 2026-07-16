# odata-server — Reglas del proyecto

Sigue las reglas globales definidas en `~/.config/opencode/AGENTS.md`.

Usa la skill **node-modular-monolith** para crear nuevos módulos/dominios OData, modelos ORM y revisar que el código nuevo respete las reglas y convenciones descritas.

## Stack

- Node 20 + TypeScript (ESM, NodeNext)
- Express (solo host del router OData + middleware transversal)
- OData v4 con `@phrasecode/odata` (fuente de verdad del contrato de API **y** del modelo/ORM; usa Sequelize internamente de forma transparente)
- PostgreSQL
- Tests: Vitest + supertest

## Convenciones

- **El dominio es agnóstico a todo artefacto periférico**: el dominio es la fuente de verdad del
  negocio y no depende de ningún protocolo de exposición, capa de persistencia, motor de datos ni
  middleware. La **arquitectura del servidor define la organización** (domain layer + shared kernel +
  adapters); cualquier combinación de esos artefactos debe adaptarse a esa arquitectura, no al
  revés. Los adapters son intercambiables sin reescribir el dominio. "OData como dominio único"
  significa que hoy OData es el único protocolo de exposición activo, no que el dominio esté
  acoplado a él.
- Los dominios viven en `src/core/<namespace>/<dominio>/` con su propia carpeta de `interface`,
  `model`, `dto`, `service`, `controller`. El namespace (`demo/`, `finance/`) agrupa dominios
  con prefijo semántico en la ruta OData y se refleja en la carpeta física. El controlador es
  el *adaptador* del dominio al contrato de exposición.
- `src/common/service/odata/` es **shared kernel** (infraestructura OData transversal: `DataSource`,
  `ExpressRouter`, escritura base, `odata-error`, `odata-etag`, `odata-format`, `odata-metadata`,
  parches). No es un dominio: no contiene modelos ni controladores de dominio.
- Los endpoints se agrupan por namespace semántico: `/odata/demo/<entidad>` (dominios de
  demostración, ej. `product`, `category`) y `/odata/finance/<entidad>` (ecosistema financiero
  simulado). El `getEndpoint()` del controlador define el prefijo. La carpeta física
  `src/core/demo/` y `src/core/finance/` refleja el mismo namespace.
- El controlador OData se registra en `src/common/service/odata/odata.service.ts`.
- El seed financiero idempotente vive en `scripts/seed/financial-seed.ts` y se ejecuta con `pnpm seed` o `pnpm db:reset`.
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
