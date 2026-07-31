# F1 — Modularidad: common puro, composición en bootstrap

> Ciclo 16 — Fase 1. Rama: `feat/produccion-segura`.
> Plantilla: `docs/02-patrones/17-plantilla-ciclo.md` §2.3.

## 1. Objetivo

Eliminar el acoplamiento `common → core` (decisión D1, RF1/RF2/RF3): dejar
`src/common` 100% genérico (cero imports de `src/core`) y mover toda la
composición —modelos, registros de dominio y migraciones— al bootstrap
(`src/main.ts` + `server.ts`, que viven fuera de `common` y `core`).

## 2. Alcance

| Archivo | Cambio |
|---|---|
| `src/common/service/odata/odata-models.ts` | **ELIMINAR** (la lista de modelos se compone en bootstrap desde `domainRegistrations`) |
| `src/common/service/odata/datasource.ts` | `createDataSource(models)` (factory) + `registerDataSource` / `getDataSource` (enlace para los write services) |
| `src/common/service/odata/odata-write.service.ts` | lee el datasource vía `getDataSource()` (sin import del singleton) |
| `src/common/service/odata/odata.service.ts` | `createODataExpressApp(registrations, dataSource)` (factory; sin imports de core ni del singleton) |
| `src/common/service/odata/migrations/migrator.ts` | `runMigrations(sequelize, migrations)` con lista explícita (sin glob ni `file://`) |
| `src/common/service/odata/migrations/001-baseline.ts` | se conserva intacto como **snapshot histórico congelado** (ver RF2) |
| `src/core/finance/migrations/002-rich-financial-model.ts`, `003-supplierinvoice-items-payments.ts` | se **mueven** desde common (git mv; el nombre del archivo es la identidad en `SequelizeMeta`, no cambia) |
| `src/core/finance/migrations/index.ts` | NUEVO: exporta `financeMigrations: KernelMigration[]` |
| `src/main.ts` | composition root: recibe `dataSource`, enlaza el registry, crea el router OData con `domainRegistrations` |
| `server.ts` | compone `dataSource` y la lista de migraciones (baseline + finance) |
| Tests | 12 archivos adaptados (mocks → factory, singleton → parámetro); test de consistencia reescrito + **test estructural de pureza** |

## 3. Diseño (decisiones)

### 3.1 Regla estructural

`src/common` NO importa `src/core` (verificado por test estructural, §5.4, y
complementado por grep en el gate). `src/core` SÍ puede usar utilidades del
kernel (`OmitType`/`PartialType`, excepciones, `modelOf`, `ODataWriteService`,
contrato `DomainRegistration`) — eso es lo que hace hoy (core → common ~67
imports, permitido).

### 3.2 Enlace del datasource a los write services (trade-off documentado)

Los 12 servicios de dominio (`productService`, `companyService`, …) son
singletons que usan `odataWriteService` (singleton en common). No tienen punto
de inyección del datasource. Para NO tocar el contrato `DomainWriteService` ni
los 12 archivos de dominio (mínima modificación), `datasource.ts` expone:

- `createDataSource(models)` — factory pura.
- `registerDataSource(ds)` — llamado por `expressApp(dataSource)` (bootstrap).
- `getDataSource()` — lo consume `odataWriteService`; lanza error claro si
  nadie lo enlazó.

Alternativa descartada: inyección por constructor en los 12 dominios
(cambiaría el contrato y todo `core/main.ts`; cero beneficio de runtime).

### 3.3 Migraciones

- `migrator.ts` recibe la lista explícita `KernelMigration[]` (objetos
  `{ name, up, down }`) — elimina glob + `file://` (el bug de Windows de DAP2
  desaparece por diseño) y funciona igual en dev (`.ts`) y dist (`.js`).
- Identidad `SequelizeMeta` = el `name` del archivo: se conservan EXACTAMENTE
  los nombres que registraba el resolver glob histórico (con extensión:
  `001-baseline.ts`, `002-rich-financial-model.ts`,
  `003-supplierinvoice-items-payments.ts`) → las bases ya migradas no
  re-ejecutan nada (verificado contra `SequelizeMeta` real: el resolver glob
  registraba el nombre CON extensión).
- `001-baseline.ts` permanece en common: es un snapshot congelado del esquema
  pre-modularidad (tablas demo Y finance) que no importa core; moverlo no
  aporta y añade riesgo. Su `up`/`down` se envuelve en `server.ts` con nombre
  fijo. (RF2 resuelto parcialmente: 002/003 → dominio finance.)

## 4. Pasos

1. `datasource.ts` → factory + registry.
2. `odata-write.service.ts` → `getDataSource()`.
3. `odata.service.ts` → `createODataExpressApp(registrations, dataSource)`.
4. Eliminar `src/common/service/odata/odata-models.ts`.
5. `src/main.ts` → `expressApp(dataSource)` composition root.
6. `server.ts` → composición + lista de migraciones.
7. `migrator.ts` → `KernelMigration[]` explícita.
8. `git mv` 002/003 a `src/core/finance/migrations/` + crear `index.ts`.
9. Adaptar tests (12 archivos) y reescribir el test de consistencia + pureza.
10. Gate F1 (§6) y actualizar backlog (§5).

