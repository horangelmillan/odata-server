# 00 — Plan Maestro: Tooling MCP & Skills

> **Ciclo:** `docs/tooling-mcp-skills` (rama dedicada; merge a `master` vía PR).
> **Inicio:** 2026-07-21
> **Estado global:** ✅ Completado.
> **Depende de:** Ciclo 09 (production readiness). Entorno OpenCode con 4 MCP registrados y 5 skills instaladas.

---

## 0. Resumen ejecutivo

El entorno OpenCode quedó configurado con 4 servidores MCP (`github`, `context7`,
`codebase-memory`, `playwright`) y un conjunto de skills, pero **sin reglas escritas** que
definan cuándo y cómo usarlas en este proyecto. Esta iniciativa:

1. Documenta las **reglas de uso** de cada MCP y skill (guía práctica por escenarios).
2. Registra la **investigación de skills de terceros** (skills.sh) y las decisiones de
   instalación/rechazo, en pro del proyecto.
3. Alinea el `AGENTS.md` del proyecto y crea el `AGENTS.md` global del entorno
   (`~/.config/opencode/AGENTS.md`), que el proyecto referenciaba pero no existía.

No hay cambios de código de aplicación.

---

## 1. Decisiones

| # | Decisión | Opción elegida | Alternativa descartada |
|---|---|---|---|
| D1 | Skill `vitest` (antfu/skills, 28.6K installs, generada desde vitest-dev) | **Instalada** — referencia del framework de tests del proyecto | Skill propia (reinventar; sin valor añadido sobre la oficial) |
| D2 | Skill `sapui5` (secondsky/sap-skills, basada en SAP-docs oficial, v2.4.0) | **Instalada** — dominio exacto del frontend `ui5-odata-demo` (vistas XML, manifest, binding OData v4, QUnit/OPA5) | Sin skill UI5 (el ciclo G demostró que el trabajo UI5 es recurrente) |
| D3 | Skills Playwright de terceros (microsoft/playwright-cli, awesome-copilot, best-practices) | **Rechazadas** — la skill propia `playwright-testing` es específica del proyecto (MCP, no CLI; flujos Demo↔Finance, quirks documentados) | Instalar genéricas (solape y conflicto con la propia) |
| D4 | Skills context7 / codebase-memory de terceros | **Rechazadas** — las locales ya cubren el flujo (resolve→query; patrones del grafo) | Duplicar skills equivalentes |
| D5 | Skills postgres (supabase/neon/prisma) y code-review genéricas | **Rechazadas** — específicas de otras plataformas; el proyecto ya tiene flujo PR propio (GIT_WORKFLOW) | Adoptar genéricas que colisionan con reglas del proyecto |
| D6 | Reglas de herramientas | **Doble nivel**: `AGENTS.md` global (entorno) + secciones en `AGENTS.md` del proyecto + guía `01-guia-de-uso.md` con escenarios | Solo documentación de ciclo (no quedaría como regla viva) |

---

## 2. Entregables

| Entregable | Ubicación | Estado |
|---|---|---|
| Reglas globales de MCP/skills | `~/.config/opencode/AGENTS.md` (fuera del repo) | ✅ |
| Guía de uso por escenarios | `docs/10-herramientas-mcp-skills/01-guia-de-uso.md` | ✅ |
| Backlog de la iniciativa | `docs/10-herramientas-mcp-skills/02-implementation-backlog.md` | ✅ |
| `AGENTS.md` del proyecto actualizado (§2–§6) | raíz del repo | ✅ |
| Índice de docs | `docs/00-indice.md` §10 | ✅ |
| Skills instaladas | `vitest`, `sapui5` en `~/.agents/skills/` | ✅ |

---

## 3. Condiciones de aceptación

- [x] Cada MCP instalado tiene regla de uso documentada (cuándo/cómo/límites).
- [x] Cada skill instalada tiene criterio de activación documentado.
- [x] La investigación de skills de red queda registrada con decisión y motivo.
- [x] `AGENTS.md` del proyecto coherente con el entorno real (skill `playwright-testing` existe; MCP disponibles).
- [x] Sin elementos "Pendiente" en el backlog al cierre.
