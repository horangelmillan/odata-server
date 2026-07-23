# 01 — Guía de uso: MCP y Skills del entorno

> Reglas prácticas para el uso de las herramientas del entorno OpenCode en este proyecto.
> Complementa (no sustituye) las reglas de `AGENTS.md`. Prioridad: **Proyecto > Global > Modelo**.

---

## 1. Servidores MCP

### 1.1 codebase-memory (local)

Grafo de conocimiento del código (funciones, llamadas, arquitectura, decisiones).

**Úsalo:**
- Antes de proponer arquitectura, modificar módulos, refactorizar o crear funcionalidades.
- Para responder "¿quién llama a X?", "¿qué patrón se usó en Y?", "¿existe ya algo parecido?".
- Para trazar flujos: p.ej. pipeline de `$batch` (`odata.service` → `BatchMiddleware` → write services).

**Reglas:**
- Consultar ANTES de asumir: si el grafo puede responder, no adivinar.
- Tras cambios estructurales grandes, re-indexar el proyecto para mantener el grafo fresco.

### 1.2 context7 (remoto)

Documentación actualizada de librerías.

**Úsalo siempre que intervengan:** `@phrasecode/odata`, Express, Sequelize, PostgreSQL,
Vitest, TypeScript, class-validator, OpenUI5/SAPUI5, o cualquier dependencia nueva.

**Reglas:**
- Flujo: `resolve-library-id` → elegir mejor match (nombre exacto + benchmark alto) → `query-docs` con la pregunta completa.
- Si el usuario menciona versión (p.ej. "OpenUI5 1.150"), pedir el ID versionado.
- No usar para: lógica de negocio, refactors, conceptos generales de programación.

### 1.3 github (remoto, PAT del usuario)

Operaciones sobre el repo remoto `horangelmillan/odata-server`.

**Úsalo para:** crear/listar PRs, revisar checks de CI, gestionar issues, buscar código en GitHub, reviews.

**Reglas:**
- Respetar `docs/07-workflow/GIT_WORKFLOW.md` SIEMPRE: PR es el único mecanismo de integración a `master`.
- Antes de crear un PR, buscar plantilla (`pull_request_template.md` o `.github/PULL_REQUEST_TEMPLATE`).
- Nunca cerrar issues sin `state_reason`. Buscar duplicados antes de crear issues.
- Llamar `get_me` primero si hay duda de permisos/contexto.

### 1.4 playwright (local, `@playwright/mcp`)

Validación visual/funcional del ecosistema (servidor + `ui5-odata-demo`).

**Regla de oro (AGENTS.md §4):** ninguna tarea con UI se declara completada solo porque
compila o pasan tests unitarios.

**Flujo obligatorio:** cargar skill `playwright-testing` → levantar entorno (`pnpm dev` :3000 +
UI5 :8080) → definir asserts → ejecutar con `browser_*` → ante fallo, capturar snapshot +
consola + red antes de tocar código.

---

## 2. Skills

| Skill | Cargar cuando… | Notas del proyecto |
|---|---|---|
| `playwright-testing` | Cualquier validación con Playwright MCP (**obligatoria**) | Contiene prerrequisitos, patrones por tipo de tarea (navegación, listas, filtros, CRUD, mensajes, tráfico OData) y quirks conocidos (`created()` timeout, parches phrasecode) |
| `codebase-memory` | Al usar el MCP codebase-memory | Patrones de consulta del grafo (search, trace, architecture) |
| `context7-mcp` | Al resolver documentación de librerías | Formaliza el flujo resolve→query |
| `vitest` | Escribir/configurar/depurar tests (mocking, coverage, filtros, fixtures) | Referencia oficial Vitest; coherente con `vitest.config.ts` del proyecto (`fileParallelism: false`) |
| `sapui5` | Trabajar en `ui5-odata-demo`: vistas XML, controladores, `manifest.json`, binding OData v4, routing, QUnit/OPA5 | Basada en SAP-docs oficial (v1.148 verificada; proyecto en OpenUI5 1.150 — compatible) |
| `ponytail` | Solución minimalista / "lazy" / YAGNI / revisión de sobrediseño | Modos `lite\|full\|ultra`. **Límites del proyecto:** nunca simplificar validación, seguridad, manejo de errores, ni el flujo Git. Si entra en conflicto con `AGENTS.md`, gana el proyecto |
| `customize-opencode` | Editar configuración del propio opencode (agents, skills, MCP, permisos) | — |

---

## 3. Escenarios típicos (qué herramientas combinar)

| Escenario | Herramientas en orden |
|---|---|
| **Nuevo dominio OData** (p.ej. `asset`) | 1. `docs/02-patrones/16-financial-module.md` 2. codebase-memory: revisar módulo análogo 3. context7 si hay duda de `@phrasecode/odata` 4. Implementar siguiendo `core/<dominio>/` 5. `vitest` skill para tests 6. `pnpm build` + `pnpm test` |
| **Cambio en vistas UI5** | 1. `sapui5` skill 2. context7 (OpenUI5 si aplica) 3. Implementar 4. `playwright-testing` + Playwright MCP (obligatorio) |
| **Investigar bug reportado** | 1. codebase-memory (trazar flujo) 2. Reproducir con tests (`vitest`) 3. Fix de raíz (no síntoma) 4. Si es UI: Playwright MCP para reproducir y verificar |
| **Integración a master** | 1. `docs/07-workflow/GIT_WORKFLOW.md` 2. `pnpm build` + `pnpm test` 3. github MCP: crear PR (buscar plantilla), vigilar check `test` 4. El usuario mergea en GitHub |
| **Duda de sintaxis/config de librería** | context7 directamente (no adivinar) |
| **Revisión de sobrediseño / "hazlo simple"** | `ponytail` skill (respetando sus límites y los del proyecto) |

---

## 4. Antipatrones (prohibidos)

- ❌ Asumir estructura del código pudiendo consultar codebase-memory.
- ❌ Escribir sintaxis de librerías de memoria pudiendo consultar context7.
- ❌ Declarar UI validada sin pasar por Playwright MCP.
- ❌ Crear PR sin leer `GIT_WORKFLOW.md` ni buscar plantilla.
- ❌ Instalar skills/MCP adicionales sin registrar la decisión en el backlog de la iniciativa activa.
