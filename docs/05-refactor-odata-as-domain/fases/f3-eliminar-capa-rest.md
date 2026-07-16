# F3 — Eliminar la capa REST

> **Fase:** F3 · **Esfuerzo:** Medio · **Sesión:** 4/8
> **Depende de:** F1, F2 (OData ya cubre escritura+lectura de ambos dominios).
> **Actualiza:** `README.md`, `docs/00-indice.md`, este archivo.
> **Herramienta MCP:** `codebase-memory` (trace de referencias colgantes a REST).

---

## 0. Objetivo

Quitar por completo el protocolo REST. El servidor expone **solo** `/odata`. Se elimina el
montaje `/api`, los routers/middlewares REST, y el ORM Sequelize compartido si queda sin uso.
`server.ts` pasa a sincronizar el esquema desde la instancia interna del `DataSource` OData.

---

## 1. Pasos detallados

### 1.1 Detectar referencias colgantes (codebase-memory)
Ejecutar un trace desde `src/main.ts` para listar todo lo que aún importa de:
- `src/common/router/global.router.ts`
- `src/core/*/route/*`, `src/core/*/controller/*` (REST)
- `src/common/service/ORM/*`
Esto evita borrar algo que aún se usa.

### 1.2 Quitar montaje `/api` en `src/main.ts`
- Eliminar `import { GlobalRouter }` y `app.use("/api", GlobalRouter)`.
- Eliminar `app.use(express.json())` si solo lo usaba REST (OData ya monta `express.json()` en
  `odata-write.routes.ts`); mantener `compression`, `helmet`, `cors`, `morgan`.
- El middleware OData contextual (`/odata`) y `oDataExpressApp` se mantienen.

### 1.3 Eliminar `global.router.ts` y `core/main.ts` de REST
- Borrar `src/common/router/global.router.ts`.
- `src/core/main.ts`: ya no registra `/products` ni `/categories` (retirados en F1/F2). Quedará
  como punto de registro de dominios OData (exporta los modelos/controladores o un arreglo de
  controladores para `odata.service.ts`). Ajustar su contenido a ese rol.

### 1.4 Borrar REST de cada dominio
- Eliminar `route/` y `controller/` (REST) de `core/product` y `core/category` (si quedó algo).
- Verificar que no queden imports a `ValidatorMiddleware` salvo el usado en escritura OData (F4).

### 1.5 ORM Sequelize compartido
- Si `src/common/service/ORM/sequelize.service.ts` queda sin importadores (codebase-memory lo
  confirma), eliminar la carpeta. La instancia Sequelize ahora vive dentro del `DataSource` OData
  (`dataSource.sequelizerAdaptor.sequelize`) y es la única usada para escritura/lectura.

### 1.6 `server.ts` sincroniza desde el DataSource
Reemplazar:
```ts
import { db } from "./src/common/service/ORM/sequelize.service.js";
await db.authenticate(); await db.sync({ alter: true });
```
por:
```ts
import { dataSource } from "./src/common/service/odata/datasource.js";
const sequelize = (dataSource as any).sequelizerAdaptor.sequelize;
await sequelize.authenticate(); await sequelize.sync({ alter: true });
```
> Nota: en F4 se formaliza este acceso sin `any` (cast tipado en `odata-write.service.ts` ya existe).

### 1.7 Verificar que NO queda `/api`
- `GET /api/core/products` → debe ser 404 (no montado) o caer en el `GlobalErrorMiddleware`.
- `pnpm build` (o al menos `tsc --noEmit`) sin referencias a archivos borrados.

---

## 2. Criterios de aceptación

- [ ] `src/main.ts` no monta `/api`; solo `/odata`.
- [ ] `global.router.ts` eliminado; `core/main.ts` reorientado a registro OData.
- [ ] `route/` y `controller/` REST de `product`/`category` eliminados.
- [ ] `common/service/ORM` eliminado (si libre de refs).
- [ ] `server.ts` sincroniza vía `dataSource.sequelizerAdaptor.sequelize.sync()`.
- [ ] `GET /api/*` no expuesto; `pnpm test` en verde; build sin refs colgantes.

---

## 3. Documentación a actualizar al cerrar

- `README.md`: sección "Arquitectura" → eliminar el árbol REST; describir OData-as-domain.
  Sección "API" → quitar tabla REST; dejar solo `/odata`.
- `docs/00-indice.md`: marcar F3 done.
- Este archivo: checklist ✅.

---

## 4. Siguiente fase

➡️ [`f4-consolidar-shared-kernel-odata.md`](f4-consolidar-shared-kernel-odata.md)
