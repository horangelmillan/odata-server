# 00 — Plan Maestro: OData como Dominio Único (eliminación de REST)

> **Ciclo:** `refactor/odata-as-domain` (rama dedicada; NO se hace merge a `master` hasta cumplir todas las condiciones de aceptación).
> **Inicio:** 2026-07-15
> **Estado global:** 📋 Planificado — pendiente ejecución de F0.

---

## 0. Resumen ejecutivo

El proyecto hoy expone **dos protocolos**: REST (`/api/core/*`, en `core/<dominio>/`) y
OData (`/odata/*`, en `common/service/odata/`). La intención original del diseño no era tener
dos protocolos en capas distintas, sino que **cada dominio agrupe su lógica común** — y OData
ya había crecido hasta cubrir también escritura (`$batch` con changesets atómicos, escritura
directa por entidad, etag, errores OData v4 estándar). Esta dualidad genera modelos duplicados
y una fuente de verdad partida.

Este ciclo:
1. **Elimina REST por completo** (`/api/core/*`).
2. **Promueve OData a dominio de primera clase** dentro de `core/<dominio>/`, reusando la
   misma estructura de carpetas que usaba REST (interface / model / dto / service / controller),
   y aprovechando los beneficios de DTO, validación `class-validator`, servicios e interfaces.
3. **Convierte `common/service/odata/` en shared kernel** (infraestructura OData transversal:
   `DataSource`, factory `ExpressRouter`, `odata-write.service` base, `odata-error`, `odata-etag`,
   `odata-format`, `odata-metadata`, parches), análogo a como hoy `common/service/ORM` es shared kernel.
4. **Actualiza toda la documentación** en cada fase.
5. **Valida con tests robustos** (ya existen 164 tests de OData) y con el proyecto UI5 de prueba.

---

## 1. Investigación y diagnóstico

### 1.1 Estado actual (verificado en el código)
- **REST** vive en `core/product/` y `core/category/` (`interface/`, `model/` con `db.define`,
  `dto/`, `service/`, `controller/`, `route/`). Montado en `src/main.ts` → `GlobalRouter` (`/api`) →
  `CoreRouter` (`/core`) → `ProductRouter`/`CategoryRouter`.
- **OData** vive en `common/service/odata/` (`models/`, `controllers/`, `datasource.ts`,
  `odata.service.ts`, `odata-write.*`, `odata-error`, `odata-etag`, `odata-format`, `odata-metadata`).
  Montado en `src/main.ts` → `app.use("/odata", oDataExpressApp)`.
- **OData ya escribe** (Fase H de `docs/04-sapui5-compat/14-sapui5-compatibility-plan.md`):
  `odata-write.service.ts` + `odata-write.routes.ts` implementan POST/PATCH/PUT/DELETE y `$batch`
  con changesets atómicos, reutilizando la instancia Sequelize del datasource.

### 1.2 Deuda arquitectónica ya documentada
En `docs/04-sapui5-compat/14-sapui5-compatibility-plan.md`, **Sesión 11 (línea ~367)** se anota
explícitamente:

> *"Deuda arquitectónica anotada: hoy la lógica REST vive en `core/<dominio>` y los modelos/
> controllers OData en `common/`. Lo consistente sería que OData sea la capa de escritura de
> primera clase (o al revés, unificar). Se documenta para planificar el cambio en otro ciclo;
> **no** se aborda aquí para no ampliar el alcance de la rama de compatibilidad."*

**Este ciclo es exactamente ese "otro ciclo".**

### 1.3 Hallazgo crítico: el modelo OData ya es fuente de verdad
El `DataSource` de `@phrasecode/odata` **define las tablas** desde los modelos `@Table/@Column`
en su constructor (`dataSource.js:27-33` → `sequelizerAdaptor.define(tableIdentifier, columnMetadata)`).
El `db.define` de Sequelize en `core/<dominio>/model/` es **redundante**: ambos crean la misma
tabla con la misma metadata. Hoy `server.ts` sincroniza con `db.sync()` del ORM Sequelize
(`common/service/ORM`), pero en F3 se cambiará a sincronizar sobre la instancia interna del
DataSource (`dataSource.sequelizerAdaptor.sequelize.sync({ alter: true })`).

**Conclusión:** eliminar el `db.define` de Sequelize NO rompe la creación de esquema; al
contrario, la elimina duplicada.

