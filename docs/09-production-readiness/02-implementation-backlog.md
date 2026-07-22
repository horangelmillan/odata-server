# Implementation Backlog — Production Readiness

## Propósito

Centraliza los hallazgos detectados durante la evaluación de producción del proyecto
(ciclo `chore/production-readiness`), según las reglas de `AGENTS.md`.

Estados válidos: Pendiente · En evaluación · Aprobado · Implementado · Descartado · Movido a una iniciativa futura.

---

# Riesgos

| ID | Detectado en | Descripción | Impacto | Estado | Resolución |
| -- | ------------ | ----------- | ------- | ------ | ---------- |
| R01 | Evaluación P2 | `sequelize.sync({ alter: true })` se ejecutaba en **todo** arranque, incluido producción: mutación automática del esquema en cada deploy (riesgo de pérdida de datos). | Alto | Implementado | Gate a `env.isDev` en `server.ts`: alter solo en dev; prod usa `sync()` sin alter. |
| R02 | Evaluación P2 | `docker-compose.yml` único, orientado a dev: pgAdmin con credenciales por defecto (`admin/admin`) expuesto en `:5050` y bind-mount del código fuente. | Medio | Implementado | Nuevo `docker-compose.prod.yml` (target `production`, sin pgAdmin, sin bind-mount, `SECRET_KEY` obligatoria, `restart: unless-stopped`). README actualizado. |

---

# Mejoras

| ID | Detectado en | Descripción | Prioridad | Estado | Observaciones |
| -- | ------------ | ----------- | --------- | ------ | ------------- |
| M01 | Evaluación P2 | CI (`ci.yml`) solo ejecutaba `pnpm test`: un error de compilación TypeScript podía llegar a `master`. | Alta | Implementado | Step `pnpm build` añadido antes de `pnpm test`. |
| M02 | Evaluación P1 | `package.json` con `version: 1.0.0`, desalineada de los releases (tags `v2.1.0`). | Baja | Implementado | Bump a `2.1.0`. |
| M03 | Implementación P2 | **`pnpm build` (`tsc`) estaba roto en `master`** (~200 errores): el CI nunca lo ejecutaba y `ts-node`/Vitest transpilan sin type-check. El stage `production` del Dockerfile no podía construirse. | Alta | Implementado | `tsconfig.build.json` (artefacto prod: `src/` + `server.ts`, sin tests ni scripts) + script `build`/`clean` apuntando a él. Reparados los ~28 errores de producción: `@types/bcrypt`; augmentación `TableOptions.timestamps` (`src/common/type/phrasecode-odata.d.ts`) para 11 modelos; base `PartialType(OmitType(...))` en 9 `*UpdateDTO` (TS2416); casts en `datasource.ts` (`as unknown as IDbConfig`) y `odata.service.ts` (`Router`→`Express`); guard `!` en `odata-write.routes.ts`. Build verde; artefacto `dist/` certificado sin tests. |

---

# Refactorizaciones

| ID | Detectado en | Descripción | Motivo | Estado |
| -- | ------------ | ----------- | ------ | ------ |
| RF01 | Evaluación P1 | `kill-port.cmd` trackeado en raíz sin referencias. | Raíz limpia; utilidad dev Windows conservada | Implementado — movido a `scripts/kill-port.cmd` |
| RF02 | Evaluación P1 | `scripts/seed/demo-seed.ts` trackeado sin script npm ni documentación. | Archivo huérfano | Implementado — script `pnpm seed:demo` + documentado en README |

---

# Deuda Técnica

| ID | Detectado en | Descripción | Impacto | Estado |
| -- | ------------ | ----------- | ------- | ------ |
| DT01 | Evaluación P1 | README acumulaba ~15 enlaces rotos tras la reorganización semántica de `docs/` (ciclo 05+). | Documentación poco confiable | Implementado — enlaces reparados; tabla final apunta a `docs/00-indice.md` |
| DT02 | Implementación P2 | Tests (`*.test.ts`) y `scripts/seed/` quedan **fuera del type-check de build** (`tsconfig.build.json` los excluye): ~170 errores de tipos en tests (globals de Vitest, possibly-undefined) y 2 en `financial-seed.ts` siguen existiendo, enmascarados porque Vitest/esbuild y `ts-node transpileOnly` no type-chequean. | Calidad de tipos incompleta fuera de prod | Movido a una iniciativa futura — requiere `tsconfig` de tests con tipos de Vitest y corrección de los errores uno a uno |

---

# Investigaciones Futuras

| ID | Detectado en | Tema | Motivo | Estado |
| -- | ------------ | ---- | ------ | ------ |
| IF01 | Evaluación P2 | Sistema de migraciones de esquema (Umzug / sequelize-cli) | El gate de `sync` elimina el riesgo inmediato, pero prod carece de versionado de esquema; los cambios de modelo futuros requerirán migraciones controladas | Movido a una iniciativa futura |

---

# Decisiones Arquitectónicas Pendientes

| ID | Tema | Motivo | Estado |
| -- | ---- | ------ | ------ |
| — | — | Sin elementos pendientes | — |

---

# Registro de Resoluciones

| Fecha | ID | Acción realizada |
| ----- | -- | ---------------- |
| 2026-07-21 | R01 | Gate `sync({alter:true})` → solo `env.isDev` en `server.ts`. |
| 2026-07-21 | R02 | `docker-compose.prod.yml` creado; README documenta ambos entornos. |
| 2026-07-21 | M01 | CI: step `pnpm build` añadido. |
| 2026-07-21 | M02 | `package.json` → `version: 2.1.0`. |
| 2026-07-21 | M03 | Build `tsc` reparado (tsconfig.build.json + fixes de tipos prod). Build verde; tests 166/166 sin regresión. |
| 2026-07-21 | DT02 | Tests/scripts fuera del type-check de build → movido a iniciativa futura. |
| 2026-07-21 | RF01 | `kill-port.cmd` → `scripts/kill-port.cmd`. |
| 2026-07-21 | RF02 | Script `seed:demo` en `package.json` + README. |
| 2026-07-21 | DT01 | README: enlaces rotos reparados; referencia única a `docs/00-indice.md`. |
| 2026-07-21 | — | P0: borrados 8 logs (~738 KB), `.playwright-mcp/` (0.4 MB), `dist/`, `.tsbuildinfo` (ignorados por git, sin commit). |

---

# Cierre de la iniciativa

Todos los elementos quedan en estado **Implementado** salvo **IF01** (migraciones de esquema)
y **DT02** (type-check de tests/scripts), que se mueven a una iniciativa futura.
No quedan elementos en "Pendiente" ni "En evaluación".
