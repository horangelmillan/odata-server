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

`@phrasecode/odata` v0.3.1 tiene un bug en `SequelizerAdaptor` que siempre fuerza `dialectOptions.ssl` incluso en dev. El fix está en `patches/@phrasecode/odata/` y se aplica automáticamente vía postinstall. Si se actualiza la librería, verificar que el parche siga siendo necesario.

## Comandos

```bash
pnpm dev       # desarrollo con hot-reload
pnpm test      # tests unitarios + integración
pnpm build     # compilar a JS
```