### 1.4 Tests y validación existentes
- `src/__tests__/integration/`: `odata.api.test.ts`, `odata-batch.api.test.ts`,
  `odata-count.api.test.ts`, `odata-count-routing.api.test.ts`, `odata-expand.integration.test.ts`,
  `product.api.test.ts` (REST), `server.test.ts`, `error-handling.test.ts`.
- Total actual: **164 passing + 1 todo**. Los tests de OData cubren lectura, escritura, `$batch`,
  etag, errores, `$metadata` CSDL, recorte de navegación.
- Proyecto de prueba UI5: `C:\Users\Horan\Desktop\ui5-odata-demo` (apuntado a `/odata`).

---

## 2. Decisiones de arquitectura (confirmadas con el usuario)

| # | Decisión | Opción elegida | Alternativa descartada |
|---|---|---|---|
| D1 | Fuente de verdad del modelo | **Solo `@phrasecode/odata`** (`@Table/@Column`). Se elimina el `db.define` de Sequelize en `core/`. | Mantener `db.define` y hacer que OData lea de él (desaprovecha los decoradores OData ya hechos). |
| D2 | Contrato OData v4 | **Prioridad absoluta.** El demo `ui5-odata-demo` debe seguir conviviendo; cualquier ajuste se hace en beneficio de la integración UI5/OData V4. | Romper el contrato OData para simplificar (no aceptado). |
| D3 | Ubicación de OData | Dominio en `core/<dominio>/` (interface/model/dto/service/controller). `common/service/odata/` = shared kernel. | Dejar OData en `common/` (mantiene la dualidad que se quiere eliminar). |
| D4 | Rama y merge | Rama `refactor/odata-as-domain`; **sin merge a `master`** hasta cumplir todos los criterios de aceptación de F0–F7. | Merge incremental a `master` (se descarta para no perder el foco). |
| D5 | Ejecución por fases | Una fase por sesión; verificar calidad (tests + demo) antes de avanzar. Docs al cerrar cada fase. | Ejecutar todo de golpe. |

---

## 3. Estructura objetivo

```
src/
├── common/                         # Shared Kernel
│   ├── config/  exception/  helper/  interface/  middleware/  model/  dto/  router/  type/
│   └── service/
│       ├── ORM/                    # (eliminado en F3 si queda sin uso)
│       └── odata/                  # SHARED KERNEL ODATA (infra transversal)
│           ├── datasource.ts       # DataSource PostgreSQL (única fuente de modelos)
│           ├── odata.service.ts    # Factory ExpressRouter + registro de controladores
│           ├── odata-write.service.ts   # base de escritura por dominio (validada con DTO)
│           ├── odata-write.routes.ts    # registro de rutas de escritura directa
│           ├── odata-error.ts  odata-etag.ts  odata-format.ts  odata-metadata.ts
│           └── (sin models/ ni controllers/ por dominio — ahora viven en core/)
├── core/                           # MÓDULOS DE DOMINIO (OData-first)
│   ├── main.ts                     # registra dominios en /odata (vía odata.service)
│   ├── product/
│   │   ├── interface/product.interface.ts
│   │   ├── model/product.odata.model.ts     # @Table/@Column  (fuente de verdad)
│   │   ├── dto/product.dto.ts                # class-validator (valida escritura OData)
│   │   ├── service/product.service.ts        # orquesta lectura (queryable) + escritura (DTO)
│   │   ├── controller/product.odata.controller.ts  # extends ODataControler
│   │   └── main.ts                            # registro del dominio
│   └── category/  (análogo)
└── main.ts                         # SOLO monta /odata (sin /api)
```

---

## 4. Fases (una por sesión)