## 5. Checklist de ejecución

- [x] `datasource.ts`: `createDataSource(models)` sin import de modelos.
- [x] `odata-write.service.ts`: `getDataSource()` con error claro si no enlazado.
- [x] `odata.service.ts`: factory con parámetros; sin imports de core/singleton.
- [x] `odata-models.ts` eliminado y sin referencias restantes (grep = 0).
- [x] `main.ts`: `expressApp(dataSource)`; `registerDataSource` dentro.
- [x] `server.ts`: compone datasource y migraciones.
- [x] `migrator.ts`: lista explícita; sin glob/`file://`; names estables.
- [x] 002/003 movidas a `core/finance/migrations/` (git mv) + `index.ts`.
- [x] Tests adaptados: `odata.api`, `server`, `error-handling` (mock → factory),
      `odata-batch`, `odata-count`, `odata-count-routing` (fake ds → parámetro),
      `financial-ecosystem`, `financial-expand`, `odata-expand`,
      `supplierinvoice-symmetry`, `odata-write-validation` (real ds), 2 unit de
      metadata, `financial-seed-models` (modelos desde registrations).
- [x] Test de consistencia reescrito (invariantes de registrations) + test
      estructural de pureza (ningún archivo de `src/common` importa `src/core`).
- [x] Backlog actualizado (RF1/RF2/RF3 → Implementado; hallazgos nuevos).

## 6. Gate de la fase

- [x] `pnpm build` (tsc --build, dist limpio) — ✅ 2026-07-31
- [x] `npx tsc --noEmit --project tsconfig.test.json` (type-check de tests) — ✅
      2026-07-31 (tras corregir un TS2352 en `financial-seed-models.consistency`)
- [x] `pnpm test` (suite completa en verde; esperado ≥ 185) — ✅ 188/188
- [x] Grep estructural: 0 imports de `src/core` en `src/common` — ✅
      (comando: `Get-ChildItem src/common -Recurse -Filter *.ts | Select-String
      -Pattern 'from "\.\./\.\./\.\./core|from "\.\./\.\./core|from "\.\./core'`)
- [x] Smoke dev (`pnpm dev`): migraciones reconocidas como aplicadas (0 pendientes
      → "database synced (alter: dev)"), server escucha en :3000, `$metadata` 200 — ✅

## 7. Hallazgos detectados

| ID | Hallazgo | Clasificación | Resolución |
|---|---|---|---|
| RF1 | `common` importa `core` (12 imports en `odata-models.ts` + `odata.service.ts`) | Refactorización | Se resuelve en esta fase (fábricas + composición) |
| RF2 | migraciones finance (002/003) viven en common | Refactorización | Se resuelven en esta fase (mudanza a `core/finance/migrations/`); 001 queda como snapshot histórico (decisión) |
| RF3 | modelos viajan por registro pero la lista central `odata-models.ts` los duplica | Refactorización | Se resuelve en esta fase (bootstrap compone `registrations.map(r => r.model)`) |
| DT5 | los write services acceden al datasource vía registro global en bootstrap (`registerDataSource`) en vez de inyección directa | Deuda Técnica | Aceptada en esta fase (trade-off mínimo-modificación; error claro si no enlazado). Se registra en backlog |
| RF4 | `GET /healthz` no existe (404 en dev; verificado en smoke F1) | Refactorización | F2 (se implementa con el ruteo de seguridad; backlog M2/DA1) |

## 8. Resultado

F1 ejecutada y cerrada el 2026-07-31.

- **Arquitectura:** `common` quedó 100% genérico (0 imports de `core`; gate
  estructural ✅). `odata.service.ts` es una factory
  (`createODataExpressApp(registrations, dataSource)`); el datasource se
  construye en bootstrap desde los modelos de cada registro
  (`server.ts` → `createDataSource(registrations.map(r => r.model))` y
  `expressApp(dataSource)`); los write services lo consumen vía
  `getDataSource()` (DT5 aceptado).
- **Migraciones:** lista explícita `KernelMigration[]` (sin glob ni `file://`).
  El `name` preserva la identidad histórica de `SequelizeMeta` (con extensión
  `.ts`, como registraba el resolver glob): verificado contra la BD dev
  (`001-baseline`, `001-baseline.ts`, `002-rich-financial-model.ts`,
  `003-supplierinvoice-items-payments.ts`) — 0 pendientes al arrancar.
  `001-baseline.ts` queda en common como snapshot congelado; 002/003 viven en
  `src/core/finance/migrations/` con `index.ts` (`financeMigrations`).
- **Boot:** smoke dev OK (migraciones 0 pendientes → sync alter → server en
  :3000 → `$metadata` 200).
- **Gate:** build ✅ · tsc tests ✅ · `pnpm test` 188/188 ✅ · grep 0 imports ✅ ·
  smoke ✅.
- **Hallazgos:** DT5 (aceptada) y RF4 (`/healthz` ausente → F2).
- **Siguiente fase:** F2 (Seguridad: `src/core/auth/`, JWT+usuarios, prod
  estricto, `/healthz`).
