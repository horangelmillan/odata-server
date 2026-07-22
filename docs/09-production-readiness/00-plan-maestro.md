# 00 — Plan Maestro: Production Readiness

> **Ciclo:** `chore/production-readiness` (rama dedicada; merge a `master` vía PR).
> **Inicio:** 2026-07-21
> **Estado global:** ✅ Completado — P0–P3 ejecutadas.
> **Depende de:** Ciclos 04–08 completados y mergeados (tags `v1.1.0`, `v2.0.0-odata-domain`, `v2.1.0-financial-eco`).

---

## 0. Resumen ejecutivo

Tras el cierre del ciclo 08 el proyecto quedó en meseta funcional, pero con **desorden local**
(logs, artefactos Playwright, builds), **archivos huérfanos trackeados** y **brechas de
producción** (mutación automática de esquema, compose solo-dev, CI sin gate de compilación,
documentación con enlaces rotos).

Esta iniciativa organiza el proyecto para quedar listo para producción con cambios mínimos:
limpieza, reubicación de utilidades, hardening del arranque y del despliegue, y alineación
documental. **No añade funcionalidad nueva.**

---

## 1. Decisiones de arquitectura

| # | Decisión | Opción elegida | Alternativa descartada |
|---|---|---|---|
| D1 | `scripts/seed/demo-seed.ts` huérfano | **Integrar como script `pnpm seed:demo`** documentado en README | Eliminarlo (conserva utilidad para testing UI5) |
| D2 | `kill-port.cmd` huérfano en raíz | **Mover a `scripts/kill-port.cmd`** | Eliminarlo (es útil en dev Windows) |
| D3 | `sync({ alter: true })` en todo arranque | **Gate a `env.isDev`**: alter solo en dev; en prod `sync()` sin alter (mínimo, ~4 líneas) | Introducir migraciones formales ahora (mayor alcance → backlog) |
| D4 | Dominio demo (product/category) | **Mantener en producción** como sandbox documentado | Gatear por env flag (mayor alcance: odata.service, tests, metadata) |
| D5 | Despliegue producción | **`docker-compose.prod.yml`** separado (target `production`, sin pgAdmin, sin bind-mount, `SECRET_KEY` obligatoria) | Parametrizar el compose dev con profiles (más frágil de leer) |

---

## 2. Fases ejecutadas

| Fase | Descripción | Resultado |
|---|---|---|
| **P0** | Limpieza local de archivos ignorados: 8 `*.log` (~738 KB), `.playwright-mcp/` (0.4 MB), `dist/`, `.tsbuildinfo` | ✅ Sin commit (git ya los ignoraba) |
| **P1** | Higiene del repo: `git mv kill-port.cmd scripts/`; `package.json` → `version: 2.1.0` + script `seed:demo`; README: enlace roto `docs/14-docker-guide.md` eliminado, 3 referencias `docs/14` → `docs/04-sapui5-compat/…`, tabla de docs rotas → puntero a `docs/00-indice.md`, script `seed:demo` documentado, sección Docker con compose prod | ✅ |
| **P2** | Hardening: `server.ts` gatea `sync({alter:true})` a dev; `docker-compose.prod.yml` nuevo (sin pgAdmin, sin bind-mount, `SECRET_KEY` requerida); CI añade step `pnpm build`. **Hallazgo crítico:** el build `tsc` estaba roto en `master` (preexistente; CI nunca lo ejecutaba) → reparado: `tsconfig.build.json` (artefacto prod sin tests/scripts), `@types/bcrypt`, augmentación `TableOptions.timestamps`, `PartialType` en 9 `*UpdateDTO`, casts en `datasource`/`odata.service`/`odata-write.routes` | ✅ |
| **P3** | Cierre: este documento + `02-implementation-backlog.md` + `docs/00-indice.md`; validación `pnpm build` + `pnpm test`; PR a `master` | ✅ |

---

## 3. Condiciones de aceptación globales

- [x] Raíz del proyecto libre de logs y artefactos.
- [x] Ningún archivo trackeado huérfano (sin referencias).
- [x] `sync({ alter: true })` no se ejecuta en producción.
- [x] Existe vía de despliegue prod (`docker-compose.prod.yml`) sin pgAdmin ni bind-mount.
- [x] CI ejecuta `pnpm build` además de `pnpm test`.
- [x] `pnpm build` y `pnpm test` en verde (sin regresión).
- [x] README sin enlaces rotos; `version` alineada con el último tag.

---

## 4. Fuera de alcance (documentado en el backlog)

- Migraciones de esquema formales (Umzug / sequelize-cli) → **Investigación Futura**.
- Higiene del workspace externo al repo (`.git` contenedor vacío, `SmartInventory-backend-main/`,
  `worktree-v1.1.0/` — baseline de benchmark documentado, se conserva).