| Fase | Alcance | Entregable / Criterio de aceptación | Esfuerzo | Doc detallado |
|---|---|---|---|---|
| **F0** | Rama `refactor/odata-as-domain`; baseline de tests (164 pass); congelar `master`. | Rama creada; tests verdes como línea base. | Bajo | [`fases/f0-ramificacion-baseline.md`](fases/f0-ramificacion-baseline.md) |
| **F1** | `product` → dominio OData: mover modelo/controller a `core/product/`, añadir `service` + validación DTO en escritura. Eliminar `db.define` duplicado. | `/odata/product-odata` CRUD+`$expand` funcional; escritura validada; tests verdes; `product.api.test.ts` (REST) eliminado. | Medio | [`fases/f1-product-como-dominio-odata.md`](fases/f1-product-como-dominio-odata.md) |
| **F2** | `category` igual que F1; navegación `$expand` intacta. | `/odata/category-odata` funcional; tests verdes. | Medio | [`fases/f2-category-como-dominio-odata.md`](fases/f2-category-como-dominio-odata.md) |
| **F3** | Eliminar capa REST: quitar `/api` de `main.ts` y `global.router.ts`; borrar `route/`, `controller/` REST, `common/service/ORM` si queda sin uso; `server.ts` sincroniza vía DataSource. | `GET /api/*` sin montar; solo `/odata`; build sin refs colgantes; `db.sync` desde DataSource. | Medio | [`fases/f3-eliminar-capa-rest.md`](fases/f3-eliminar-capa-rest.md) |
| **F4** | Consolidar shared kernel OData: `odataWriteService` por-dominio usando DTOs; sin casts a `sequelizerAdaptor.models`. | Una ruta de escritura validada por DTO por dominio; sin casts frágiles. | Medio | [`fases/f4-consolidar-shared-kernel-odata.md`](fases/f4-consolidar-shared-kernel-odata.md) |
| **F5** | Documentación completa: reescribir `README.md`, `docs/04` (historia), `docs/05` patrón, `docs/06` (historia), `docs/11` ejemplo, `AGENTS.md`; nuevo índice. | Docs alineadas al nuevo diseño. | Medio | [`fases/f5-documentacion.md`](fases/f5-documentacion.md) |
| **F6** | Validación E2E con `ui5-odata-demo` (terminal :3000) + benchmark regresión (`scripts/bench`, gate ≤10%). | Demo UI5 funcional contra `/odata`; benchmark sin regresión. | Bajo-Medio | [`fases/f6-validacion-e2e-benchmark.md`](fases/f6-validacion-e2e-benchmark.md) |
| **F7** | Merge a `master` solo si F1–F6 cumplen criterios. | Merge + tag (acción consciente). | Bajo | [`fases/f7-merge-a-master.md`](fases/f7-merge-a-master.md) |

**Orden intencional:** F1/F2 se hacen **antes** de F3 para no romper nada hasta tener OData
cubriendo escritura+lectura de forma validada.

---

## 5. Uso de MCP por fase (herramientas de apoyo)

- **context7**: F1/F2 para confirmar la API de `@phrasecode/odata` (`@Table`/`@Column`,
  `ODataControler`, `QueryParser`, `DataSource`) antes de mover modelos/controladores.
- **codebase-memory**: F3 (detectar referencias colgantes a REST tras borrar archivos) y
  F4 (trace `CALLS` desde `main.ts`/rutas para asegurar que no queda dependencia a `core/*/route`).

---

## 6. Ejecución Docker vs terminal (evitar conflictos)

- **Desarrollo iterativo (F1–F4):** `pnpm dev` en terminal (hot-reload).
- **Tests de integración y benchmark:** `docker compose up -d db` (solo Postgres; aislar el
  server del bench según `docs/04-sapui5-compat/14-sapui5-compatibility-plan.md` Fase P — no
  medir dos servidores a la vez, miden competencia de CPU).
- **Demo UI5 (F6):** `servidor-odata` en terminal (`:3000`) + `ui5-odata-demo` apuntando a `/odata`.
  El `docker-compose.yml` monta `node_modules` en volumen anónimo, así que tras cambiar el parche
  hay que `docker compose up --build` (no solo `up`) para no servir código viejo.

---

## 7. Condiciones de aceptación globales (gate de merge a master — F7)

- [ ] F0–F6 ejecutadas y verificadas.
- [ ] `pnpm test` en verde (sin tests de REST colgantes; cobertura de OData ≥ la actual).
- [ ] Demo `ui5-odata-demo` funcional contra `/odata` (CRUD + `$expand` + etag).
- [ ] Benchmark de regresión ≤10% en p95/throughput vs baseline (Fase P).
- [ ] `GET /api/*` no expuesto; solo `/odata`.
- [ ] Documentación (`README.md`, `AGENTS.md`, `docs/`) alineada al diseño OData-as-domain.
- [ ] `master` protegido: el merge requiere desbloquear la protección de forma consciente.
